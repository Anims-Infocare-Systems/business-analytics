import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    Inbox,
    Check,
    Building2,
    RotateCcw,
    Truck,
    Layers,
    ShieldCheck,
    FileCheck,
    Copy,
    ChevronRight,
    ChevronLeft,
    Calendar,
    Award,
    Sparkles,
    Cpu,
    Factory,
    FileSpreadsheet,
    Compass,
    Eye,
    Flame,
    Beaker,
    CheckSquare,
    CheckCheck
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);
Chart.defaults.font.family = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
        case "Part No": return { width: "140px", whiteSpace: "nowrap" };
        case "Description": return { minWidth: "180px", maxWidth: "280px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Part No – Description": return { minWidth: "220px", maxWidth: "320px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Process": return { width: "110px" };
        case "Insp Qty":
        case "OK Qty":
        case "Mat Rej Qty":
        case "Mac Rej Qty":
        case "Rej %":
        case "Rework Qty": return { width: "80px", textAlign: "right" };
        case "Insp By": return { width: "120px" };
        default: return {};
    }
};

const getRejColStyle = (h) => {
    switch (h) {
        case "Insp No": return { width: "110px" };
        case "Insp Type": return { width: "150px" };
        case "Part No": return { width: "140px", whiteSpace: "nowrap" };
        case "Description": return { minWidth: "180px", maxWidth: "280px", whiteSpace: "normal", wordBreak: "break-word" };
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
        case "#": return { width: "45px", textAlign: "center" };
        case "Inspno": return { width: "100px" };
        case "Insp Date": return { width: "95px" };
        case "Machine No": return { width: "95px" };
        case "Shift": return { width: "70px" };
        case "Part No": return { width: "130px", whiteSpace: "nowrap" };
        case "Description": return { minWidth: "160px", maxWidth: "250px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Partno-Description": return { minWidth: "180px", maxWidth: "260px", whiteSpace: "normal", wordBreak: "break-word" };
        case "Process": return { width: "100px" };
        case "Operator Name / Vendor Name":
        case "Operator Name": return { width: "150px" };
        case "Prod Qty":
        case "Ok Qty":
        case "Mat Rej":
        case "Mac Rej":
        case "Rw Qty": return { width: "75px", textAlign: "right" };
        case "Inspected By": return { width: "110px" };
        case "Routecard Details": return { width: "130px" };
        default: return {};
    }
};

const getSuppColStyle = (h) => {
    switch (h) {
        case "#": return { width: "45px", textAlign: "center", whiteSpace: "nowrap" };
        case "Supplier Name": return { minWidth: "180px", maxWidth: "280px", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.35" };
        case "Grn no": return { width: "100px", whiteSpace: "nowrap" };
        case "Grn Date": return { width: "100px", whiteSpace: "nowrap" };
        case "Item Details": return { minWidth: "260px", maxWidth: "450px", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.35" };
        case "GRN Qty":
        case "Ok Qty":
        case "Mat Rej":
        case "Mac Rej": return { width: "85px", textAlign: "right", whiteSpace: "nowrap" };
        case "UOM": return { width: "60px", textAlign: "center", whiteSpace: "nowrap" };
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

function MultiSelectFilterDropdown({ title, options, selectedValues, onChange, accentColor = "#8b5cf6" }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const currentSelected = selectedValues === null ? options : selectedValues;
    const isFiltered = selectedValues !== null && selectedValues.length < options.length;

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase().trim();
        return options.filter(opt => String(opt).toLowerCase().includes(q));
    }, [options, search]);

    const handleToggleOption = (opt) => {
        let updated;
        if (currentSelected.includes(opt)) {
            updated = currentSelected.filter(item => item !== opt);
        } else {
            updated = [...currentSelected, opt];
        }
        if (updated.length === options.length) {
            onChange(null);
        } else {
            onChange(updated);
        }
    };

    const handleSelectAll = () => {
        onChange(null);
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const isRed = accentColor === "#ef4444";
    const activeBg = isRed ? "rgba(239, 68, 68, 0.1)" : "rgba(139, 92, 246, 0.1)";
    const activeColor = isRed ? "#dc2626" : "#7c3aed";
    const checkedItemBg = isRed ? "rgba(239, 68, 68, 0.06)" : "rgba(139, 92, 246, 0.05)";

    return (
        <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: isFiltered ? `1px solid ${accentColor}` : "1px solid #cbd5e1",
                    background: isFiltered ? activeBg : "#ffffff",
                    color: isFiltered ? activeColor : "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}
            >
                <span>{title}</span>
                {isFiltered && (
                    <span style={{
                        background: accentColor,
                        color: "#ffffff",
                        borderRadius: "10px",
                        padding: "1px 5px",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        lineHeight: 1
                    }}>
                        {currentSelected.length}
                    </span>
                )}
                <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", color: "currentColor" }} />
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        right: 0,
                        zIndex: 300,
                        minWidth: "300px",
                        maxWidth: "420px",
                        width: "max-content",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
                        padding: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                    }}
                >
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <Search size={12} style={{ position: "absolute", left: "8px", color: "#94a3b8" }} />
                        <input
                            type="text"
                            placeholder={`Search ${title}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "5px 22px 5px 26px",
                                fontSize: "0.74rem",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                outline: "none",
                                background: "#ffffff",
                                color: "#0f172a",
                                colorScheme: "light"
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                style={{
                                    position: "absolute",
                                    right: "6px",
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: 0,
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px", fontSize: "0.68rem" }}>
                        <span style={{ color: "#64748b", fontWeight: 500 }}>
                            {currentSelected.length} of {options.length} selected
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                style={{ background: "none", border: "none", color: accentColor, fontWeight: 600, cursor: "pointer", padding: 0 }}
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 600, cursor: "pointer", padding: 0 }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div style={{ height: "1px", background: "#f1f5f9", margin: "2px 0" }} />

                    <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const checked = currentSelected.includes(opt);
                                return (
                                    <label
                                        key={opt}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "8px",
                                            padding: "5px 6px",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "0.72rem",
                                            color: "#334155",
                                            userSelect: "none",
                                            transition: "background 0.1s ease",
                                            background: checked ? checkedItemBg : "transparent",
                                            lineHeight: "1.35",
                                            wordBreak: "break-word",
                                            whiteSpace: "normal"
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggleOption(opt)}
                                            style={{
                                                accentColor: accentColor,
                                                cursor: "pointer",
                                                width: "13px",
                                                height: "13px",
                                                marginTop: "2px",
                                                flexShrink: 0
                                            }}
                                        />
                                        <span style={{
                                            wordBreak: "break-word",
                                            whiteSpace: "normal",
                                            fontWeight: checked ? 600 : 400,
                                            color: "#0f172a",
                                            flex: 1
                                        }} title={opt}>
                                            {opt}
                                        </span>
                                    </label>
                                );
                            })
                        ) : (
                            <div style={{ padding: "8px", fontSize: "0.7rem", color: "#94a3b8", textAlign: "center" }}>
                                No matching values
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUALITY TIMELINE DATA & COMPONENT
//  Pipeline sequence in exact order:
//  Invoice No ---> DC ---> Final Insp --->
//  Production (Inhouse & Job Order) with Quality Insp --->
//  GRN Tracking ---> Supplier Details
// ─────────────────────────────────────────────────────────────────────────────

const QUALITY_TIMELINE_DATA = [
    {
        id: "INV-2026-0842",
        customer: "Roots Multiclean Ltd",
        partNo: "RMC-CYL-4050",
        partDescription: "Hydraulic Cylinder Tube Ø40 x 50 x 691 mm",
        batchLot: "LOT-RMC-2026-42",
        totalValue: "₹ 6,10,650",
        billedQty: "150 Nos",
        auditRating: "99.4%",
        qualityStatus: "Passed & QA Stamped",
        dispatchStatus: "Dispatched & Delivered",
        parts: [
            {
                partNo: "RMC-CYL-4050",
                partDescription: "Hydraulic Cylinder Tube Ø40 x 50 x 691 mm",
                batchLot: "LOT-RMC-2026-42",
                billedQty: "100 Nos",
                partValue: "₹ 4,20,000",
                auditRating: "99.4%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered",
                stages: [
                    {
                        step: 1,
                        key: "invoice",
                        title: "Invoice No",
                        subtitle: "Billing & Commercial Release",
                        iconName: "FileSpreadsheet",
                        badge: "INV-2026-0842",
                        badgeColor: "#3b82f6",
                        accentColor: "#2563eb",
                        metrics: [
                            { label: "Invoice Number", value: "INV-2026-0842", highlight: true },
                            { label: "Invoice Date", value: "08-Mar-2026" },
                            { label: "Billed Quantity", value: "150 Nos", highlight: true },
                            { label: "Unit Rate", value: "₹ 3,450.00 / No" },
                            { label: "Taxable Subtotal", value: "₹ 5,17,500.00" },
                            { label: "GST (CGST+SGST 18%)", value: "₹ 93,150.00" },
                            { label: "Total Net Payable", value: "₹ 6,10,650.00", highlight: true },
                            { label: "Customer PO Ref", value: "PO-RMC-2026-7781" },
                            { label: "PO Order Date", value: "12-Feb-2026" },
                            { label: "IRN / QR Code", value: "IRN-8841-A902-9982" }
                        ],
                        // notes: "Commercial invoice released with automated digital sign-off. Cross-referenced against Customer PO #PO-RMC-2026-7781 line item 01."
                    },
                    {
                        step: 2,
                        key: "dc",
                        title: "DC (Delivery Challan)",
                        subtitle: "Outward Logistics & Movement",
                        iconName: "Truck",
                        badge: "DC/2026/03/0184",
                        badgeColor: "#8b5cf6",
                        accentColor: "#7c3aed",
                        metrics: [
                            { label: "Delivery Challan No", value: "DC/2026/03/0184", highlight: true },
                            { label: "Challan Date & Time", value: "08-Mar-2026 (04:30 PM)" },
                            { label: "Dispatched Quantity", value: "150 Nos (5 Sealed Crates)", highlight: true },
                            { label: "Vehicle Number", value: "TN-38-BZ-4921", highlight: true },
                            { label: "Transporter Name", value: "VRL Logistics Express Ltd" },
                            { label: "E-Way Bill Number", value: "3819 4029 8812 (Valid 10-Mar)" },
                            { label: "GRN/PO Det", value: "PO-RMC-2026-7781 • GRN-2026-02-0492", highlight: true }
                        ],
                        // notes: "Security gate seal #GT-8840 applied. Goods inspected for moisture protection packaging and transit cushioning before vehicle exit."
                    },
                    {
                        step: 3,
                        key: "finalInsp",
                        title: "Final Insp",
                        subtitle: "100% Finished Goods Inspection & Hydro Test",
                        iconName: "CheckCheck",
                        badge: "FIR-2026-03-098",
                        badgeColor: "#10b981",
                        accentColor: "#059669",
                        metrics: [
                            { label: "Final Insp Report No", value: "FIR-2026-03-098", highlight: true },
                            { label: "Inspection Date", value: "07-Mar-2026" },
                            { label: "Tot Qty", value: "150 Nos", highlight: true },
                            { label: "Inspected Qty", value: "150 Nos", highlight: true },
                            { label: "Rej Qty", value: "0 Nos" },
                            { label: "Rw Qty", value: "0 Nos" },
                            { label: "Routecard Det", value: "RC-2026-03-8842", highlight: true },
                            { label: "Insp By", value: "K. Rajesh" }
                        ],
                        inspectionRecords: [
                            { op: "OP 10", routeCard: "RC-2026-03-8842", process: "CNC Facing, Chamfering & Centering", machine: "Doosan Lynx 220", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "S. Selvam", verdict: "PASS" },
                            { op: "OP 20", routeCard: "RC-2026-03-8842", process: "Precision Deep-Hole Skiving & Burnishing", machine: "BTA Deep-Hole 02", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "M. Anand", verdict: "PASS" },
                            { op: "OP 30", routeCard: "RC-2026-03-8842", process: "Subcontract Induction Hardening & Chrome", machine: "Apex Surface Tech", shift: "General", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "R. Murugesh", verdict: "PASS" },
                            { op: "OP 50", routeCard: "RC-2026-03-8842", process: "CNC Port Threading & Flange TIG Welding", machine: "Mori Seiki NLX", shift: "Shift 2", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "P. Vignesh", verdict: "PASS" },
                            { op: "OP 60", routeCard: "RC-2026-03-8842", process: "Multi-Stage Ultrasonic Clean & Degrease", machine: "SonicWash SW-400", shift: "Shift 2", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "V. Raman", verdict: "PASS" },
                            { op: "Final QA", routeCard: "RC-2026-03-8842", process: "100% CMM Metrology & 350 Bar Hydro Test", machine: "Zeiss CMM / Test Bench", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "K. Rajesh", verdict: "PASS" }
                        ],
                        // notes: "All 150 tubes successfully tested for dimensional compliance on CMM Zeiss Contura and leak-free pressure testing at 350 Bar."
                    },
                    {
                        step: 4,
                        key: "production",
                        title: "Production (Inhouse & Job Order) with Quality Insp",
                        subtitle: "6 Stage Workflow (Inhouse CNC + Subcontract Heat Treat)",
                        iconName: "Factory",
                        badge: "RC-2026-03-8842",
                        badgeColor: "#f59e0b",
                        accentColor: "#d97706",
                        routeCardNo: "RC-2026-03-8842",
                        metrics: [
                            { label: "Route Card Number", value: "RC-2026-03-8842", highlight: true },
                            { label: "Routing Operations", value: "6 Ops (4 Inhouse CNC + 2 Subcontract)", highlight: true },
                            { label: "Primary Subcontractor", value: "Apex Heat Treat & Surface Coating Tech" },
                            { label: "Job Order Challans", value: "Out: SC-DC-2026-0419 • In: APX-IN-8921" }
                        ],
                        inhouseOps: [
                            { op: "OP 10", process: "CNC Facing, Chamfering & Centering", machine: "Doosan Lynx 220", operator: "S. Selvam", ipqa: "IPQA-2601", status: "Approved", keyMetric: "Face Runout ≤ 0.015 mm" },
                            { op: "OP 20", process: "Precision Deep-Hole Skiving & Burnishing", machine: "BTA Deep-Hole 02", operator: "M. Anand", ipqa: "IPQA-2602", status: "Approved", keyMetric: "Internal Bore Ra 0.16 µm" },
                            { op: "OP 50", process: "CNC Port Threading & Flange TIG Welding", machine: "Mori Seiki NLX", operator: "P. Vignesh", ipqa: "IPQA-2605", status: "Approved", keyMetric: "Thread Gauge 6H PASS" },
                            { op: "OP 60", process: "Multi-Stage Ultrasonic Clean & Degrease", machine: "SonicWash SW-400", operator: "V. Raman", ipqa: "IPQA-2606", status: "Approved", keyMetric: "Gravimetric Millipore 1.2 mg" }
                        ],
                        jobOrder: {
                            vendorName: "Apex Heat Treat & Surface Coating Tech",
                            subcontractDC: "SC-DC-2026-0419",
                            inwardChallan: "APX-IN-8921",
                            items: [
                                { op: "OP 30 (Job Order)", process: "Induction Hardening & Quenching", po: "PO-JO-2026-319", cert: "HT-CERT-9042", specs: "Hardness: 58-62 HRC (Actual: 59.5 HRC) | Case Depth: 1.35 mm (Spec: 1.2-1.5 mm)", status: "VERIFIED" },
                                { op: "OP 40 (Job Order)", process: "Hard Chrome Plating & Superfinishing", po: "PO-JO-2026-320", cert: "CR-CERT-4109", specs: "Chrome Thickness: 28.5 µm (Spec: 25-32 µm) | Salt Spray NSS 240 Hrs: PASS", status: "VERIFIED" }
                            ]
                        },
                        notes: "In-process quality inspectors performed first-piece and hourly frequency checks. Subcontract job-order certifications cross-validated before final assembly."
                    },
                    {
                        step: 5,
                        key: "grn",
                        title: "GRN Tracking",
                        subtitle: "Inward Raw Material Receipt & Store Verification",
                        iconName: "Package",
                        badge: "GRN-2026-02-0492",
                        badgeColor: "#06b6d4",
                        accentColor: "#0891b2",
                        metrics: [
                            { label: "GRN Number", value: "GRN-2026-02-0492", highlight: true },
                            { label: "GRN Inward Date", value: "18-Feb-2026", highlight: true },
                            { label: "Material Qty", value: "4,850", highlight: true },
                            { label: "Uom", value: "Kg", highlight: true }
                        ],
                        grnRecords: [
                            {
                                grnNo: "GRN-2026-02-0492",
                                grnDate: "18-Feb-2026",
                                materialQty: "4,850",
                                uom: "Kg",
                                okQty: "4,850",
                                rejQty: "0",
                                inspBy: "R. Vignesh",
                                verdict: "PASS"
                            }
                        ],
                        notes: "Raw material inward received and verified against purchase order with 100% heat lot identity and visual store inspection."
                    },
                    {
                        step: 6,
                        key: "supplier",
                        title: "Supplier Details",
                        subtitle: "Tier-1 Mill Approval & Vendor Audit Performance",
                        iconName: "Building2",
                        badge: "VEND-JND-0104",
                        badgeColor: "#ec4899",
                        accentColor: "#db2777",
                        metrics: [
                            { label: "Supplier / Mill Name", value: "Jindal Steel & Seamless Tubes Ltd", highlight: true },
                            { label: "Raw Material PO Ref", value: "PO-RM-2026-0812", highlight: true },
                            { label: "Po Date", value: "05-Feb-2026", highlight: true },
                            { label: "Qty", value: "4,850", highlight: true },
                            { label: "Uom", value: "Kg", highlight: true }
                        ],
                        supplierRecords: [
                            {
                                supplierName: "Jindal Steel & Seamless Tubes Ltd",
                                poRef: "PO-RM-2026-0812",
                                poDate: "05-Feb-2026",
                                qty: "4,850",
                                uom: "Kg",
                                status: "APPROVED TIER-1"
                            }
                        ],
                        vendorRating: "98.5% Grade A",
                        rejectionPpm: "0 PPM (Zero Defect)",
                        traceability: "100% Heat Lot Matched",
                        notes: "Preferred mill under long-term quality supply agreement with complete traceability back to steel billet casting heat."
                    }
                ]
            },
            {
                partNo: "RMC-ROD-2540",
                partDescription: "Hard Chrome Piston Rod Ø25 x 400 mm",
                batchLot: "LOT-RMC-2026-43",
                billedQty: "50 Nos",
                partValue: "₹ 1,90,650",
                auditRating: "99.2%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered",
                stages: [
                    {
                        step: 1,
                        key: "invoice",
                        title: "Invoice No",
                        subtitle: "Billing & Commercial Release",
                        iconName: "FileSpreadsheet",
                        badge: "INV-2026-0842",
                        badgeColor: "#3b82f6",
                        accentColor: "#2563eb",
                        metrics: [
                            { label: "Invoice Number", value: "INV-2026-0842", highlight: true },
                            { label: "Invoice Date", value: "08-Mar-2026" },
                            { label: "Billed Quantity", value: "50 Nos", highlight: true },
                            { label: "Unit Rate", value: "₹ 3,813.00 / No" },
                            { label: "Taxable Subtotal", value: "₹ 1,90,650.00" },
                            { label: "GST (CGST+SGST 18%)", value: "₹ 34,317.00" },
                            { label: "Total Net Payable", value: "₹ 2,24,967.00", highlight: true },
                            { label: "Customer PO Ref", value: "PO-RMC-2026-7781 Item 02" },
                            { label: "PO Order Date", value: "12-Feb-2026" },
                            { label: "IRN / QR Code", value: "IRN-8841-A902-9982" }
                        ]
                    },
                    {
                        step: 2,
                        key: "dc",
                        title: "DC (Delivery Challan)",
                        subtitle: "Outward Logistics & Movement",
                        iconName: "Truck",
                        badge: "DC/2026/03/0184",
                        badgeColor: "#8b5cf6",
                        accentColor: "#7c3aed",
                        metrics: [
                            { label: "Delivery Challan No", value: "DC/2026/03/0184", highlight: true },
                            { label: "Challan Date & Time", value: "08-Mar-2026 (04:30 PM)" },
                            { label: "Dispatched Quantity", value: "50 Nos (2 Wooden Cases)", highlight: true },
                            { label: "Vehicle Number", value: "TN-38-BZ-4921", highlight: true },
                            { label: "Transporter Name", value: "VRL Logistics Express Ltd" },
                            { label: "E-Way Bill Number", value: "3819 4029 8812 (Valid 10-Mar)" },
                            { label: "GRN/PO Det", value: "PO-RMC-2026-7781 • GRN-2026-02-0498", highlight: true }
                        ]
                    },
                    {
                        step: 3,
                        key: "finalInsp",
                        title: "Final Insp",
                        subtitle: "100% Finished Goods Inspection & Straightness QA",
                        iconName: "CheckCheck",
                        badge: "FIR-2026-03-099",
                        badgeColor: "#10b981",
                        accentColor: "#059669",
                        metrics: [
                            { label: "Final Insp Report No", value: "FIR-2026-03-099", highlight: true },
                            { label: "Inspection Date", value: "07-Mar-2026" },
                            { label: "Tot Qty", value: "50 Nos", highlight: true },
                            { label: "Inspected Qty", value: "50 Nos", highlight: true },
                            { label: "Rej Qty", value: "0 Nos" },
                            { label: "Rw Qty", value: "0 Nos" },
                            { label: "Routecard Det", value: "RC-2026-03-8843", highlight: true },
                            { label: "Insp By", value: "S. Selvam" }
                        ],
                        inspectionRecords: [
                            { op: "OP 10", routeCard: "RC-2026-03-8843", process: "CNC Peeling, Facing & Chamfering", machine: "Doosan Lynx 220", shift: "Shift 1", totQty: "50", inspQty: "50", okQty: "50", rejQty: "0", rwQty: "0", inspectedBy: "S. Selvam", verdict: "PASS" },
                            { op: "OP 20", routeCard: "RC-2026-03-8843", process: "Precision Centerless Cylindrical Grinding", machine: "Cincinnati OM-2", shift: "Shift 1", totQty: "50", inspQty: "50", okQty: "50", rejQty: "0", rwQty: "0", inspectedBy: "M. Anand", verdict: "PASS" },
                            { op: "OP 30", routeCard: "RC-2026-03-8843", process: "Subcontract Hard Chrome Plating 25 µm", machine: "Apex Surface Tech", shift: "General", totQty: "50", inspQty: "50", okQty: "50", rejQty: "0", rwQty: "0", inspectedBy: "R. Murugesh", verdict: "PASS" },
                            { op: "OP 40", routeCard: "RC-2026-03-8843", process: "Superfinishing & Micro-polishing Ra 0.12", machine: "Nagel Superfinish", shift: "Shift 2", totQty: "50", inspQty: "50", okQty: "50", rejQty: "0", rwQty: "0", inspectedBy: "P. Vignesh", verdict: "PASS" },
                            { op: "Final QA", routeCard: "RC-2026-03-8843", process: "100% Diameter, Straightness & Plating QA", machine: "Mitutoyo Linear Height", shift: "Shift 1", totQty: "50", inspQty: "50", okQty: "50", rejQty: "0", rwQty: "0", inspectedBy: "S. Selvam", verdict: "PASS" }
                        ]
                    },
                    {
                        step: 4,
                        key: "production",
                        title: "Production (Inhouse & Job Order) with Quality Insp",
                        subtitle: "Centerless Grinding & Subcontract Hard Chrome Plating",
                        iconName: "Factory",
                        badge: "RC-2026-03-8843",
                        badgeColor: "#f59e0b",
                        accentColor: "#d97706",
                        routeCardNo: "RC-2026-03-8843",
                        metrics: [
                            { label: "Route Card Number", value: "RC-2026-03-8843", highlight: true },
                            { label: "Routing Operations", value: "4 Ops (2 Inhouse CNC + 2 Subcontract)", highlight: true },
                            { label: "Primary Subcontractor", value: "Apex Heat Treat & Surface Coating Tech" },
                            { label: "Job Order Challans", value: "Out: SC-DC-2026-0422 • In: APX-IN-8940" }
                        ],
                        inhouseOps: [
                            { op: "OP 10", process: "CNC Bar Peeling & Facing", machine: "Haas ST-30", operator: "S. Selvam", ipqa: "IPQA-2611", status: "Approved", keyMetric: "Face Runout ≤ 0.010 mm" },
                            { op: "OP 20", process: "Precision Centerless Grinding", machine: "Cincinnati OM-2", operator: "M. Anand", ipqa: "IPQA-2614", status: "Approved", keyMetric: "OD Ø25 -0.005/-0.012 mm" }
                        ],
                        jobOrder: {
                            vendorName: "Apex Heat Treat & Surface Coating Tech",
                            subcontractDC: "SC-DC-2026-0422",
                            inwardChallan: "APX-IN-8940",
                            items: [
                                { op: "OP 30 (Job Order)", process: "Induction Hardening 58-62 HRC", po: "PO-JO-2026-324", cert: "HT-CERT-9080", specs: "Surface Hardness: 60.5 HRC | Case Depth: 1.40 mm", status: "VERIFIED" },
                                { op: "OP 40 (Job Order)", process: "Hard Chrome Plating 25 µm & Micro-cracking", po: "PO-JO-2026-325", cert: "CR-CERT-4122", specs: "Plating: 27.5 µm | NSS 240 Hrs: PASS", status: "VERIFIED" }
                            ]
                        },
                        notes: "In-process quality inspectors checked chrome plating adhesion and salt spray corrosion resistance."
                    },
                    {
                        step: 5,
                        key: "grn",
                        title: "GRN Tracking",
                        subtitle: "Inward Raw Material Receipt & Store Verification",
                        iconName: "Package",
                        badge: "GRN-2026-02-0498",
                        badgeColor: "#06b6d4",
                        accentColor: "#0891b2",
                        metrics: [
                            { label: "GRN Number", value: "GRN-2026-02-0498", highlight: true },
                            { label: "GRN Inward Date", value: "20-Feb-2026", highlight: true },
                            { label: "Material Qty", value: "1,850", highlight: true },
                            { label: "Uom", value: "Kg", highlight: true }
                        ],
                        grnRecords: [
                            {
                                grnNo: "GRN-2026-02-0498",
                                grnDate: "20-Feb-2026",
                                materialQty: "1,850",
                                uom: "Kg",
                                okQty: "1,850",
                                rejQty: "0",
                                inspBy: "R. Vignesh",
                                verdict: "PASS"
                            }
                        ],
                        notes: "EN8D medium carbon steel ground bars received, spark tested, and heat number verified."
                    },
                    {
                        step: 6,
                        key: "supplier",
                        title: "Supplier Details",
                        subtitle: "Tier-1 Mill Approval & Vendor Audit Performance",
                        iconName: "Building2",
                        badge: "VEND-TTS-0033",
                        badgeColor: "#ec4899",
                        accentColor: "#db2777",
                        metrics: [
                            { label: "Supplier / Mill Name", value: "Tata Steel Tubes Division", highlight: true },
                            { label: "Raw Material PO Ref", value: "PO-RM-2026-0818", highlight: true },
                            { label: "Po Date", value: "06-Feb-2026", highlight: true },
                            { label: "Qty", value: "1,850", highlight: true },
                            { label: "Uom", value: "Kg", highlight: true }
                        ],
                        supplierRecords: [
                            {
                                supplierName: "Tata Steel Tubes Division",
                                poRef: "PO-RM-2026-0818",
                                poDate: "06-Feb-2026",
                                qty: "1,850",
                                uom: "Kg",
                                status: "APPROVED TIER-1"
                            }
                        ],
                        vendorRating: "99.2% Grade A",
                        rejectionPpm: "0 PPM (Zero Defect)",
                        traceability: "100% Heat Lot Matched",
                        notes: "Preferred mill under long-term quality supply agreement with complete traceability back to steel billet casting heat."
                    }
                ]
            }
        ],
        stages: [
            {
                step: 1,
                key: "invoice",
                title: "Invoice No",
                subtitle: "Billing & Commercial Release",
                iconName: "FileSpreadsheet",
                badge: "INV-2026-0842",
                badgeColor: "#3b82f6",
                accentColor: "#2563eb",
                metrics: [
                    { label: "Invoice Number", value: "INV-2026-0842", highlight: true },
                    { label: "Invoice Date", value: "08-Mar-2026" },
                    { label: "Billed Quantity", value: "150 Nos", highlight: true },
                    { label: "Unit Rate", value: "₹ 3,450.00 / No" },
                    { label: "Taxable Subtotal", value: "₹ 5,17,500.00" },
                    { label: "GST (CGST+SGST 18%)", value: "₹ 93,150.00" },
                    { label: "Total Net Payable", value: "₹ 6,10,650.00", highlight: true },
                    { label: "Customer PO Ref", value: "PO-RMC-2026-7781" },
                    { label: "PO Order Date", value: "12-Feb-2026" },
                    { label: "IRN / QR Code", value: "IRN-8841-A902-9982" }
                ],
                // notes: "Commercial invoice released with automated digital sign-off. Cross-referenced against Customer PO #PO-RMC-2026-7781 line item 01."
            },
            {
                step: 2,
                key: "dc",
                title: "DC (Delivery Challan)",
                subtitle: "Outward Logistics & Movement",
                iconName: "Truck",
                badge: "DC/2026/03/0184",
                badgeColor: "#8b5cf6",
                accentColor: "#7c3aed",
                metrics: [
                    { label: "Delivery Challan No", value: "DC/2026/03/0184", highlight: true },
                    { label: "Challan Date & Time", value: "08-Mar-2026 (04:30 PM)" },
                    { label: "Dispatched Quantity", value: "150 Nos (5 Sealed Crates)", highlight: true },
                    { label: "Vehicle Number", value: "TN-38-BZ-4921", highlight: true },
                    { label: "Transporter Name", value: "VRL Logistics Express Ltd" },
                    { label: "E-Way Bill Number", value: "3819 4029 8812 (Valid 10-Mar)" },
                    { label: "GRN/PO Det", value: "PO-RMC-2026-7781 • GRN-2026-02-0492", highlight: true }
                ],
                // notes: "Security gate seal #GT-8840 applied. Goods inspected for moisture protection packaging and transit cushioning before vehicle exit."
            },
            {
                step: 3,
                key: "finalInsp",
                title: "Final Insp",
                subtitle: "100% Finished Goods Inspection & Hydro Test",
                iconName: "CheckCheck",
                badge: "FIR-2026-03-098",
                badgeColor: "#10b981",
                accentColor: "#059669",
                metrics: [
                    { label: "Final Insp Report No", value: "FIR-2026-03-098", highlight: true },
                    { label: "Inspection Date", value: "07-Mar-2026" },
                    { label: "Tot Qty", value: "150 Nos", highlight: true },
                    { label: "Inspected Qty", value: "150 Nos", highlight: true },
                    { label: "Rej Qty", value: "0 Nos" },
                    { label: "Rw Qty", value: "0 Nos" },
                    { label: "Routecard Det", value: "RC-2026-03-8842", highlight: true },
                    { label: "Insp By", value: "K. Rajesh" }
                ],
                inspectionRecords: [
                    { op: "OP 10", routeCard: "RC-2026-03-8842", process: "CNC Facing, Chamfering & Centering", machine: "Doosan Lynx 220", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "S. Selvam", verdict: "PASS" },
                    { op: "OP 20", routeCard: "RC-2026-03-8842", process: "Precision Deep-Hole Skiving & Burnishing", machine: "BTA Deep-Hole 02", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "M. Anand", verdict: "PASS" },
                    { op: "OP 30", routeCard: "RC-2026-03-8842", process: "Subcontract Induction Hardening & Chrome", machine: "Apex Surface Tech", shift: "General", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "R. Murugesh", verdict: "PASS" },
                    { op: "OP 50", routeCard: "RC-2026-03-8842", process: "CNC Port Threading & Flange TIG Welding", machine: "Mori Seiki NLX", shift: "Shift 2", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "P. Vignesh", verdict: "PASS" },
                    { op: "OP 60", routeCard: "RC-2026-03-8842", process: "Multi-Stage Ultrasonic Clean & Degrease", machine: "SonicWash SW-400", shift: "Shift 2", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "V. Raman", verdict: "PASS" },
                    { op: "Final QA", routeCard: "RC-2026-03-8842", process: "100% CMM Metrology & 350 Bar Hydro Test", machine: "Zeiss CMM / Test Bench", shift: "Shift 1", totQty: "150", inspQty: "150", okQty: "150", rejQty: "0", rwQty: "0", inspectedBy: "K. Rajesh", verdict: "PASS" }
                ],
                // notes: "All 150 tubes successfully tested for dimensional compliance on CMM Zeiss Contura and leak-free pressure testing at 350 Bar."
            },
            {
                step: 4,
                key: "production",
                title: "Production (Inhouse & Job Order) with Quality Insp",
                subtitle: "6 Stage Workflow (Inhouse CNC + Subcontract Heat Treat)",
                iconName: "Factory",
                badge: "RC-2026-03-8842",
                badgeColor: "#f59e0b",
                accentColor: "#d97706",
                routeCardNo: "RC-2026-03-8842",
                metrics: [
                    { label: "Route Card Number", value: "RC-2026-03-8842", highlight: true },
                    { label: "Routing Operations", value: "6 Ops (4 Inhouse CNC + 2 Subcontract)", highlight: true },
                    { label: "Primary Subcontractor", value: "Apex Heat Treat & Surface Coating Tech" },
                    { label: "Job Order Challans", value: "Out: SC-DC-2026-0419 • In: APX-IN-8921" }
                ],
                inhouseOps: [
                    { op: "OP 10", process: "CNC Facing, Chamfering & Centering", machine: "Doosan Lynx 220", operator: "S. Selvam", ipqa: "IPQA-2601", status: "Approved", keyMetric: "Face Runout ≤ 0.015 mm" },
                    { op: "OP 20", process: "Precision Deep-Hole Skiving & Burnishing", machine: "BTA Deep-Hole 02", operator: "M. Anand", ipqa: "IPQA-2602", status: "Approved", keyMetric: "Internal Bore Ra 0.16 µm" },
                    { op: "OP 50", process: "CNC Port Threading & Flange TIG Welding", machine: "Mori Seiki NLX", operator: "P. Vignesh", ipqa: "IPQA-2605", status: "Approved", keyMetric: "Thread Gauge 6H PASS" },
                    { op: "OP 60", process: "Multi-Stage Ultrasonic Clean & Degrease", machine: "SonicWash SW-400", operator: "V. Raman", ipqa: "IPQA-2606", status: "Approved", keyMetric: "Gravimetric Millipore 1.2 mg" }
                ],
                jobOrder: {
                    vendorName: "Apex Heat Treat & Surface Coating Tech",
                    subcontractDC: "SC-DC-2026-0419",
                    inwardChallan: "APX-IN-8921",
                    items: [
                        { op: "OP 30 (Job Order)", process: "Induction Hardening & Quenching", po: "PO-JO-2026-319", cert: "HT-CERT-9042", specs: "Hardness: 58-62 HRC (Actual: 59.5 HRC) | Case Depth: 1.35 mm (Spec: 1.2-1.5 mm)", status: "VERIFIED" },
                        { op: "OP 40 (Job Order)", process: "Hard Chrome Plating & Superfinishing", po: "PO-JO-2026-320", cert: "CR-CERT-4109", specs: "Chrome Thickness: 28.5 µm (Spec: 25-32 µm) | Salt Spray NSS 240 Hrs: PASS", status: "VERIFIED" }
                    ]
                },
                notes: "In-process quality inspectors performed first-piece and hourly frequency checks. Subcontract job-order certifications cross-validated before final assembly."
            },
            {
                step: 5,
                key: "grn",
                title: "GRN Tracking",
                subtitle: "Inward Raw Material Receipt & Store Verification",
                iconName: "Package",
                badge: "GRN-2026-02-0492",
                badgeColor: "#06b6d4",
                accentColor: "#0891b2",
                metrics: [
                    { label: "GRN Number", value: "GRN-2026-02-0492", highlight: true },
                    { label: "GRN Inward Date", value: "18-Feb-2026", highlight: true },
                    { label: "Material Qty", value: "4,850", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                grnRecords: [
                    {
                        grnNo: "GRN-2026-02-0492",
                        grnDate: "18-Feb-2026",
                        materialQty: "4,850",
                        uom: "Kg",
                        okQty: "4,850",
                        rejQty: "0",
                        inspBy: "R. Vignesh",
                        verdict: "PASS"
                    }
                ],
                notes: "Raw material inward received and verified against purchase order with 100% heat lot identity and visual store inspection."
            },
            {
                step: 6,
                key: "supplier",
                title: "Supplier Details",
                subtitle: "Tier-1 Mill Approval & Vendor Audit Performance",
                iconName: "Building2",
                badge: "VEND-JND-0104",
                badgeColor: "#ec4899",
                accentColor: "#db2777",
                metrics: [
                    { label: "Supplier / Mill Name", value: "Jindal Steel & Seamless Tubes Ltd", highlight: true },
                    { label: "Raw Material PO Ref", value: "PO-RM-2026-0812", highlight: true },
                    { label: "Po Date", value: "05-Feb-2026", highlight: true },
                    { label: "Qty", value: "4,850", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                supplierRecords: [
                    {
                        supplierName: "Jindal Steel & Seamless Tubes Ltd",
                        poRef: "PO-RM-2026-0812",
                        poDate: "05-Feb-2026",
                        qty: "4,850",
                        uom: "Kg",
                        status: "APPROVED TIER-1"
                    }
                ],
                vendorRating: "98.5% Grade A",
                rejectionPpm: "0 PPM (Zero Defect)",
                traceability: "100% Heat Lot Matched",
                notes: "Preferred mill under long-term quality supply agreement with complete traceability back to steel billet casting heat."
            }
        ]
    }, {
        id: "INV-2026-0843",
        customer: "Hailstone Innovations Pvt Ltd",
        partNo: "HLS-PIN-6542",
        partDescription: "Heavy Duty Drive Pinion Shaft Ø65 x 420 mm",
        batchLot: "LOT-HLS-2026-18",
        totalValue: "₹ 4,89,600",
        billedQty: "80 Nos",
        auditRating: "99.1%",
        qualityStatus: "Passed & QA Stamped",
        dispatchStatus: "Dispatched & Delivered",
        stages: [
            {
                step: 1,
                key: "invoice",
                title: "Invoice No",
                subtitle: "Billing & Commercial Release",
                iconName: "FileSpreadsheet",
                badge: "INV-2026-0843",
                badgeColor: "#3b82f6",
                accentColor: "#2563eb",
                metrics: [
                    { label: "Invoice Number", value: "INV-2026-0843", highlight: true },
                    { label: "Invoice Date", value: "09-Mar-2026" },
                    { label: "Billed Quantity", value: "80 Nos", highlight: true },
                    { label: "Unit Rate", value: "₹ 5,100.00 / No" },
                    { label: "Taxable Subtotal", value: "₹ 4,08,000.00" },
                    { label: "GST (CGST+SGST 18%)", value: "₹ 73,440.00" },
                    { label: "Total Net Payable", value: "₹ 4,89,600.00", highlight: true },
                    { label: "Customer PO Ref", value: "PO-HLS-2026-4109" },
                    { label: "PO Order Date", value: "16-Feb-2026" }
                ],
                notes: "Pinion shaft batch billed under warranty contract for Hailstone primary crushers."
            },
            {
                step: 2,
                key: "dc",
                title: "DC (Delivery Challan)",
                subtitle: "Outward Logistics & Movement",
                iconName: "Truck",
                badge: "DC/2026/03/0189",
                badgeColor: "#8b5cf6",
                accentColor: "#7c3aed",
                metrics: [
                    { label: "Delivery Challan No", value: "DC/2026/03/0189", highlight: true },
                    { label: "Challan Date & Time", value: "09-Mar-2026 (02:15 PM)" },
                    { label: "Dispatched Quantity", value: "80 Nos (4 Wooden Pallets)", highlight: true },
                    { label: "Vehicle Number", value: "KL-08-AW-3184", highlight: true },
                    { label: "Transporter Name", value: "Southern Roadways Cargo" },
                    { label: "E-Way Bill Number", value: "3920 1194 0029" },
                    { label: "GRN/PO Det", value: "PO-HLS-2026-4109 • GRN-2026-02-0504", highlight: true }
                ],
                notes: "Loaded with anti-impact wooden dividers between pinions to protect gear teeth."
            },
            {
                step: 3,
                key: "finalInsp",
                title: "Final Insp",
                subtitle: "100% Finished Goods Inspection & Runout Test",
                iconName: "CheckCheck",
                badge: "FIR-2026-03-102",
                badgeColor: "#10b981",
                accentColor: "#059669",
                metrics: [
                    { label: "Final Insp Report No", value: "FIR-2026-03-102", highlight: true },
                    { label: "Inspection Date", value: "08-Mar-2026" },
                    { label: "Tot Qty", value: "80 Nos", highlight: true },
                    { label: "Inspected Qty", value: "80 Nos", highlight: true },
                    { label: "Rej Qty", value: "0 Nos" },
                    { label: "Rw Qty", value: "0 Nos" },
                    { label: "Routecard Det", value: "RC-2026-03-8850", highlight: true },
                    { label: "Insp By", value: "M. Soundararajan" }
                ],
                inspectionRecords: [
                    { op: "OP 10", routeCard: "RC-2026-03-8850", process: "CNC Rough & Finish OD Turning", machine: "Haas ST-30", shift: "Shift 1", totQty: "80", inspQty: "80", okQty: "80", rejQty: "0", rwQty: "0", inspectedBy: "K. Balaji", verdict: "PASS" },
                    { op: "OP 20", routeCard: "RC-2026-03-8850", process: "Precision Pinion Gear Hobbing", machine: "Liebherr LC-180", shift: "Shift 1", totQty: "80", inspQty: "80", okQty: "80", rejQty: "0", rwQty: "0", inspectedBy: "P. Ramesh", verdict: "PASS" },
                    { op: "OP 30", routeCard: "RC-2026-03-8850", process: "Subcontract Vacuum Carburizing", machine: "Thermotreat Tech", shift: "General", totQty: "80", inspQty: "80", okQty: "80", rejQty: "0", rwQty: "0", inspectedBy: "V. Senthil", verdict: "PASS" },
                    { op: "OP 40", routeCard: "RC-2026-03-8850", process: "CNC Journal & Flank Profile Grinding", machine: "Studer S33", shift: "Shift 2", totQty: "80", inspQty: "80", okQty: "80", rejQty: "0", rwQty: "0", inspectedBy: "T. Dinesh", verdict: "PASS" },
                    { op: "Final QA", routeCard: "RC-2026-03-8850", process: "100% Tooth Lead, Pitch & Runout QA", machine: "Klingelnberg CNC", shift: "Shift 1", totQty: "80", inspQty: "80", okQty: "80", rejQty: "0", rwQty: "0", inspectedBy: "M. Soundararajan", verdict: "PASS" }
                ],
                notes: "Gear tooth flank profile and pitch variance verified on Klingelnberg CNC Gear Tester."
            },
            {
                step: 4,
                key: "production",
                title: "Production (Inhouse & Job Order) with Quality Insp",
                subtitle: "CNC Turning, Hobbing & Subcontract Vacuum Carburizing",
                iconName: "Factory",
                badge: "RC-2026-03-8850",
                badgeColor: "#f59e0b",
                accentColor: "#d97706",
                routeCardNo: "RC-2026-03-8850",
                metrics: [
                    { label: "Route Card Number", value: "RC-2026-03-8850", highlight: true },
                    { label: "Routing Operations", value: "4 Ops (3 Inhouse CNC + 1 Subcontract)", highlight: true },
                    { label: "Primary Subcontractor", value: "SuperTherm Vacuum Carburizing Ltd" },
                    { label: "Job Order Challans", value: "Out: SC-DC-2026-0428 • In: ST-IN-4421" }
                ],
                inhouseOps: [
                    { op: "OP 10", process: "CNC Rough & Finish Turning", machine: "Mazak Quick Turn 250", operator: "R. Suresh", ipqa: "IPQA-2710", status: "Approved", keyMetric: "Journal Runout ≤ 0.010 mm" },
                    { op: "OP 20", process: "Precision CNC Gear Hobbing", machine: "Liebherr LC 280", operator: "K. Mohan", ipqa: "IPQA-2712", status: "Approved", keyMetric: "DIN 7 Gear Tooth Class PASS" },
                    { op: "OP 50", process: "CNC Hard Part Finish Grinding", machine: "Studer S33 Cylindrical", operator: "G. Bala", ipqa: "IPQA-2715", status: "Approved", keyMetric: "Bearing Seat Ra 0.24 µm" }
                ],
                jobOrder: {
                    vendorName: "SuperTherm Vacuum Carburizing Ltd",
                    subcontractDC: "SC-DC-2026-0428",
                    inwardChallan: "ST-IN-4421",
                    items: [
                        { op: "OP 30 (Job Order)", process: "Vacuum Carburizing & Cryogenic Quench", po: "PO-JO-2026-342", cert: "VC-CERT-8812", specs: "Surface: 60.2 HRC | Effective Case Depth: 1.65 mm (Spec: 1.5 - 1.8 mm)", status: "VERIFIED" }
                    ]
                },
                notes: "100% magnetic particle crack testing (MPI) completed post heat-treatment."
            },
            {
                step: 5,
                key: "grn",
                title: "GRN Tracking",
                subtitle: "20MnCr5 Forged Round Bar Inward Receipt",
                iconName: "Package",
                badge: "GRN-2026-02-0504",
                badgeColor: "#06b6d4",
                accentColor: "#0891b2",
                metrics: [
                    { label: "GRN Number", value: "GRN-2026-02-0504", highlight: true },
                    { label: "GRN Inward Date", value: "22-Feb-2026", highlight: true },
                    { label: "Material Qty", value: "3,820", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                grnRecords: [
                    {
                        grnNo: "GRN-2026-02-0504",
                        grnDate: "22-Feb-2026",
                        materialQty: "3,820",
                        uom: "Kg",
                        okQty: "3,820",
                        rejQty: "0",
                        inspBy: "M. Soundararajan",
                        verdict: "PASS"
                    }
                ],
                notes: "Raw forged bars received, identity verified, and cleared for inhouse CNC machining."
            },
            {
                step: 6,
                key: "supplier",
                title: "Supplier Details",
                subtitle: "Kalyani Steels Special Alloy Division",
                iconName: "Building2",
                badge: "VEND-KLY-0210",
                badgeColor: "#ec4899",
                accentColor: "#db2777",
                metrics: [
                    { label: "Supplier / Mill Name", value: "Kalyani Steels Limited", highlight: true },
                    { label: "Raw Material PO Ref", value: "PO-RM-2026-0834", highlight: true },
                    { label: "Po Date", value: "10-Feb-2026", highlight: true },
                    { label: "Qty", value: "3,820", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                supplierRecords: [
                    {
                        supplierName: "Kalyani Steels Limited",
                        poRef: "PO-RM-2026-0834",
                        poDate: "10-Feb-2026",
                        qty: "3,820",
                        uom: "Kg",
                        status: "APPROVED TIER-1"
                    }
                ],
                vendorRating: "99.1% Grade A",
                rejectionPpm: "0 PPM (Zero Defect)",
                traceability: "100% Heat Lot Matched",
                notes: "Approved supplier for premium transmission alloy forgings."
            }
        ]
    },
    {
        id: "INV-2026-0844",
        customer: "ATS Elgi Limited",
        partNo: "ELG-CYL-85WF",
        partDescription: "Hydraulic Cylinder Assembly DIA 85 W/F",
        batchLot: "LOT-ELGI-2026-09",
        totalValue: "₹ 7,56,000",
        billedQty: "120 Nos",
        auditRating: "99.7%",
        qualityStatus: "Passed & QA Stamped",
        dispatchStatus: "Dispatched & Delivered",
        stages: [
            {
                step: 1,
                key: "invoice",
                title: "Invoice No",
                subtitle: "Billing & Commercial Release",
                iconName: "FileSpreadsheet",
                badge: "INV-2026-0844",
                badgeColor: "#3b82f6",
                accentColor: "#2563eb",
                metrics: [
                    { label: "Invoice Number", value: "INV-2026-0844", highlight: true },
                    { label: "Invoice Date", value: "09-Mar-2026" },
                    { label: "Billed Quantity", value: "120 Nos", highlight: true },
                    { label: "Unit Rate", value: "₹ 5,338.98 / No" },
                    { label: "Taxable Subtotal", value: "₹ 6,40,678.00" },
                    { label: "GST (18%)", value: "₹ 1,15,322.00" },
                    { label: "Total Net Payable", value: "₹ 7,56,000.00", highlight: true },
                    { label: "Customer PO Ref", value: "PO-ELGI-2026-9901" }
                ],
                notes: "Commercial release for high-pressure lifting cylinder assembly line."
            },
            {
                step: 2,
                key: "dc",
                title: "DC (Delivery Challan)",
                subtitle: "Outward Logistics & Movement",
                iconName: "Truck",
                badge: "DC/2026/03/0194",
                badgeColor: "#8b5cf6",
                accentColor: "#7c3aed",
                metrics: [
                    { label: "Delivery Challan No", value: "DC/2026/03/0194", highlight: true },
                    { label: "Challan Date & Time", value: "09-Mar-2026 (05:45 PM)" },
                    { label: "Dispatched Quantity", value: "120 Nos", highlight: true },
                    { label: "Vehicle Number", value: "TN-37-DC-8012", highlight: true },
                    { label: "Transporter Name", value: "ABT Parcel Service Ltd" },
                    { label: "E-Way Bill Number", value: "3921 8840 2210" },
                    { label: "GRN/PO Det", value: "PO-ELGI-2026-9901 • GRN-2026-02-0518", highlight: true }
                ],
                notes: "Delivered via dedicated local transit truck with shock absorption rubber mounts."
            },
            {
                step: 3,
                key: "finalInsp",
                title: "Final Insp",
                subtitle: "100% High Pressure Hydro & Dimensional Inspection",
                iconName: "CheckCheck",
                badge: "FIR-2026-03-110",
                badgeColor: "#10b981",
                accentColor: "#059669",
                metrics: [
                    { label: "Final Insp Report No", value: "FIR-2026-03-110", highlight: true },
                    { label: "Inspection Date", value: "09-Mar-2026" },
                    { label: "Tot Qty", value: "120 Nos", highlight: true },
                    { label: "Inspected Qty", value: "120 Nos", highlight: true },
                    { label: "Rej Qty", value: "0 Nos" },
                    { label: "Rw Qty", value: "0 Nos" },
                    { label: "Routecard Det", value: "RC-2026-03-8861", highlight: true },
                    { label: "Insp By", value: "S. Nithyanand" }
                ],
                inspectionRecords: [
                    { op: "OP 10", routeCard: "RC-2026-03-8861", process: "CNC Rough Turning & Port Milling", machine: "BFW Agni VMC", shift: "Shift 1", totQty: "120", inspQty: "120", okQty: "120", rejQty: "0", rwQty: "0", inspectedBy: "A. Karthik", verdict: "PASS" },
                    { op: "OP 20", routeCard: "RC-2026-03-8861", process: "Vertical CNC Tube Honing", machine: "Sunnen SV-20", shift: "Shift 1", totQty: "120", inspQty: "120", okQty: "120", rejQty: "0", rwQty: "0", inspectedBy: "N. Murthy", verdict: "PASS" },
                    { op: "OP 30", routeCard: "RC-2026-03-8861", process: "Controlled Gas Nitriding", machine: "Precision Nitriding", shift: "General", totQty: "120", inspQty: "120", okQty: "120", rejQty: "0", rwQty: "0", inspectedBy: "K. Mohan", verdict: "PASS" },
                    { op: "OP 50", routeCard: "RC-2026-03-8861", process: "Automated Assembly & Seal Fitment", machine: "Assembly Line 01", shift: "Shift 2", totQty: "120", inspQty: "120", okQty: "120", rejQty: "0", rwQty: "0", inspectedBy: "D. Siva", verdict: "PASS" },
                    { op: "Final QA", routeCard: "RC-2026-03-8861", process: "400 Bar Proof Hydro & Dimension QA", machine: "Hydro Rig 02", shift: "Shift 1", totQty: "120", inspQty: "120", okQty: "120", rejQty: "0", rwQty: "0", inspectedBy: "S. Nithyanand", verdict: "PASS" }
                ],
                notes: "Zero external oil weeping or internal piston bypass detected across all units."
            },
            {
                step: 4,
                key: "production",
                title: "Production (Inhouse & Job Order) with Quality Insp",
                subtitle: "Inhouse Boring, Honing & Subcontract Nitriding",
                iconName: "Factory",
                badge: "RC-2026-03-8861",
                badgeColor: "#f59e0b",
                accentColor: "#d97706",
                routeCardNo: "RC-2026-03-8861",
                metrics: [
                    { label: "Route Card Number", value: "RC-2026-03-8861", highlight: true },
                    { label: "Routing Operations", value: "4 Ops (3 Inhouse CNC + 1 Subcontract)", highlight: true },
                    { label: "Primary Subcontractor", value: "Precision Gas Nitriding Solutions" },
                    { label: "Job Order Challans", value: "Out: SC-DC-2026-0435 • In: PGN-IN-1290" }
                ],
                inhouseOps: [
                    { op: "OP 10", process: "CNC Rough Turning & Port Milling", machine: "BFW Agni VMC", operator: "A. Karthik", ipqa: "IPQA-2840", status: "Approved", keyMetric: "Port Thread PASS" },
                    { op: "OP 20", process: "Vertical CNC Tube Honing", machine: "Sunnen SV-20", operator: "N. Murthy", ipqa: "IPQA-2842", status: "Approved", keyMetric: "Bore Cylindricity ≤ 0.006 mm" },
                    { op: "OP 50", process: "Automated Cylinder Assembly & Seal Fitment", machine: "Assembly Line 01", operator: "D. Siva", ipqa: "IPQA-2845", status: "Approved", keyMetric: "Seal Integrity 100% OK" }
                ],
                jobOrder: {
                    vendorName: "Precision Gas Nitriding Solutions",
                    subcontractDC: "SC-DC-2026-0435",
                    inwardChallan: "PGN-IN-1290",
                    items: [
                        { op: "OP 30 (Job Order)", process: "Controlled Gas Nitriding", po: "PO-JO-2026-360", cert: "GN-CERT-1104", specs: "Case Depth: 0.45 mm | Surface Hardness: 680 HV1 (PASS)", status: "VERIFIED" }
                    ]
                },
                notes: "Seal grooves checked with optical comparator before Parker hydraulic seal fitment."
            },
            {
                step: 5,
                key: "grn",
                title: "GRN Tracking",
                subtitle: "Cold Drawn Seamless Steel Pipe Inward Receipt",
                iconName: "Package",
                badge: "GRN-2026-02-0518",
                badgeColor: "#06b6d4",
                accentColor: "#0891b2",
                metrics: [
                    { label: "GRN Number", value: "GRN-2026-02-0518", highlight: true },
                    { label: "GRN Inward Date", value: "24-Feb-2026", highlight: true },
                    { label: "Material Qty", value: "5,140", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                grnRecords: [
                    {
                        grnNo: "GRN-2026-02-0518",
                        grnDate: "24-Feb-2026",
                        materialQty: "5,140",
                        uom: "Kg",
                        okQty: "5,140",
                        rejQty: "0",
                        inspBy: "P. Dharmaraj",
                        verdict: "PASS"
                    }
                ],
                notes: "Fully normalized and stress-relieved seamless tubes inspected and stored in Raw Bay."
            },
            {
                step: 6,
                key: "supplier",
                title: "Supplier Details",
                subtitle: "Tata Steel Tubes Division Approved Vendor",
                iconName: "Building2",
                badge: "VEND-TTS-0033",
                badgeColor: "#ec4899",
                accentColor: "#db2777",
                metrics: [
                    { label: "Supplier / Mill Name", value: "Tata Steel Tubes Division", highlight: true },
                    { label: "Raw Material PO Ref", value: "PO-RM-2026-0842", highlight: true },
                    { label: "Po Date", value: "12-Feb-2026", highlight: true },
                    { label: "Qty", value: "5,140", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                supplierRecords: [
                    {
                        supplierName: "Tata Steel Tubes Division",
                        poRef: "PO-RM-2026-0842",
                        poDate: "12-Feb-2026",
                        qty: "5,140",
                        uom: "Kg",
                        status: "APPROVED TIER-1"
                    }
                ],
                vendorRating: "99.7% Grade A+",
                rejectionPpm: "0 PPM (Zero Defect)",
                traceability: "100% Heat Lot Matched",
                notes: "Primary strategic partner for high-pressure seamless tubing."
            }
        ]
    },
    {
        id: "INV-2026-0845",
        customer: "Bicelli Geco Hydraulics India",
        partNo: "BCG-ROD-5080",
        partDescription: "Hard Chrome Hydraulic Piston Rod Ø50 x 800 mm",
        batchLot: "LOT-BICE-2026-25",
        totalValue: "₹ 5,84,000",
        billedQty: "200 Nos",
        auditRating: "99.6%",
        qualityStatus: "Passed & QA Stamped",
        dispatchStatus: "Dispatched & Delivered",
        parts: [
            {
                partNo: "BCG-ROD-5080",
                partDescription: "Hard Chrome Hydraulic Piston Rod Ø50 x 800 mm",
                batchLot: "LOT-BICE-2026-25A",
                billedQty: "200 Nos",
                partValue: "₹ 2,40,000",
                auditRating: "99.6%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered"
            },
            {
                partNo: "BCG-CYL-3260",
                partDescription: "Double Acting Hydraulic Cylinder Tube Ø60 x 750 mm",
                batchLot: "LOT-BICE-2026-25B",
                billedQty: "100 Nos",
                partValue: "₹ 1,54,000",
                auditRating: "99.5%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered"
            },
            {
                partNo: "BCG-PST-4520",
                partDescription: "Precision Forged Hydraulic Piston Head Ø50",
                batchLot: "LOT-BICE-2026-25C",
                billedQty: "150 Nos",
                partValue: "₹ 1,10,000",
                auditRating: "99.8%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered"
            },
            {
                partNo: "BCG-SEAL-9010",
                partDescription: "Polyurethane High Pressure Rod Seal Kit",
                batchLot: "LOT-BICE-2026-25D",
                billedQty: "200 Sets",
                partValue: "₹ 80,000",
                auditRating: "100%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched & Delivered"
            }
        ],
        stages: [
            {
                step: 1,
                key: "invoice",
                title: "Invoice No",
                subtitle: "Billing & Commercial Release",
                iconName: "FileSpreadsheet",
                badge: "INV-2026-0845",
                badgeColor: "#3b82f6",
                accentColor: "#2563eb",
                metrics: [
                    { label: "Invoice Number", value: "INV-2026-0845", highlight: true },
                    { label: "Invoice Date", value: "10-Mar-2026" },
                    { label: "Billed Quantity", value: "200 Nos", highlight: true },
                    { label: "Unit Rate", value: "₹ 2,474.57 / No" },
                    { label: "Taxable Subtotal", value: "₹ 4,94,915.00" },
                    { label: "GST (18%)", value: "₹ 89,085.00" },
                    { label: "Total Net Payable", value: "₹ 5,84,000.00", highlight: true },
                    { label: "Customer PO Ref", value: "PO-BCG-2026-3180" }
                ],
                notes: "Commercial invoice with electronic tax clearance."
            },
            {
                step: 2,
                key: "dc",
                title: "DC (Delivery Challan)",
                subtitle: "Outward Logistics & Movement",
                iconName: "Truck",
                badge: "DC/2026/03/0201",
                badgeColor: "#8b5cf6",
                accentColor: "#7c3aed",
                metrics: [
                    { label: "Delivery Challan No", value: "DC/2026/03/0201", highlight: true },
                    { label: "Challan Date & Time", value: "10-Mar-2026 (01:10 PM)" },
                    { label: "Dispatched Quantity", value: "200 Nos", highlight: true },
                    { label: "Vehicle Number", value: "TN-40-EE-9912", highlight: true },
                    { label: "Transporter Name", value: "GATI KWE Express" },
                    { label: "E-Way Bill Number", value: "3922 4018 7741" },
                    { label: "GRN/PO Det", value: "PO-BCG-2026-3180 • GRN-2026-02-0530", highlight: true }
                ],
                notes: "Shipped in reinforced wooden crates with heavy polyethylene sealing."
            },
            {
                step: 3,
                key: "finalInsp",
                title: "Final Insp",
                subtitle: "100% Piston Rod Chrome & Straightness Inspection",
                iconName: "CheckCheck",
                badge: "FIR-2026-03-115",
                badgeColor: "#10b981",
                accentColor: "#059669",
                metrics: [
                    { label: "Final Insp Report No", value: "FIR-2026-03-115", highlight: true },
                    { label: "Inspection Date", value: "10-Mar-2026" },
                    { label: "Tot Qty", value: "200 Nos", highlight: true },
                    { label: "Inspected Qty", value: "200 Nos", highlight: true },
                    { label: "Rej Qty", value: "0 Nos" },
                    { label: "Rw Qty", value: "0 Nos" },
                    { label: "Routecard Det", value: "RC-2026-03-8874", highlight: true },
                    { label: "Insp By", value: "C. Prakash" }
                ],
                inspectionRecords: [
                    { op: "OP 10", routeCard: "RC-2026-03-8874", process: "CNC Bar Peeling & Facing", machine: "Doosan Puma GT", shift: "Shift 1", totQty: "200", inspQty: "200", okQty: "200", rejQty: "0", rwQty: "0", inspectedBy: "G. Manoj", verdict: "PASS" },
                    { op: "OP 20", routeCard: "RC-2026-03-8874", process: "Centerless Cylindrical Grinding", machine: "Cincinnati OM-2", shift: "Shift 1", totQty: "200", inspQty: "200", okQty: "200", rejQty: "0", rwQty: "0", inspectedBy: "R. Saravanan", verdict: "PASS" },
                    { op: "OP 30", routeCard: "RC-2026-03-8874", process: "Subcontract Hard Chrome Plating", machine: "SuperChrome Tech", shift: "General", totQty: "200", inspQty: "200", okQty: "200", rejQty: "0", rwQty: "0", inspectedBy: "M. Chandran", verdict: "PASS" },
                    { op: "OP 40", routeCard: "RC-2026-03-8874", process: "Superfinishing & Polishing", machine: "Nagel Superfinish", shift: "Shift 2", totQty: "200", inspQty: "200", okQty: "200", rejQty: "0", rwQty: "0", inspectedBy: "J. Prakash", verdict: "PASS" },
                    { op: "Final QA", routeCard: "RC-2026-03-8874", process: "100% Diameter, Straightness & Surface QA", machine: "Mitutoyo Linear Height", shift: "Shift 1", totQty: "200", inspQty: "200", okQty: "200", rejQty: "0", rwQty: "0", inspectedBy: "C. Prakash", verdict: "PASS" }
                ],
                notes: "Ultra-fine superfinished surface with mirror plating verified under 50x microscope."
            },
            {
                step: 4,
                key: "production",
                title: "Production (Inhouse & Job Order) with Quality Insp",
                subtitle: "CNC Turning, Threading & Subcontract Hard Chrome",
                iconName: "Factory",
                badge: "RC-2026-03-8874",
                badgeColor: "#f59e0b",
                accentColor: "#d97706",
                routeCardNo: "RC-2026-03-8874",
                metrics: [
                    { label: "Route Card Number", value: "RC-2026-03-8874", highlight: true },
                    { label: "Routing Operations", value: "3 Ops (2 Inhouse CNC + 1 Subcontract)", highlight: true },
                    { label: "Primary Subcontractor", value: "Precision Chrome Tech Surface Finishers" },
                    { label: "Job Order Challans", value: "Out: SC-DC-2026-0442 • In: PCT-IN-9081" }
                ],
                inhouseOps: [
                    { op: "OP 10", process: "CNC Facing, Threading & Eye Turning", machine: "Haas ST-30", operator: "E. Prabhu", ipqa: "IPQA-2901", status: "Approved", keyMetric: "Thread Pitch Error < 0.005 mm" },
                    { op: "OP 20", process: "Precision Centerless Cylindrical Polishing", machine: "Glebov Superfinisher", operator: "K. Mohan", ipqa: "IPQA-2904", status: "Approved", keyMetric: "Base Ra 0.20 µm" }
                ],
                jobOrder: {
                    vendorName: "Precision Chrome Tech Surface Finishers",
                    subcontractDC: "SC-DC-2026-0442",
                    inwardChallan: "PCT-IN-9081",
                    items: [
                        { op: "OP 30 (Job Order)", process: "Hard Chrome Plating 25 µm & Micro-cracking", po: "PO-JO-2026-377", cert: "CR-CERT-5501", specs: "Plating: 26.2 µm | Hardness: 950 HV0.1 | NSS 240 Hrs (PASS)", status: "VERIFIED" }
                    ]
                },
                notes: "Surface roughness and chrome micro-crack density checked per ISO 6158."
            },
            {
                step: 5,
                key: "grn",
                title: "GRN Tracking",
                subtitle: "Ck45 / EN8D Induction Hardened Bar Inward Receipt",
                iconName: "Package",
                badge: "GRN-2026-02-0529",
                badgeColor: "#06b6d4",
                accentColor: "#0891b2",
                metrics: [
                    { label: "GRN Number", value: "GRN-2026-02-0529", highlight: true },
                    { label: "GRN Inward Date", value: "27-Feb-2026", highlight: true },
                    { label: "Material Qty", value: "6,200", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                grnRecords: [
                    {
                        grnNo: "GRN-2026-02-0529",
                        grnDate: "27-Feb-2026",
                        materialQty: "6,200",
                        uom: "Kg",
                        okQty: "6,200",
                        rejQty: "0",
                        inspBy: "C. Prakash",
                        verdict: "PASS"
                    }
                ],
                notes: "Raw induction bars received, dimensional checks verified, and identity confirmed for production."
            },
            {
                step: 6,
                key: "supplier",
                title: "Supplier Details",
                subtitle: "Salem Steel & Alloy Mills Tier-1 Vendor",
                iconName: "Building2",
                badge: "VEND-SLM-0087",
                badgeColor: "#ec4899",
                accentColor: "#db2777",
                metrics: [
                    { label: "Supplier / Mill Name", value: "Salem Steel & Alloy Mills", highlight: true },
                    { label: "Raw Material PO Ref", value: "PO-RM-2026-0850", highlight: true },
                    { label: "Po Date", value: "14-Feb-2026", highlight: true },
                    { label: "Qty", value: "6,200", highlight: true },
                    { label: "Uom", value: "Kg", highlight: true }
                ],
                supplierRecords: [
                    {
                        supplierName: "Salem Steel & Alloy Mills",
                        poRef: "PO-RM-2026-0850",
                        poDate: "14-Feb-2026",
                        qty: "6,200",
                        uom: "Kg",
                        status: "APPROVED TIER-1"
                    }
                ],
                vendorRating: "99.6% Grade A",
                rejectionPpm: "0 PPM (Zero Defect)",
                traceability: "100% Heat Lot Matched",
                notes: "Accredited mill with 100% on-time delivery and zero dimensional returns."
            }
        ]
    }
];

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Normalize invoice parts for multi-part invoice support
// ─────────────────────────────────────────────────────────────────────────────
export const getInvoiceParts = (inv) => {
    if (!inv) return [];
    if (inv.parts && Array.isArray(inv.parts) && inv.parts.length > 0) {
        return inv.parts;
    }
    return [
        {
            partNo: inv.partNo,
            partDescription: inv.partDescription,
            batchLot: inv.batchLot,
            billedQty: inv.billedQty,
            partValue: inv.totalValue,
            auditRating: inv.auditRating,
            qualityStatus: inv.qualityStatus,
            dispatchStatus: inv.dispatchStatus,
            stages: inv.stages
        }
    ];
};

function QualityTimelineSection() {
    const [selectedInvId, setSelectedInvId] = useState("INV-2026-0842");
    const [selectedPartNo, setSelectedPartNo] = useState("RMC-CYL-4050");
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);
    const [selectedStageModal, setSelectedStageModal] = useState(null); // 1..6 or null
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [lineItemDropdownOpen, setLineItemDropdownOpen] = useState(false);
    const [prodTab, setProdTab] = useState("ALL"); // "ALL" | "INHOUSE" | "SUBCONTRACT"
    const dropdownRef = useRef(null);
    const lineItemDropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    const activeInvoice = useMemo(() => {
        return QUALITY_TIMELINE_DATA.find((inv) => inv.id === selectedInvId) || QUALITY_TIMELINE_DATA[0];
    }, [selectedInvId]);

    const activePartsList = useMemo(() => {
        return getInvoiceParts(activeInvoice);
    }, [activeInvoice]);

    const activePart = useMemo(() => {
        const found = activePartsList.find((p) => p.partNo === selectedPartNo);
        return found || activePartsList[0];
    }, [activePartsList, selectedPartNo]);

    const activeStages = useMemo(() => {
        return activePart.stages || activeInvoice.stages;
    }, [activePart, activeInvoice]);

    const handleSelectInvoice = (invId) => {
        setSelectedInvId(invId);
        const targetInv = QUALITY_TIMELINE_DATA.find((inv) => inv.id === invId);
        const parts = getInvoiceParts(targetInv);
        if (parts.length > 0) {
            setSelectedPartNo(parts[0].partNo);
        }
        setDropdownOpen(false);
        setLineItemDropdownOpen(false);
        setSearchQuery("");
    };

    // Auto-focus search input when dropdown opens
    useEffect(() => {
        if (dropdownOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 60);
        }
    }, [dropdownOpen]);

    const filteredInvoices = useMemo(() => {
        if (!searchQuery.trim()) {
            return QUALITY_TIMELINE_DATA;
        }
        const q = searchQuery.toLowerCase();
        return QUALITY_TIMELINE_DATA.filter((inv) => {
            const parts = getInvoiceParts(inv);
            const matchPart = parts.some(
                (p) => p.partNo.toLowerCase().includes(q) || (p.partDescription && p.partDescription.toLowerCase().includes(q))
            );
            return (
                inv.id.toLowerCase().includes(q) ||
                inv.customer.toLowerCase().includes(q) ||
                inv.totalValue.toLowerCase().includes(q) ||
                matchPart
            );
        });
    }, [searchQuery]);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (lineItemDropdownRef.current && !lineItemDropdownRef.current.contains(event.target)) {
                setLineItemDropdownOpen(false);
            }
        };
        if (dropdownOpen || lineItemDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownOpen, lineItemDropdownOpen]);

    // Handle ESC key to close modal or dropdown & lock background scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedStageModal(null);
                setDropdownOpen(false);
                setLineItemDropdownOpen(false);
            }
        };
        if (selectedStageModal !== null) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [selectedStageModal]);

    const modalStageData = useMemo(() => {
        if (selectedStageModal === null) return null;
        return activeStages.find((s) => s.step === selectedStageModal) || null;
    }, [activeStages, selectedStageModal]);

    const handleCopyAuditTrail = () => {
        const text = [
            `========================================================================`,
            `  QUALITY TIMELINE AUDIT TRAIL — ${activeInvoice.id}`,
            `========================================================================`,
            `Customer:     ${activeInvoice.customer}`,
            `Part No:      ${activePart.partNo} — ${activePart.partDescription}`,
            `Batch Lot:    ${activePart.batchLot}`,
            `Billed Qty:   ${activePart.billedQty} | Total: ${activePart.partValue || activeInvoice.totalValue}`,
            `Quality:      ${activePart.qualityStatus} (Score: ${activePart.auditRating})`,
            `------------------------------------------------------------------------`,
            `STAGE 01: [Invoice No]    ${activeInvoice.stages[0].metrics[0].value} (Dt: ${activeInvoice.stages[0].metrics[1].value})`,
            `STAGE 02: [DC]            ${activeInvoice.stages[1].metrics[0].value} | Veh: ${activeInvoice.stages[1].metrics[3].value}`,
            `STAGE 03: [Final Insp]    ${activeInvoice.stages[2].metrics[0].value} | Inspected: ${activeInvoice.stages[2].metrics[3].value}`,
            `STAGE 04: [Production]    ${activeInvoice.stages[3].routeCardNo} | ${activeInvoice.stages[3].inhouseOps.length} Inhouse Ops + Subcontract Heat Treat`,
            `STAGE 05: [GRN Tracking]  ${activeInvoice.stages[4].metrics[0].value} (Dt: ${activeInvoice.stages[4].metrics[1].value}) | Mat Qty: ${activeInvoice.stages[4].metrics[2].value} ${activeInvoice.stages[4].metrics[3].value}`,
            `STAGE 06: [Supplier]      ${activeInvoice.stages[5].metrics[0].value} | PO: ${activeInvoice.stages[5].metrics[1].value} (Dt: ${activeInvoice.stages[5].metrics[2].value}) | Qty: ${activeInvoice.stages[5].metrics[3].value} ${activeInvoice.stages[5].metrics[4].value}`,
            `------------------------------------------------------------------------`,
            `Status: Complete End-to-End Quality Traceability Verified & Compliant.`,
            `Standard: ISO 9001:2015 & IATF 16949:2016 Certified Audit Trail.`,
            `========================================================================`
        ].join("\n");

        if (navigator && navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2400);
            }).catch(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2400);
            });
        } else {
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
        }
    };

    const renderStageIcon = (iconName, color, size = 18) => {
        const props = { size, style: { color, flexShrink: 0 } };
        switch (iconName) {
            case "FileSpreadsheet": return <FileSpreadsheet {...props} />;
            case "Truck": return <Truck {...props} />;
            case "CheckCheck": return <CheckCheck {...props} />;
            case "Factory": return <Factory {...props} />;
            case "Package": return <Package {...props} />;
            case "Beaker": return <Beaker {...props} />;
            case "Building2": return <Building2 {...props} />;
            default: return <ShieldCheck {...props} />;
        }
    };

    const getStageSnippet = (stage) => {
        switch (stage.step) {
            case 1: {
                const poMetric = stage.metrics.find((m) => m.label === "Customer PO Ref");
                return {
                    primary: `${activeInvoice.billedQty} • ${activeInvoice.totalValue}`,
                    secondary: poMetric ? `PO: ${poMetric.value}` : "Commercial Release"
                };
            }
            case 2: {
                const veh = stage.metrics.find((m) => m.label === "Vehicle Number");
                const transp = stage.metrics.find((m) => m.label === "Transporter Name");
                return {
                    primary: veh ? veh.value : stage.badge,
                    secondary: transp ? transp.value : "Dispatched"
                };
            }
            case 3:
                return {
                    primary: "100% Passed (Zero Defect)",
                    secondary: "350 Bar Hydro • Metrology OK"
                };
            case 4:
                return {
                    primary: `${stage.inhouseOps.length} Inhouse + 2 Subcontract`,
                    secondary: "Heat Treat 59.5 HRC • Chrome Plating"
                };
            case 5: {
                const qty = stage.metrics.find((m) => m.label === "Material Qty")?.value || "";
                const uom = stage.metrics.find((m) => m.label === "Uom")?.value || "";
                return {
                    primary: qty ? `${qty} ${uom}` : "Inward Material",
                    secondary: `GRN: ${stage.badge} • Inward Verified`
                };
            }
            case 6: {
                const supp = stage.metrics.find((m) => m.label === "Supplier / Mill Name")?.value || "";
                const poRef = stage.metrics.find((m) => m.label === "Raw Material PO Ref")?.value || "";
                const poDate = stage.metrics.find((m) => m.label === "Po Date")?.value || "";
                return {
                    primary: supp,
                    secondary: poRef ? `${poRef} • ${poDate}` : "Approved Tier-1 Mill"
                };
            }
            default:
                return { primary: "Verified", secondary: "Quality Passed" };
        }
    };

    return (
        <div className="qa2-card qa2-card-premium qa2-animate qa2-d3 qa2-timeline-container" id="quality-timeline-section">
            {/* ── Section Header ── */}
            <div className="qa2-timeline-header">
                <div className="qa2-timeline-header-left">
                    <div className="qa2-timeline-icon-box">
                        <Layers size={22} className="qa2-timeline-main-icon" />
                    </div>
                    <div>
                        <div className="qa2-timeline-title-row">
                            <h2 className="qa2-timeline-title">Quality Timeline</h2>
                            {/* <span className="qa2-timeline-live-pill">
                                <span className="qa2-timeline-pulse-dot" />
                                Single Row Pipeline View
                            </span> */}
                            {/* <span className="qa2-timeline-iso-badge">
                                <Award size={13} style={{ strokeWidth: 2.2 }} />
                                ISO 9001 & IATF 16949
                            </span> */}
                        </div>
                        <p className="qa2-timeline-subtitle">
                            Continuous 6-stage quality lineage from customer invoice to raw material mill. Click any stage to inspect complete details.
                        </p>
                    </div>
                </div>

                {/* ── Top Header Actions: Search ── */}
                <div className="qa2-timeline-header-right">
                    <div className="qa2-timeline-search-box">
                        <Search size={14} className="qa2-timeline-search-icon" />
                        <input
                            type="text"
                            placeholder="Filter invoice / part..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="qa2-timeline-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="qa2-timeline-search-clear"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Unified Hierarchical Selector Dropdown (Invoice + Part No Combined) ── */}
            <div className="qa2-timeline-selector-strip">
                <div className="qa2-timeline-strip-label">
                    <Sparkles size={14} style={{ color: "#f59e0b" }} />
                    <span>Select Invoice:</span>
                </div>

                <div className="qa2-timeline-dropdown-wrapper" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        className={`qa2-timeline-dropdown-trigger ${dropdownOpen ? "active" : ""}`}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="listbox"
                        title="Click to switch active traceability invoice"
                    >
                        <div className="qa2-timeline-dropdown-trigger-left">
                            <span className="qa2-timeline-dropdown-pill">{activeInvoice.id}</span>
                            <span className="qa2-timeline-dropdown-cust" title={activeInvoice.customer}>
                                {activeInvoice.customer}
                            </span>
                            <span className="qa2-timeline-dropdown-sep">•</span>
                            <span className="qa2-timeline-dropdown-val">{activeInvoice.totalValue}</span>
                            <span className="qa2-timeline-dropdown-multi-pill">
                                {activePartsList.length} {activePartsList.length === 1 ? "Part" : "Parts"}
                            </span>
                        </div>
                        <div className="qa2-timeline-dropdown-trigger-right">
                            <ChevronDown size={14} className={`qa2-timeline-dropdown-chevron ${dropdownOpen ? "open" : ""}`} />
                        </div>
                    </button>

                    {dropdownOpen && (
                        <div className="qa2-timeline-dropdown-popover" role="listbox">
                            {/* Integrated Search on Dropdown */}
                            <div className="qa2-dropdown-search-wrap">
                                <Search size={14} className="qa2-dropdown-search-icon" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search invoice no, customer, part..."
                                    className="qa2-dropdown-search-input"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery("");
                                            searchInputRef.current?.focus();
                                        }}
                                        className="qa2-dropdown-search-clear"
                                        title="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="qa2-timeline-dropdown-popover-header">
                                <span className="qa2-dropdown-header-title">
                                    {searchQuery ? `Matching Invoices (${filteredInvoices.length})` : "Select Traceability Invoice"}
                                </span>
                                <span className="qa2-dropdown-header-badge">
                                    {filteredInvoices.length} Invoices Available
                                </span>
                            </div>

                            <div className="qa2-timeline-dropdown-popover-list">
                                {filteredInvoices.length === 0 ? (
                                    <div className="qa2-dropdown-empty">
                                        No invoice found matching &ldquo;{searchQuery}&rdquo;
                                    </div>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const isSelected = inv.id === activeInvoice.id;
                                        const invParts = getInvoiceParts(inv);

                                        return (
                                            <button
                                                key={inv.id}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => handleSelectInvoice(inv.id)}
                                                className={`qa2-timeline-inv-item ${isSelected ? "selected" : ""}`}
                                            >
                                                <div className="qa2-inv-col-id">
                                                    <FileSpreadsheet size={14} className="qa2-inv-icon" />
                                                    <span className="qa2-inv-id-text">{inv.id}</span>
                                                </div>

                                                <div className="qa2-inv-col-cust" title={inv.customer}>
                                                    <span className="qa2-inv-cust-text">{inv.customer}</span>
                                                    <span className={`qa2-inv-parts-badge ${invParts.length > 1 ? "multi" : "single"}`}>
                                                        {invParts.length} {invParts.length === 1 ? "Part" : "Parts"}
                                                    </span>
                                                </div>

                                                <div className="qa2-inv-col-amt">
                                                    <span className="qa2-inv-amt-text">{inv.totalValue}</span>
                                                </div>

                                                <div className="qa2-inv-col-check">
                                                    {isSelected ? (
                                                        <span className="qa2-dropdown-check-circle">
                                                            <Check size={12} strokeWidth={3} />
                                                        </span>
                                                    ) : (
                                                        <span className="qa2-part-check-placeholder" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active Invoice & Part Overview Card ── */}
            <div className="qa2-timeline-overview-card">
                <div className="qa2-timeline-overview-left">
                    <div className="qa2-timeline-overview-badge-row">
                        <span className="qa2-timeline-ov-badge-inv">{activeInvoice.id}</span>
                        <span className="qa2-timeline-ov-badge-part">{activePart.partNo}</span>
                    </div>

                    <div className="qa2-timeline-overview-part">
                        <span className="qa2-timeline-ov-partno">{activePart.partNo}</span>
                        <span className="qa2-timeline-ov-desc">{activePart.partDescription}</span>
                    </div>

                    {/* Billed Line Items Quick-Selector */}
                    {activePartsList.length > 0 && (
                        <div className="qa2-inline-parts-bar">
                            <span className="qa2-inline-parts-label">Billed Line Items:</span>
                            {activePartsList.length > 3 ? (
                                <div className="qa2-inline-parts-dropdown-wrap" ref={lineItemDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setLineItemDropdownOpen((prev) => !prev)}
                                        className={`qa2-inline-parts-dropdown-trigger ${lineItemDropdownOpen ? "active" : ""}`}
                                        aria-expanded={lineItemDropdownOpen}
                                        title="Click to select line item"
                                    >
                                        <div className="qa2-parts-dd-trigger-left">
                                            <span className="qa2-parts-dd-badge">
                                                Item {activePartsList.findIndex((p) => p.partNo === activePart.partNo) + 1} of {activePartsList.length}
                                            </span>
                                            <span className="qa2-parts-dd-partno">{activePart.partNo}</span>
                                            <span className="qa2-parts-dd-sep">•</span>
                                            <span className="qa2-parts-dd-desc" title={activePart.partDescription}>
                                                {activePart.partDescription}
                                            </span>
                                            <span className="qa2-parts-dd-qty">
                                                ({activePart.billedQty}{activePart.partValue ? ` • ${activePart.partValue}` : ""})
                                            </span>
                                        </div>
                                        <ChevronDown size={14} className={`qa2-parts-dd-chevron ${lineItemDropdownOpen ? "open" : ""}`} />
                                    </button>

                                    {lineItemDropdownOpen && (
                                        <div className="qa2-inline-parts-dropdown-popover" role="listbox">
                                            <div className="qa2-parts-dd-popover-header">
                                                <span className="qa2-parts-dd-popover-title">Select Billed Line Item</span>
                                                <span className="qa2-parts-dd-count-pill">{activePartsList.length} Items</span>
                                            </div>
                                            <div className="qa2-parts-dd-popover-list">
                                                {activePartsList.map((p, idx) => {
                                                    const isPartActive = p.partNo === activePart.partNo;
                                                    return (
                                                        <button
                                                            key={p.partNo}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isPartActive}
                                                            onClick={() => {
                                                                setSelectedPartNo(p.partNo);
                                                                setLineItemDropdownOpen(false);
                                                            }}
                                                            className={`qa2-parts-dd-item ${isPartActive ? "selected" : ""}`}
                                                        >
                                                            <div className="qa2-parts-dd-item-left">
                                                                <div className="qa2-parts-dd-item-top">
                                                                    <span className="qa2-parts-dd-item-idx">Item {idx + 1}:</span>
                                                                    <span className="qa2-parts-dd-item-partno">{p.partNo}</span>
                                                                    <span className="qa2-parts-dd-item-qty">({p.billedQty})</span>
                                                                    {p.partValue && (
                                                                        <span className="qa2-parts-dd-item-val">{p.partValue}</span>
                                                                    )}
                                                                </div>
                                                                <div className="qa2-parts-dd-item-desc">
                                                                    {p.partDescription}
                                                                </div>
                                                            </div>
                                                            <div className="qa2-parts-dd-item-check">
                                                                {isPartActive && (
                                                                    <span className="qa2-dropdown-check-circle">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="qa2-inline-parts-pills">
                                    {activePartsList.map((p, idx) => {
                                        const isPartActive = p.partNo === activePart.partNo;
                                        return (
                                            <button
                                                key={p.partNo}
                                                type="button"
                                                onClick={() => setSelectedPartNo(p.partNo)}
                                                className={`qa2-inline-part-pill ${isPartActive ? "active" : ""}`}
                                                title={`Select line item: ${p.partNo} — ${p.partDescription}`}
                                            >
                                                <span className="pill-index">Item {idx + 1}:</span>
                                                <span className="pill-part">{p.partNo}</span>
                                                <span className="pill-qty">({p.billedQty}{p.partValue ? ` • ${p.partValue}` : ""})</span>
                                                {isPartActive && <span className="pill-dot" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="qa2-timeline-overview-stats">
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Customer</span>
                        <span className="qa2-timeline-stat-val text-truncate" title={activeInvoice.customer}>
                            {activeInvoice.customer}
                        </span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Billed Qty</span>
                        <span className="qa2-timeline-stat-val">{activePart.billedQty}</span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Part Value</span>
                        <span className="qa2-timeline-stat-val stat-green">{activePart.partValue || activeInvoice.totalValue}</span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Part No</span>
                        <span className="qa2-timeline-stat-val text-mono">{activePart.partNo}</span>
                    </div>
                </div>
            </div>

            {/* ── SINGLE ROW PIPELINE VIEW (6 Interconnected Stages) ── */}
            <div className="qa2-timeline-single-row-wrap">
                <div className="qa2-timeline-row-caption">
                    <span className="qa2-timeline-row-caption-title">
                        End-to-End Traceability Stream (Click any stage to inspect detailed particulars):
                    </span>
                    <span className="qa2-timeline-row-caption-hint">
                        Single Row Sequential View • 6 Stages
                    </span>
                </div>

                <div className="qa2-timeline-single-row-pipeline">
                    {activeStages.map((stage, idx) => {
                        const snippet = getStageSnippet(stage);
                        const isLast = idx === activeInvoice.stages.length - 1;

                        return (
                            <div key={stage.step} className="qa2-timeline-pipe-step-wrapper">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(stage.step)}
                                    className={`qa2-timeline-pipe-card stage-${stage.key}`}
                                    title={`Click to view detailed particulars for ${stage.title}`}
                                >
                                    {/* Card Top Row: Step badge & Icon */}
                                    <div className="qa2-timeline-pipe-top">
                                        <div className="qa2-timeline-pipe-badge-wrap">
                                            <span
                                                className="qa2-timeline-pipe-step-num"
                                                style={{ background: stage.accentColor }}
                                            >
                                                0{stage.step}
                                            </span>
                                            <span
                                                className="qa2-timeline-pipe-step-pill"
                                                style={{ background: `${stage.accentColor}15`, color: stage.accentColor }}
                                            >
                                                Stage 0{stage.step}
                                            </span>
                                        </div>
                                        <div
                                            className="qa2-timeline-pipe-icon-bubble"
                                            style={{ background: `${stage.accentColor}12`, borderColor: `${stage.accentColor}35` }}
                                        >
                                            {renderStageIcon(stage.iconName, stage.accentColor, 17)}
                                        </div>
                                    </div>

                                    {/* Stage Title */}
                                    <div className="qa2-timeline-pipe-title" title={stage.title}>
                                        {stage.title}
                                    </div>

                                    {/* Particular Identifier Badge */}
                                    <div
                                        className="qa2-timeline-pipe-id-badge"
                                        style={{ background: `${stage.badgeColor}15`, color: stage.badgeColor }}
                                    >
                                        {stage.badge}
                                    </div>

                                    {/* Snippet Particular Highlights */}
                                    <div className="qa2-timeline-pipe-snippet">
                                        <div className="qa2-timeline-pipe-snippet-primary" title={snippet.primary}>
                                            {snippet.primary}
                                        </div>
                                        <div className="qa2-timeline-pipe-snippet-secondary" title={snippet.secondary}>
                                            {snippet.secondary}
                                        </div>
                                    </div>

                                    {/* Bottom Action / View Details Pill */}
                                    <div className="qa2-timeline-pipe-bottom">
                                        <span className="qa2-timeline-pipe-verified">
                                            <CheckCircle2 size={11} style={{ color: "#10b981" }} />
                                            <span>Verified</span>
                                        </span>
                                        <span className="qa2-timeline-pipe-action-btn">
                                            <span>Inspect</span>
                                            <ArrowUpRight size={12} />
                                        </span>
                                    </div>
                                </button>

                                {/* Interconnecting Directional Arrow (Between Steps) */}
                                {!isLast && (
                                    <div className="qa2-timeline-pipe-connector" aria-hidden="true">
                                        <ChevronRight size={18} className="qa2-timeline-pipe-arrow-icon" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── DETAILED MODAL / POPUP (Opens on Click via Portal) ── */}
            {selectedStageModal !== null && modalStageData && createPortal(
                <div
                    className="qa2-timeline-modal-overlay"
                    onClick={() => setSelectedStageModal(null)}
                >
                    <div
                        className="qa2-timeline-modal-box"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Stage colored top accent bar */}
                        <div
                            className="qa2-timeline-modal-top-accent"
                            style={{ background: modalStageData.accentColor }}
                        />

                        {/* Modal Header */}
                        <div className="qa2-timeline-modal-header">
                            <div className="qa2-timeline-modal-header-left">
                                <div
                                    className="qa2-timeline-modal-icon-bubble"
                                    style={{
                                        background: `${modalStageData.accentColor}15`,
                                        borderColor: `${modalStageData.accentColor}35`,
                                        color: modalStageData.accentColor
                                    }}
                                >
                                    {renderStageIcon(modalStageData.iconName, modalStageData.accentColor, 22)}
                                </div>
                                <div className="qa2-timeline-modal-header-text">
                                    <div className="qa2-timeline-modal-title-row">
                                        <span
                                            className="qa2-timeline-modal-step-badge"
                                            style={{
                                                background: modalStageData.accentColor,
                                                color: "#ffffff"
                                            }}
                                        >
                                            STAGE 0{modalStageData.step} OF 06
                                        </span>
                                        <h3 className="qa2-timeline-modal-title">{modalStageData.title}</h3>
                                        <span
                                            className="qa2-timeline-modal-id-pill"
                                            style={{
                                                background: `${modalStageData.badgeColor}15`,
                                                color: modalStageData.badgeColor
                                            }}
                                        >
                                            {modalStageData.badge}
                                        </span>
                                        <span className="qa2-timeline-modal-part-badge">
                                            Part: {activePart.partNo}
                                        </span>
                                    </div>
                                    <p className="qa2-timeline-modal-sub">
                                        {modalStageData.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="qa2-timeline-modal-header-right">
                                <span className="qa2-timeline-modal-verified-tag">
                                    <ShieldCheck size={15} style={{ color: "#10b981" }} />
                                    <span>Quality Verified</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(null)}
                                    className="qa2-timeline-modal-close-btn"
                                    title="Close dialog (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Complete In-Depth Breakdown */}
                        <div className="qa2-timeline-modal-body">
                            {/* Key Metrics Grid */}
                            {modalStageData.metrics && modalStageData.metrics.length > 0 && (
                                <div className="qa2-timeline-modal-metrics-section">
                                    <div className="qa2-timeline-inner-title">
                                        <FileText size={16} style={{ color: modalStageData.accentColor }} />
                                        <span>Key Parameters & Record Particulars</span>
                                    </div>
                                    <div className="qa2-timeline-metrics-grid">
                                        {modalStageData.metrics.map((m, mIdx) => (
                                            <div
                                                key={mIdx}
                                                className={`qa2-timeline-metric-tile ${m.highlight ? "highlight" : ""}`}
                                            >
                                                <span className="qa2-timeline-metric-label">{m.label}</span>
                                                <span className={`qa2-timeline-metric-value ${m.highlight ? "val-strong" : ""}`}>
                                                    {m.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 3: Process & Route Card Inspection Table */}
                            {modalStageData.key === "finalInsp" && modalStageData.inspectionRecords && (
                                <div className="qa2-timeline-dimension-box">
                                    <div className="qa2-timeline-inner-title">
                                        <div className="qa2-timeline-title-with-pill">
                                            <CheckCheck size={16} style={{ color: "#059669" }} />
                                            <span>Process & Route Card Inspection Report</span>
                                        </div>
                                        <span className="qa2-timeline-badge-count" style={{ background: "#ecfdf5", color: "#047857" }}>
                                            {modalStageData.inspectionRecords.length} Operations Verified
                                        </span>
                                    </div>
                                    <div className="qa2-timeline-table-wrapper">
                                        <table className="qa2-timeline-dim-table qa2-routecard-insp-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Routecard No</th>
                                                    <th>Operation / Process</th>
                                                    <th>Machine</th>
                                                    <th>Shift</th>
                                                    <th style={{ textAlign: "right" }}>Total Qty</th>
                                                    <th style={{ textAlign: "right" }}>Inspected Qty</th>
                                                    <th style={{ textAlign: "right" }}>OK Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rej Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rw Qty</th>
                                                    <th>Inspected By</th>
                                                    <th style={{ textAlign: "center" }}>Verdict</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modalStageData.inspectionRecords.map((rec, rIdx) => (
                                                    <tr key={rIdx}>
                                                        <td className="text-slate-400 font-mono text-xs">{rIdx + 1}</td>
                                                        <td className="font-mono text-xs font-bold text-blue-600">{rec.routeCard}</td>
                                                        <td className="font-medium text-slate-800" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                            <span className="qa2-timeline-op-badge" style={{ marginRight: 6, fontSize: "0.68rem", padding: "1px 6px" }}>{rec.op}</span>
                                                            {rec.process}
                                                        </td>
                                                        <td className="text-slate-600 text-xs" style={{ fontFamily: "var(--qa-font-body)" }}>{rec.machine}</td>
                                                        <td className="text-slate-500 text-xs" style={{ fontFamily: "var(--qa-font-body)" }}>{rec.shift}</td>
                                                        <td className="font-mono text-right text-slate-700 font-semibold">{rec.totQty}</td>
                                                        <td className="font-mono text-right text-blue-700 font-bold">{rec.inspQty}</td>
                                                        <td className="font-mono text-right text-emerald-600 font-bold">{rec.okQty}</td>
                                                        <td className="font-mono text-right text-slate-400 font-medium">{rec.rejQty}</td>
                                                        <td className="font-mono text-right text-slate-400 font-medium">{rec.rwQty}</td>
                                                        <td className="text-slate-700 text-xs font-medium" style={{ fontFamily: "var(--qa-font-body)" }}>{rec.inspectedBy}</td>
                                                        <td style={{ textAlign: "center" }}>
                                                            <span className="qa2-timeline-pass-tag">
                                                                <Check size={11} strokeWidth={3} />
                                                                {rec.verdict}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 4: Production (Inhouse & Job Order) with Quality Insp - Unique & Distinctive Style */}
                            {modalStageData.key === "production" && (() => {
                                const inhouseList = (modalStageData.inhouseOps || []).map((op) => ({
                                    ...op,
                                    type: "inhouse",
                                    opNum: parseInt(op.op.replace(/\D/g, "") || "0", 10)
                                }));

                                const subcontractList = (modalStageData.jobOrder?.items || []).map((item) => ({
                                    ...item,
                                    type: "subcontract",
                                    vendorName: modalStageData.jobOrder.vendorName,
                                    subcontractDC: modalStageData.jobOrder.subcontractDC,
                                    inwardChallan: modalStageData.jobOrder.inwardChallan,
                                    opNum: parseInt(item.op.replace(/\D/g, "") || "0", 10)
                                }));

                                const allOpsSorted = [...inhouseList, ...subcontractList].sort((a, b) => a.opNum - b.opNum);

                                const filteredOps = allOpsSorted.filter((op) => {
                                    if (prodTab === "INHOUSE") return op.type === "inhouse";
                                    if (prodTab === "SUBCONTRACT") return op.type === "subcontract";
                                    return true;
                                });

                                return (
                                    <div className="qa2-prod-unique-container">
                                        {/* 1. Chronological Shopfloor Stepper Pipeline - 6 Aligned Steps */}
                                        <div className="qa2-prod-stepper-box">
                                            <div className="qa2-prod-stepper-title">
                                                <div className="qa2-timeline-title-with-pill">
                                                    <Factory size={16} style={{ color: "#d97706" }} />
                                                    <span className="qa2-stepper-heading">Manufacturing Process Flow & IPQA Verification Route</span>
                                                </div>
                                                <span className="qa2-prod-flow-hint">Chronological Routing (6 Operations)</span>
                                            </div>
                                            <div className="qa2-prod-stepper-flow">
                                                {allOpsSorted.map((stepItem, sIdx) => {
                                                    const isInhouse = stepItem.type === "inhouse";
                                                    return (
                                                        <div key={sIdx} className={`qa2-prod-step-node ${isInhouse ? "node-inhouse" : "node-subcontract"}`}>
                                                            <div className="qa2-step-node-top">
                                                                <span className="qa2-step-num">STEP 0{sIdx + 1}</span>
                                                                {isInhouse ? <Cpu size={12} className="qa2-step-ico inhouse" /> : <Flame size={12} className="qa2-step-ico subcontract" />}
                                                            </div>
                                                            <div className="qa2-step-node-op">{stepItem.op}</div>
                                                            <div className="qa2-step-node-sub">
                                                                <span className={`qa2-step-pill-tag ${isInhouse ? "pill-inhouse" : "pill-subcontract"}`}>
                                                                    {isInhouse ? "Inhouse CNC" : "Subcontract"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 2. Interactive Navigation & View Switcher */}
                                        <div className="qa2-prod-action-bar">
                                            <div className="qa2-prod-filter-tabs">
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn ${prodTab === "ALL" ? "active" : ""}`}
                                                    onClick={() => setProdTab("ALL")}
                                                >
                                                    <Layers size={15} />
                                                    <span>All Operations</span>
                                                    <span className="qa2-tab-count">{allOpsSorted.length}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn inhouse ${prodTab === "INHOUSE" ? "active" : ""}`}
                                                    onClick={() => setProdTab("INHOUSE")}
                                                >
                                                    <Cpu size={15} />
                                                    <span>Inhouse CNC</span>
                                                    <span className="qa2-tab-count inhouse">{inhouseList.length}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn subcontract ${prodTab === "SUBCONTRACT" ? "active" : ""}`}
                                                    onClick={() => setProdTab("SUBCONTRACT")}
                                                >
                                                    <Flame size={15} />
                                                    <span>Subcontract Job Order</span>
                                                    <span className="qa2-tab-count subcontract">{subcontractList.length}</span>
                                                </button>
                                            </div>

                                            <div className="qa2-prod-count-badge">
                                                <span>{filteredOps.length} Operations Listed</span>
                                            </div>
                                        </div>

                                        {/* Process & Route Card Inspection Sheet Table */}
                                        <div className="qa2-timeline-table-wrapper" style={{ marginTop: 12 }}>
                                            <table className="qa2-timeline-dim-table qa2-prod-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: "40px" }}>#</th>
                                                        <th style={{ width: "110px" }}>Op Code</th>
                                                        <th style={{ width: "130px" }}>Category</th>
                                                        <th>Process / Routing Description</th>
                                                        <th>Station / Subcontractor</th>
                                                        <th>Operator / Challan</th>
                                                        <th>IPQA Slip / Cert</th>
                                                        <th>In-Process Quality Finding / Criteria</th>
                                                        <th style={{ textAlign: "center", width: "90px" }}>Verdict</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredOps.map((op, tIdx) => {
                                                        const isInhouse = op.type === "inhouse";
                                                        return (
                                                            <tr key={tIdx}>
                                                                <td className="text-slate-400 font-mono text-xs">{tIdx + 1}</td>
                                                                <td className="font-mono text-xs font-bold text-amber-600">
                                                                    {op.op}
                                                                </td>
                                                                <td>
                                                                    <span className={`qa2-prod-table-badge ${isInhouse ? "badge-inhouse" : "badge-subcontract"}`}>
                                                                        {isInhouse ? "Inhouse CNC" : "Subcontract"}
                                                                    </span>
                                                                </td>
                                                                <td className="font-medium text-slate-800" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                                    {op.process}
                                                                </td>
                                                                <td className="text-slate-700 text-xs" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                                    {isInhouse ? op.machine : op.vendorName}
                                                                </td>
                                                                <td className="text-slate-600 text-xs font-mono">
                                                                    {isInhouse ? op.operator : `${op.subcontractDC} / ${op.inwardChallan}`}
                                                                </td>
                                                                <td className="font-mono text-xs font-semibold text-slate-700">
                                                                    {isInhouse ? op.ipqa : op.cert}
                                                                </td>
                                                                <td className="text-xs">
                                                                    <span className={`qa2-prod-table-qa-pill ${isInhouse ? "qa-inhouse" : "qa-subcontract"}`}>
                                                                        {isInhouse ? op.keyMetric : op.specs}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <span className="qa2-timeline-pass-tag">
                                                                        <Check size={11} strokeWidth={3} />
                                                                        {op.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Specific Deep Dive for Stage 5: GRN Inward Quality Inspection & Clearance Table */}
                            {(modalStageData.key === "grn" || modalStageData.key === "grnMtc") && (
                                <div className="qa2-timeline-dimension-box">
                                    <div className="qa2-timeline-inner-title">
                                        <div className="qa2-timeline-title-with-pill">
                                            <Package size={16} style={{ color: "#0891b2" }} />
                                            <span>GRN Inward Inspection & Clearance Details</span>
                                        </div>
                                        <span className="qa2-timeline-badge-count" style={{ background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}>
                                            {(modalStageData.grnRecords || []).length || 1} Record Verified
                                        </span>
                                    </div>
                                    <div className="qa2-timeline-table-wrapper">
                                        <table className="qa2-timeline-dim-table qa2-grn-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "40px" }}>#</th>
                                                    <th>GRN Number</th>
                                                    <th>GRN Inward Date</th>
                                                    <th style={{ textAlign: "right" }}>Material Qty</th>
                                                    <th style={{ textAlign: "center", width: "70px" }}>UOM</th>
                                                    <th style={{ textAlign: "right" }}>OK Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rej Qty</th>
                                                    <th>Insp By</th>
                                                    <th style={{ textAlign: "center", width: "90px" }}>Verdict</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {((modalStageData.grnRecords && modalStageData.grnRecords.length > 0)
                                                    ? modalStageData.grnRecords
                                                    : [
                                                        {
                                                            grnNo: modalStageData.metrics?.find((m) => m.label === "GRN Number")?.value || modalStageData.badge,
                                                            grnDate: modalStageData.metrics?.find((m) => m.label === "GRN Inward Date")?.value || "18-Feb-2026",
                                                            materialQty: modalStageData.metrics?.find((m) => m.label === "Material Qty")?.value || "4,850",
                                                            uom: modalStageData.metrics?.find((m) => m.label === "Uom")?.value || "Kg",
                                                            okQty: modalStageData.metrics?.find((m) => m.label === "Material Qty")?.value || "4,850",
                                                            rejQty: "0",
                                                            inspBy: "R. Vignesh",
                                                            verdict: "PASS"
                                                        }
                                                    ]
                                                ).map((rec, gIdx) => (
                                                    <tr key={gIdx}>
                                                        <td className="text-slate-400 font-mono text-xs">{gIdx + 1}</td>
                                                        <td className="font-mono text-xs font-bold text-cyan-700">
                                                            {rec.grnNo}
                                                        </td>
                                                        <td className="font-mono text-xs font-semibold text-slate-700">
                                                            {rec.grnDate}
                                                        </td>
                                                        <td className="font-mono text-right text-slate-900 font-bold text-xs">
                                                            {rec.materialQty}
                                                        </td>
                                                        <td className="font-mono text-center text-slate-700 font-semibold text-xs">
                                                            <span className="qa2-grn-uom-badge">{rec.uom}</span>
                                                        </td>
                                                        <td className="font-mono text-right text-emerald-600 font-bold text-xs">
                                                            {rec.okQty}
                                                        </td>
                                                        <td className="font-mono text-right text-slate-400 font-medium text-xs">
                                                            {rec.rejQty}
                                                        </td>
                                                        <td className="text-slate-800 text-xs font-semibold" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                            {rec.inspBy}
                                                        </td>
                                                        <td style={{ textAlign: "center" }}>
                                                            <span className="qa2-timeline-pass-tag">
                                                                <Check size={11} strokeWidth={3} />
                                                                {rec.verdict || "PASS"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 6: Supplier Purchase Order & Mill Lineage Table */}
                            {modalStageData.key === "supplier" && (
                                <>
                                    <div className="qa2-timeline-dimension-box" style={{ marginBottom: 16 }}>
                                        <div className="qa2-timeline-inner-title">
                                            <div className="qa2-timeline-title-with-pill">
                                                <Building2 size={16} style={{ color: "#db2777" }} />
                                                <span>Raw Material Mill Procurement & Purchase Order Lineage</span>
                                            </div>
                                            <span className="qa2-timeline-badge-count" style={{ background: "#fdf2f8", color: "#9d174d", border: "1px solid #fbcfe8" }}>
                                                Tier-1 Certified Mill
                                            </span>
                                        </div>
                                        <div className="qa2-timeline-table-wrapper">
                                            <table className="qa2-timeline-dim-table qa2-supplier-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: "40px" }}>#</th>
                                                        <th>Supplier / Mill Name</th>
                                                        <th>Raw Material PO Ref</th>
                                                        <th>PO Date</th>
                                                        <th style={{ textAlign: "right" }}>Qty</th>
                                                        <th style={{ textAlign: "center", width: "70px" }}>UOM</th>
                                                        <th style={{ textAlign: "center", width: "120px" }}>Approval Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {((modalStageData.supplierRecords && modalStageData.supplierRecords.length > 0)
                                                        ? modalStageData.supplierRecords
                                                        : [
                                                            {
                                                                supplierName: modalStageData.metrics?.find((m) => m.label === "Supplier / Mill Name")?.value || "Jindal Steel & Seamless Tubes Ltd",
                                                                poRef: modalStageData.metrics?.find((m) => m.label === "Raw Material PO Ref")?.value || "PO-RM-2026-0812",
                                                                poDate: modalStageData.metrics?.find((m) => m.label === "Po Date")?.value || "05-Feb-2026",
                                                                qty: modalStageData.metrics?.find((m) => m.label === "Qty")?.value || "4,850",
                                                                uom: modalStageData.metrics?.find((m) => m.label === "Uom")?.value || "Kg",
                                                                status: "APPROVED TIER-1"
                                                            }
                                                        ]
                                                    ).map((rec, sIdx) => (
                                                        <tr key={sIdx}>
                                                            <td className="text-slate-400 font-mono text-xs">{sIdx + 1}</td>
                                                            <td className="font-semibold text-slate-900" style={{ fontFamily: "var(--qa-font-heading)" }}>
                                                                {rec.supplierName}
                                                            </td>
                                                            <td className="font-mono text-xs font-bold text-pink-700">
                                                                {rec.poRef}
                                                            </td>
                                                            <td className="font-mono text-xs font-semibold text-slate-700">
                                                                {rec.poDate}
                                                            </td>
                                                            <td className="font-mono text-right text-slate-900 font-bold text-xs">
                                                                {rec.qty}
                                                            </td>
                                                            <td className="font-mono text-center text-slate-700 font-semibold text-xs">
                                                                <span className="qa2-grn-uom-badge">{rec.uom}</span>
                                                            </td>
                                                            <td style={{ textAlign: "center" }}>
                                                                <span className="qa2-timeline-pass-tag">
                                                                    <Check size={11} strokeWidth={3} />
                                                                    {rec.status || "APPROVED"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 3 Dedicated High-Contrast KPI Cards: Vendor Rating, Rejection PPM, Traceability */}
                                    <div className="qa2-supp-kpi-grid">
                                        {/* 1. Vendor Rating Tile */}
                                        <div className="qa2-supp-kpi-card kpi-emerald">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-emerald">
                                                    <Award size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-emerald">Vendor Rating</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-emerald">
                                                {modalStageData.vendorRating || "98.5% Grade A"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-emerald">
                                                <span>Tier-1 Preferred Mill</span>
                                            </div>
                                        </div>

                                        {/* 2. Rejection PPM Tile */}
                                        <div className="qa2-supp-kpi-card kpi-blue">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-blue">
                                                    <ShieldCheck size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-blue">Rejection PPM</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-blue">
                                                {modalStageData.rejectionPpm || "0 PPM (Zero Defect)"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-blue">
                                                <span>100% Acceptance Rate</span>
                                            </div>
                                        </div>

                                        {/* 3. Traceability Tile */}
                                        <div className="qa2-supp-kpi-card kpi-purple">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-purple">
                                                    <CheckCheck size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-purple">Traceability</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-purple">
                                                {modalStageData.traceability || "100% Heat Lot Matched"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-purple">
                                                <span>Full Billet-to-Bar Lineage</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Stage Footnote / Auditor Notes */}
                            {modalStageData.notes && (
                                <div className="qa2-timeline-card-footnote">
                                    <Info size={14} style={{ color: "#64748b", flexShrink: 0, marginTop: "2px" }} />
                                    <span>{modalStageData.notes}</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer with Stepper & Next/Prev Controls */}
                        <div className="qa2-timeline-modal-footer">
                            <div className="qa2-timeline-modal-nav-pills">
                                {activeInvoice.stages.map((s) => (
                                    <button
                                        key={s.step}
                                        type="button"
                                        onClick={() => setSelectedStageModal(s.step)}
                                        className={`qa2-timeline-modal-pill-btn ${s.step === selectedStageModal ? "active" : ""}`}
                                        title={`Jump to Stage 0${s.step}: ${s.title}`}
                                        style={s.step === selectedStageModal ? { background: s.accentColor, borderColor: s.accentColor } : {}}
                                    >
                                        <span>0{s.step}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="qa2-timeline-modal-nav-actions">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(selectedStageModal - 1)}
                                    disabled={selectedStageModal <= 1}
                                    className="qa2-timeline-modal-nav-btn"
                                >
                                    <ChevronLeft size={14} />
                                    <span>Prev Stage</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(selectedStageModal + 1)}
                                    disabled={selectedStageModal >= 6}
                                    className="qa2-timeline-modal-nav-btn"
                                >
                                    <span>Next Stage</span>
                                    <ChevronRight size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(null)}
                                    className="qa2-timeline-modal-done-btn"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
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
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const customerRef = useRef(null);
    const [selectedType, setSelectedType] = useState("ALL");
    const [tableInspNoSearch, setTableInspNoSearch] = useState("");
    const [tableCustomerSearch, setTableCustomerSearch] = useState("");
    const [tableSelectedCustomers, setTableSelectedCustomers] = useState([]);
    const [tableCustomerDropdownOpen, setTableCustomerDropdownOpen] = useState(false);
    const tableCustomerRef = useRef(null);
    const [tablePartNoDescSearch, setTablePartNoDescSearch] = useState("");
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
    const [selectedSuppliers, setSelectedSuppliers] = useState(null);
    const [selectedGrnNos, setSelectedGrnNos] = useState(null);
    const [selectedItems, setSelectedItems] = useState(null);
    const [selectedComplaintIds, setSelectedComplaintIds] = useState(null);
    const [selectedComplaintCustomers, setSelectedComplaintCustomers] = useState(null);
    const [selectedComplaintProducts, setSelectedComplaintProducts] = useState(null);
    const [selectedTraceInspNos, setSelectedTraceInspNos] = useState(null);
    const [selectedTraceMachineNos, setSelectedTraceMachineNos] = useState(null);
    const [selectedTracePartNos, setSelectedTracePartNos] = useState(null);

    // Rejection Analytics Trend Filters (Customer & Part)
    const [trendRejCustFilter, setTrendRejCustFilter] = useState([]);
    const [trendRejCustDropdownOpen, setTrendRejCustDropdownOpen] = useState(false);
    const [trendRejCustSearch, setTrendRejCustSearch] = useState("");
    const trendRejCustRef = useRef(null);
    const [trendRejPartFilter, setTrendRejPartFilter] = useState([]);
    const [trendRejPartDropdownOpen, setTrendRejPartDropdownOpen] = useState(false);
    const [trendRejPartSearch, setTrendRejPartSearch] = useState("");
    const trendRejPartRef = useRef(null);

    // Rework Analytics Trend Filters (Customer & Part)
    const [trendRwkCustFilter, setTrendRwkCustFilter] = useState([]);
    const [trendRwkCustDropdownOpen, setTrendRwkCustDropdownOpen] = useState(false);
    const [trendRwkCustSearch, setTrendRwkCustSearch] = useState("");
    const trendRwkCustRef = useRef(null);
    const [trendRwkPartFilter, setTrendRwkPartFilter] = useState([]);
    const [trendRwkPartDropdownOpen, setTrendRwkPartDropdownOpen] = useState(false);
    const [trendRwkPartSearch, setTrendRwkPartSearch] = useState("");
    const trendRwkPartRef = useRef(null);

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

    const rawSupplierRejections = useMemo(() => {
        if (Array.isArray(supplierData?.results)) return supplierData.results;
        if (Array.isArray(supplierData)) return supplierData;
        return SUPPLIER_REJECTIONS;
    }, [supplierData]);

    const allSupplierOptions = useMemo(() => {
        const set = new Set();
        rawSupplierRejections.forEach(r => { if (r && r.supplier) set.add(r.supplier); });
        return Array.from(set).sort();
    }, [rawSupplierRejections]);

    const allGrnOptions = useMemo(() => {
        const set = new Set();
        rawSupplierRejections.forEach(r => { if (r && r.grnNo) set.add(r.grnNo); });
        return Array.from(set).sort();
    }, [rawSupplierRejections]);

    const allItemOptions = useMemo(() => {
        const set = new Set();
        rawSupplierRejections.forEach(r => { if (r && r.item) set.add(r.item); });
        return Array.from(set).sort();
    }, [rawSupplierRejections]);

    const activeSupplierRejections = useMemo(() => {
        return rawSupplierRejections.filter(r => {
            if (!r) return false;
            const matchSupplier = selectedSuppliers === null || selectedSuppliers.includes(r.supplier);
            const matchGrn = selectedGrnNos === null || selectedGrnNos.includes(r.grnNo);
            const matchItem = selectedItems === null || selectedItems.includes(r.item);
            return matchSupplier && matchGrn && matchItem;
        });
    }, [rawSupplierRejections, selectedSuppliers, selectedGrnNos, selectedItems]);

    const activeSupplierRejectionsTotals = useMemo(() => {
        let totalQty = 0;
        let totalOkQty = 0;
        let totalMatRej = 0;
        let totalMacRej = 0;

        activeSupplierRejections.forEach(r => {
            const qty = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
            const okQty = parseFloat(String(r.okQty || 0).replace(/,/g, "")) || 0;
            const matRej = parseFloat(String(r.matRej || 0).replace(/,/g, "")) || 0;
            const macRej = parseFloat(String(r.macRej || 0).replace(/,/g, "")) || 0;

            totalQty += qty;
            totalOkQty += okQty;
            totalMatRej += matRej;
            totalMacRej += macRej;
        });

        return {
            qty: totalQty,
            okQty: totalOkQty,
            matRej: totalMatRej,
            macRej: totalMacRej
        };
    }, [activeSupplierRejections]);

    const rawCustomerComplaints = useMemo(() => {
        if (Array.isArray(customerComplaintsData?.complaints)) return customerComplaintsData.complaints;
        if (Array.isArray(customerComplaintsData)) return customerComplaintsData;
        return [];
    }, [customerComplaintsData]);

    const allComplaintIdOptions = useMemo(() => {
        const set = new Set();
        rawCustomerComplaints.forEach(c => { if (c && c.complaint_id) set.add(c.complaint_id); });
        return Array.from(set).sort();
    }, [rawCustomerComplaints]);

    const allComplaintCustomerOptions = useMemo(() => {
        if (selectedCustomers.length > 0) {
            const set = new Set();
            rawCustomerComplaints.forEach(c => {
                if (c && c.customer_name && selectedCustomers.some(sc => sc.toLowerCase() === c.customer_name.toLowerCase())) {
                    set.add(c.customer_name);
                }
            });
            if (set.size > 0) return Array.from(set).sort();
            return [...selectedCustomers].sort();
        }
        const set = new Set();
        rawCustomerComplaints.forEach(c => { if (c && c.customer_name) set.add(c.customer_name); });
        return Array.from(set).sort();
    }, [rawCustomerComplaints, selectedCustomers]);

    const allComplaintProductOptions = useMemo(() => {
        const set = new Set();
        rawCustomerComplaints.forEach(c => { if (c && c.product) set.add(c.product); });
        return Array.from(set).sort();
    }, [rawCustomerComplaints]);

    const [allMasterCustomerNames, setAllMasterCustomerNames] = useState([]);
    useEffect(() => {
        if (recordsData?.all_customers && Array.isArray(recordsData.all_customers) && recordsData.all_customers.length > 0) {
            setAllMasterCustomerNames(prev => {
                const set = new Set([...prev, ...recordsData.all_customers]);
                return Array.from(set).sort();
            });
        }
    }, [recordsData?.all_customers]);

    const uniqueCustomerNames = useMemo(() => {
        const set = new Set(allMasterCustomerNames);
        // Extract from inspection records
        const records = recordsData?.inspection_records || [];
        records.forEach(r => {
            const name = (r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")).trim();
            if (name && name !== "—" && name !== "-") set.add(name);
        });
        // Extract from customer complaints
        rawCustomerComplaints.forEach(c => {
            const name = (c.customer_name || "").trim();
            if (name && name !== "—" && name !== "-") set.add(name);
        });
        return Array.from(set).sort();
    }, [allMasterCustomerNames, recordsData, rawCustomerComplaints]);

    const filteredDropdownCustomers = useMemo(() => {
        if (!customerSearch.trim()) return uniqueCustomerNames;
        const q = customerSearch.toLowerCase().trim();
        return uniqueCustomerNames.filter(c => c.toLowerCase().includes(q));
    }, [uniqueCustomerNames, customerSearch]);

    const handleCustomerToggle = (cust) => {
        setSelectedCustomers(prev => {
            if (prev.includes(cust)) {
                return prev.filter(c => c !== cust);
            } else {
                return [...prev, cust];
            }
        });
    };

    const uniqueTableCustomerNames = useMemo(() => {
        if (selectedCustomers.length > 0) {
            const set = new Set();
            (recordsData?.inspection_records || []).forEach(r => {
                const name = (r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")).trim();
                if (name && name !== "—" && name !== "-" && selectedCustomers.some(sc => sc.toLowerCase() === name.toLowerCase())) {
                    set.add(name);
                }
            });
            if (set.size > 0) return Array.from(set).sort();
            return [...selectedCustomers].sort();
        }
        const set = new Set();
        (recordsData?.inspection_records || []).forEach(r => {
            const name = (r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")).trim();
            if (name && name !== "—" && name !== "-") set.add(name);
        });
        return Array.from(set).sort();
    }, [recordsData, selectedCustomers]);

    const filteredTableDropdownCustomers = useMemo(() => {
        if (!tableCustomerSearch.trim()) return uniqueTableCustomerNames;
        const q = tableCustomerSearch.toLowerCase().trim();
        return uniqueTableCustomerNames.filter(c => c.toLowerCase().includes(q));
    }, [uniqueTableCustomerNames, tableCustomerSearch]);

    const handleTableCustomerToggle = (cust) => {
        setTableSelectedCustomers(prev =>
            prev.includes(cust) ? prev.filter(c => c !== cust) : [...prev, cust]
        );
    };

    const uniquePartOptions = useMemo(() => {
        const set = new Set();
        (recordsData?.inspection_records || []).forEach(r => {
            const part = (r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : r.partNoDesc) || "").trim();
            if (part && part !== "—" && part !== "-") set.add(part);
        });
        (prodPerfData?.products || []).forEach(p => {
            const part = (p.code || p.name || "").trim();
            if (part && part !== "—" && part !== "-") set.add(part);
        });
        return Array.from(set).sort();
    }, [recordsData, prodPerfData]);

    const getWeekSlotKey = useCallback((dStr) => {
        const d = parseDisplayDate(dStr);
        if (!d || isNaN(d.getTime())) return null;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = d.getDate();
        const m = months[d.getMonth()];
        let wn = 1;
        if (day <= 7) wn = 1;
        else if (day <= 14) wn = 2;
        else if (day <= 21) wn = 3;
        else if (day <= 28) wn = 4;
        else wn = 5;
        return `W${wn} ${m}`;
    }, []);

    // Rejection Trend Filter Memos
    const filteredRejDropdownCustomers = useMemo(() => {
        const base = selectedCustomers.length > 0 ? selectedCustomers : uniqueCustomerNames;
        if (!trendRejCustSearch.trim()) return base;
        const q = trendRejCustSearch.toLowerCase().trim();
        return base.filter(c => c.toLowerCase().includes(q));
    }, [uniqueCustomerNames, trendRejCustSearch, selectedCustomers]);

    const filteredRejDropdownParts = useMemo(() => {
        if (!trendRejPartSearch.trim()) return uniquePartOptions;
        const q = trendRejPartSearch.toLowerCase().trim();
        return uniquePartOptions.filter(p => p.toLowerCase().includes(q));
    }, [uniquePartOptions, trendRejPartSearch]);

    const handleTrendRejCustToggle = (cust) => {
        setTrendRejCustFilter(prev => prev.includes(cust) ? prev.filter(c => c !== cust) : [...prev, cust]);
    };

    const handleTrendRejPartToggle = (part) => {
        setTrendRejPartFilter(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]);
    };

    // Rework Trend Filter Memos
    const filteredRwkDropdownCustomers = useMemo(() => {
        const base = selectedCustomers.length > 0 ? selectedCustomers : uniqueCustomerNames;
        if (!trendRwkCustSearch.trim()) return base;
        const q = trendRwkCustSearch.toLowerCase().trim();
        return base.filter(c => c.toLowerCase().includes(q));
    }, [uniqueCustomerNames, trendRwkCustSearch, selectedCustomers]);

    const filteredRwkDropdownParts = useMemo(() => {
        if (!trendRwkPartSearch.trim()) return uniquePartOptions;
        const q = trendRwkPartSearch.toLowerCase().trim();
        return uniquePartOptions.filter(p => p.toLowerCase().includes(q));
    }, [uniquePartOptions, trendRwkPartSearch]);

    const handleTrendRwkCustToggle = (cust) => {
        setTrendRwkCustFilter(prev => prev.includes(cust) ? prev.filter(c => c !== cust) : [...prev, cust]);
    };

    const handleTrendRwkPartToggle = (part) => {
        setTrendRwkPartFilter(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]);
    };

    // Auto-prune card-level sub-filters if main customer selection changes
    useEffect(() => {
        if (selectedCustomers.length > 0) {
            setTrendRejCustFilter(prev => prev.filter(c => selectedCustomers.some(sc => sc.toLowerCase() === c.toLowerCase())));
            setTrendRwkCustFilter(prev => prev.filter(c => selectedCustomers.some(sc => sc.toLowerCase() === c.toLowerCase())));
            setTableSelectedCustomers(prev => prev.filter(c => selectedCustomers.some(sc => sc.toLowerCase() === c.toLowerCase())));
            setSelectedComplaintCustomers(prev => prev ? prev.filter(c => selectedCustomers.some(sc => sc.toLowerCase() === c.toLowerCase())) : null);
        }
    }, [selectedCustomers]);

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

    const searchFilteredInspectionRows = useMemo(() => {
        if (hasNoData) return [];
        const records = recordsData?.inspection_records || [];
        let raw = records.map(r => ({
            ...r,
            cname: r.cname || r.partyName || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : ""),
            partyName: r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : ""),
            routecardDetails: r.roucard || r.routecardDetails || r.routecard || "—"
        }));

        if (selectedCustomers.length > 0) {
            raw = raw.filter(r => {
                const name = (r.partyName || r.cname || "").trim();
                return selectedCustomers.includes(name);
            });
        }

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
    }, [recordsData, hasNoData, searchQuery, selectedCustomers]);

    const activeRejectionTrendData = useMemo(() => {
        const trendLabels = chartsData?.trend?.labels || [];
        const defaultRejDataset = chartsData?.trend?.datasets?.find(d =>
            d.label?.toLowerCase().includes("reject") || d.label?.toLowerCase().includes("rej") || d.label?.toLowerCase().includes("fail")
        );
        const defaultPoints = defaultRejDataset ? defaultRejDataset.data : [];

        const hasCustFilter = trendRejCustFilter.length > 0;
        const hasPartFilter = trendRejPartFilter.length > 0;

        // 1. Default: Week Wise
        if (!hasCustFilter && !hasPartFilter) {
            return {
                axisType: "week",
                labels: trendLabels,
                points: defaultPoints,
                rate: summaryData?.kpis?.rejection_rate_card?.value || "7.5% Rate"
            };
        }

        // 2. Customer Wise Axis
        if (hasCustFilter && !hasPartFilter) {
            let totalInsp = 0;
            let totalRej = 0;

            const points = trendRejCustFilter.map(cust => {
                let custInsp = 0;
                let custRej = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const cName = (r.partyName || r.cname || "").trim();
                    if (cName.toLowerCase() === cust.toLowerCase()) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const mat = parseFloat(String(r.matRejQty || 0).replace(/,/g, "")) || 0;
                        const mac = parseFloat(String(r.macRejQty || 0).replace(/,/g, "")) || 0;
                        custInsp += insp;
                        custRej += (mat + mac);
                    }
                });
                totalInsp += custInsp;
                totalRej += custRej;
                return custRej;
            });

            const rateVal = totalInsp > 0 ? `${((totalRej / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

            return {
                axisType: "customer",
                labels: trendRejCustFilter,
                points: points,
                rate: rateVal
            };
        }

        // 3. PartNo Wise Axis
        if (hasPartFilter && !hasCustFilter) {
            let totalInsp = 0;
            let totalRej = 0;

            const points = trendRejPartFilter.map(part => {
                let partInsp = 0;
                let partRej = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const pName = (r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : r.partNoDesc) || "").trim();
                    if (pName.toLowerCase() === part.toLowerCase() || (r.partNoDesc && r.partNoDesc.toLowerCase().includes(part.toLowerCase()))) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const mat = parseFloat(String(r.matRejQty || 0).replace(/,/g, "")) || 0;
                        const mac = parseFloat(String(r.macRejQty || 0).replace(/,/g, "")) || 0;
                        partInsp += insp;
                        partRej += (mat + mac);
                    }
                });
                totalInsp += partInsp;
                totalRej += partRej;
                return partRej;
            });

            const rateVal = totalInsp > 0 ? `${((totalRej / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

            return {
                axisType: "part",
                labels: trendRejPartFilter,
                points: points,
                rate: rateVal
            };
        }

        // 4. Both Customer & PartNo Selected
        let totalInsp = 0;
        let totalRej = 0;
        const labels = [];
        const points = [];

        trendRejCustFilter.forEach(cust => {
            trendRejPartFilter.forEach(part => {
                let comboInsp = 0;
                let comboRej = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const cName = (r.partyName || r.cname || "").trim();
                    const pName = (r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : r.partNoDesc) || "").trim();
                    const matchC = cName.toLowerCase() === cust.toLowerCase();
                    const matchP = pName.toLowerCase() === part.toLowerCase() || (r.partNoDesc && r.partNoDesc.toLowerCase().includes(part.toLowerCase()));
                    if (matchC && matchP) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const mat = parseFloat(String(r.matRejQty || 0).replace(/,/g, "")) || 0;
                        const mac = parseFloat(String(r.macRejQty || 0).replace(/,/g, "")) || 0;
                        comboInsp += insp;
                        comboRej += (mat + mac);
                    }
                });
                totalInsp += comboInsp;
                totalRej += comboRej;
                labels.push(`${part} (${cust.length > 8 ? cust.substring(0, 8) + "…" : cust})`);
                points.push(comboRej);
            });
        });

        const rateVal = totalInsp > 0 ? `${((totalRej / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

        return {
            axisType: "combo",
            labels: labels,
            points: points,
            rate: rateVal
        };
    }, [chartsData, summaryData, trendRejCustFilter, trendRejPartFilter, searchFilteredInspectionRows]);

    const activeReworkTrendData = useMemo(() => {
        const trendLabels = chartsData?.trend?.labels || [];
        const defaultRwkDataset = chartsData?.trend?.datasets?.find(d =>
            d.label?.toLowerCase().includes("rework") || d.label?.toLowerCase().includes("rw")
        );
        const defaultPoints = defaultRwkDataset ? defaultRwkDataset.data : [];

        const hasCustFilter = trendRwkCustFilter.length > 0;
        const hasPartFilter = trendRwkPartFilter.length > 0;

        // 1. Default: Week Wise
        if (!hasCustFilter && !hasPartFilter) {
            return {
                axisType: "week",
                labels: trendLabels,
                points: defaultPoints,
                rate: summaryData?.kpis?.rework_rate_card?.value || "4.9% Rate"
            };
        }

        // 2. Customer Wise Axis
        if (hasCustFilter && !hasPartFilter) {
            let totalInsp = 0;
            let totalRwk = 0;

            const points = trendRwkCustFilter.map(cust => {
                let custInsp = 0;
                let custRwk = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const cName = (r.partyName || r.cname || "").trim();
                    if (cName.toLowerCase() === cust.toLowerCase()) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const rwk = parseFloat(String(r.reworkQty || 0).replace(/,/g, "")) || 0;
                        custInsp += insp;
                        custRwk += rwk;
                    }
                });
                totalInsp += custInsp;
                totalRwk += custRwk;
                return custRwk;
            });

            const rateVal = totalInsp > 0 ? `${((totalRwk / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

            return {
                axisType: "customer",
                labels: trendRwkCustFilter,
                points: points,
                rate: rateVal
            };
        }

        // 3. PartNo Wise Axis
        if (hasPartFilter && !hasCustFilter) {
            let totalInsp = 0;
            let totalRwk = 0;

            const points = trendRwkPartFilter.map(part => {
                let partInsp = 0;
                let partRwk = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const pName = (r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : r.partNoDesc) || "").trim();
                    if (pName.toLowerCase() === part.toLowerCase() || (r.partNoDesc && r.partNoDesc.toLowerCase().includes(part.toLowerCase()))) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const rwk = parseFloat(String(r.reworkQty || 0).replace(/,/g, "")) || 0;
                        partInsp += insp;
                        partRwk += rwk;
                    }
                });
                totalInsp += partInsp;
                totalRwk += partRwk;
                return partRwk;
            });

            const rateVal = totalInsp > 0 ? `${((totalRwk / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

            return {
                axisType: "part",
                labels: trendRwkPartFilter,
                points: points,
                rate: rateVal
            };
        }

        // 4. Both Customer & PartNo Selected
        let totalInsp = 0;
        let totalRwk = 0;
        const labels = [];
        const points = [];

        trendRwkCustFilter.forEach(cust => {
            trendRwkPartFilter.forEach(part => {
                let comboInsp = 0;
                let comboRwk = 0;
                searchFilteredInspectionRows.forEach(r => {
                    const cName = (r.partyName || r.cname || "").trim();
                    const pName = (r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : r.partNoDesc) || "").trim();
                    const matchC = cName.toLowerCase() === cust.toLowerCase();
                    const matchP = pName.toLowerCase() === part.toLowerCase() || (r.partNoDesc && r.partNoDesc.toLowerCase().includes(part.toLowerCase()));
                    if (matchC && matchP) {
                        const insp = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
                        const rwk = parseFloat(String(r.reworkQty || 0).replace(/,/g, "")) || 0;
                        comboInsp += insp;
                        comboRwk += rwk;
                    }
                });
                totalInsp += comboInsp;
                totalRwk += comboRwk;
                labels.push(`${part} (${cust.length > 8 ? cust.substring(0, 8) + "…" : cust})`);
                points.push(comboRwk);
            });
        });

        const rateVal = totalInsp > 0 ? `${((totalRwk / totalInsp) * 100).toFixed(1)}% Rate` : "0.0% Rate";

        return {
            axisType: "combo",
            labels: labels,
            points: points,
            rate: rateVal
        };
    }, [chartsData, summaryData, trendRwkCustFilter, trendRwkPartFilter, searchFilteredInspectionRows]);

    const activeCustomerComplaints = useMemo(() => {
        let list = rawCustomerComplaints;

        if (selectedCustomers.length > 0) {
            list = list.filter(c => {
                const name = (c.customer_name || "").trim();
                return selectedCustomers.includes(name);
            });
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c =>
                (c.complaint_id && c.complaint_id.toLowerCase().includes(q)) ||
                (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
                (c.product && c.product.toLowerCase().includes(q)) ||
                (c.complaint_description && c.complaint_description.toLowerCase().includes(q)) ||
                (c.action_taken && c.action_taken.toLowerCase().includes(q)) ||
                (c.corrective_action && c.corrective_action.toLowerCase().includes(q)) ||
                (c.permanent_action && c.permanent_action.toLowerCase().includes(q)) ||
                (c.status && c.status.toLowerCase().includes(q))
            );
        }

        return list.filter(c => {
            if (!c) return false;
            const matchId = selectedComplaintIds === null || selectedComplaintIds.includes(c.complaint_id);
            const matchCust = selectedComplaintCustomers === null || selectedComplaintCustomers.includes(c.customer_name);
            const matchProd = selectedComplaintProducts === null || selectedComplaintProducts.includes(c.product);
            return matchId && matchCust && matchProd;
        });
    }, [rawCustomerComplaints, selectedCustomers, searchQuery, selectedComplaintIds, selectedComplaintCustomers, selectedComplaintProducts]);

    const debounceRef = useRef(null);

    const fetchQualityData = useCallback((from, to, q = "", customers = []) => {
        const fromStr = formatYmd(from);
        const toStr = formatYmd(to);
        const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
        const custParam = customers && customers.length > 0 ? `&customer=${encodeURIComponent(customers.join(","))}` : "";
        const buildUrl = (base) => `${base}?from=${fromStr}&to=${toStr}${qParam}${custParam}`;
        const buildDateOnlyUrl = (base) => `${base}?from=${fromStr}&to=${toStr}`;

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
            // Supplier Wise Rejection card is for suppliers only; not affected by global customer/part filters
            await fetchPanel(buildDateOnlyUrl("/api/quality-analysis/supplier-rejections/"), setSupplierData, setSupplierLoading);
        };

        loadAllSequentially();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 60);
        return () => clearTimeout(t);
    }, []);

    // Close dropdowns when data is loading
    useEffect(() => {
        if (isGlobalLoading) {
            setCustomerDropdownOpen(false);
            setTrendRejCustDropdownOpen(false);
            setTrendRejPartDropdownOpen(false);
            setTrendRwkCustDropdownOpen(false);
            setTrendRwkPartDropdownOpen(false);
            setTableCustomerDropdownOpen(false);
            setInspTypeDropdownOpen(false);
            setTraceTypeDropdownOpen(false);
        }
    }, [isGlobalLoading]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
                setInspTypeDropdownOpen(false);
            }
            if (traceTypeDropdownRef.current && !traceTypeDropdownRef.current.contains(event.target)) {
                setTraceTypeDropdownOpen(false);
            }
            if (customerRef.current && !customerRef.current.contains(event.target)) {
                setCustomerDropdownOpen(false);
            }
            if (trendRejCustRef.current && !trendRejCustRef.current.contains(event.target)) {
                setTrendRejCustDropdownOpen(false);
            }
            if (trendRejPartRef.current && !trendRejPartRef.current.contains(event.target)) {
                setTrendRejPartDropdownOpen(false);
            }
            if (trendRwkCustRef.current && !trendRwkCustRef.current.contains(event.target)) {
                setTrendRwkCustDropdownOpen(false);
            }
            if (trendRwkPartRef.current && !trendRwkPartRef.current.contains(event.target)) {
                setTrendRwkPartDropdownOpen(false);
            }
            if (tableCustomerRef.current && !tableCustomerRef.current.contains(event.target)) {
                setTableCustomerDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close any open filter dropdowns when loading starts
    useEffect(() => {
        if (isGlobalLoading) {
            setCustomerDropdownOpen(false);
            setInspTypeDropdownOpen(false);
            setTraceTypeDropdownOpen(false);
            setTrendRejCustDropdownOpen(false);
            setTrendRejPartDropdownOpen(false);
            setTrendRwkCustDropdownOpen(false);
            setTrendRwkPartDropdownOpen(false);
            setTableCustomerDropdownOpen(false);
        }
    }, [isGlobalLoading]);

    // ✅ Persist date range to sessionStorage on every change
    useEffect(() => {
        writeFilterSession("ba_filter_quality", { from: dateRange.from, to: dateRange.to });
    }, [dateRange.from, dateRange.to]);

    // Debounced re-fetch on dateRange or customer change (150 ms)
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchQualityData(dateRange.from, dateRange.to, searchQuery, selectedCustomers);
        }, 150);
        return () => clearTimeout(debounceRef.current);
    }, [dateRange, fetchQualityData, searchQuery, selectedCustomers]);

    // Debounced re-fetch on searchQuery change (400 ms — slightly longer to avoid rapid keystroke spam)
    const searchDebounceRef = useRef(null);
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchQualityData(dateRange.from, dateRange.to, searchQuery, selectedCustomers);
        }, 400);
        return () => clearTimeout(searchDebounceRef.current);
    }, [searchQuery, selectedCustomers]); // eslint-disable-line react-hooks/exhaustive-deps

    const fontBase = useMemo(() => ({ family: "Poppins" }), []);

    // ── 1. Weekly Inspection Trend Chart ──
    useEffect(() => {
        if (!trendRef.current) return;
        trendChart.current?.destroy();

        const trendData = chartsData?.trend || { labels: [], datasets: [] };
        const labels = trendData.labels || [];
        const datasets = [];

        const passData = trendData.datasets?.[0]?.data || [];
        const reworkData = trendData.datasets?.[1]?.data || [];
        const rejectData = trendData.datasets?.[2]?.data || [];

        const trendCanvas = trendRef.current;
        let passGrad = "rgba(16, 185, 129, 0.25)";
        let rewGrad = "rgba(245, 166, 35, 0.25)";
        let rejGrad = "rgba(239, 68, 68, 0.25)";

        if (trendCanvas) {
            const ctx = trendCanvas.getContext("2d");
            if (ctx) {
                const g1 = ctx.createLinearGradient(0, 0, 0, 240);
                g1.addColorStop(0, "rgba(16, 185, 129, 0.8)");
                g1.addColorStop(1, "rgba(16, 185, 129, 0.15)");
                passGrad = g1;

                const g2 = ctx.createLinearGradient(0, 0, 0, 240);
                g2.addColorStop(0, "rgba(245, 166, 35, 0.8)");
                g2.addColorStop(1, "rgba(245, 166, 35, 0.15)");
                rewGrad = g2;

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

        trendChart.current = new Chart(trendRef.current, {
            type: weeklyChartType === "stack" ? "bar" : "line",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: "easeOutQuart" },
                interaction: { mode: "index", intersect: false },
                layout: { padding: { left: 15, right: 15, top: 12 } },
                plugins: {
                    legend: {
                        position: "top",
                        labels: { font: { family: "Poppins", size: 11, weight: "600" }, boxWidth: 12, padding: 16, usePointStyle: true }
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
                        align: (context) => (context.dataIndex === 0 ? "right" : "top"),
                        offset: (context) => (context.dataIndex === 0 ? 6 : 2),
                        formatter: (value, context) => {
                            if (weeklyChartType !== "stack") {
                                return value > 0 ? value.toLocaleString() : "";
                            }
                            const index = context.dataIndex;
                            const dsets = context.chart.data.datasets;
                            let topDatasetIndex = -1;
                            for (let i = dsets.length - 1; i >= 0; i--) {
                                if (dsets[i].data[index] > 0) {
                                    topDatasetIndex = i;
                                    break;
                                }
                            }
                            if (context.datasetIndex === topDatasetIndex) {
                                const total = dsets.reduce((sum, ds) => sum + (ds.data[index] || 0), 0);
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
            }
        });

        return () => trendChart.current?.destroy();
    }, [chartsData?.trend, weeklyChartType]);

    // ── 2. Inspection Results Split Donut Chart ──
    useEffect(() => {
        if (!resultRef.current) return;
        resultChart.current?.destroy();

        const resultDonut = chartsData?.result_donut || { labels: [], datasets: [] };

        resultChart.current = new Chart(resultRef.current, {
            type: "doughnut",
            data: resultDonut,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { ...fontBase, size: 10, padding: 10, boxWidth: 10 } },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => {
                                const rawLabel = ctx.label || "";
                                const cleanLabel = rawLabel.replace(/\s*\([\d.]*%\)/, '').trim();
                                const val = Number(ctx.parsed) || 0;
                                const sum = ctx.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                                const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : "0.0";
                                return ` ${cleanLabel}: ${pct}%`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: "#fff",
                        font: { size: 10.5, weight: "700", family: "Poppins" },
                        formatter: (value, context) => {
                            const sum = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                            const pct = sum > 0 ? ((Number(value) / sum) * 100).toFixed(1) : 0;
                            return Number(pct) >= 1 ? `${pct}%` : "";
                        }
                    }
                },
                cutout: "64%",
            }
        });

        return () => resultChart.current?.destroy();
    }, [chartsData?.result_donut, fontBase]);

    // ── 3. Defect Category Breakdown Donut Chart ──
    useEffect(() => {
        if (!defectRef.current) return;
        defectChart.current?.destroy();

        const rawDefectDonut = chartsData?.defect_donut || { labels: [], datasets: [] };
        const defectData = rawDefectDonut.datasets?.[0]?.data || [];
        const defectTotal = defectData.reduce((a, b) => Number(a) + Number(b), 0);
        const defectBaseNames = ["Material Rejection", "Machine Rejection", "Rework"];
        const defectLabels = defectBaseNames.map((name, idx) => {
            const rawVal = Number(defectData[idx]) || 0;
            const pct = defectTotal > 0 ? ((rawVal / defectTotal) * 100).toFixed(1) : "0.0";
            return `${name} (${pct}%)`;
        });
        const defectDonut = {
            ...rawDefectDonut,
            labels: defectLabels,
            datasets: rawDefectDonut.datasets || []
        };

        defectChart.current = new Chart(defectRef.current, {
            type: "doughnut",
            data: defectDonut,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom", labels: { ...fontBase, size: 10, padding: 10, boxWidth: 10 } },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => {
                                const rawLabel = ctx.label || "";
                                const cleanLabel = rawLabel.replace(/\s*\([\d.]*%\)/, '').trim();
                                const val = Number(ctx.parsed) || 0;
                                const sum = ctx.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                                const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : "0.0";
                                return ` ${cleanLabel}: ${pct}%`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: "#fff",
                        font: { size: 10.5, weight: "700", family: "Poppins" },
                        formatter: (value, context) => {
                            const sum = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                            const pct = sum > 0 ? ((Number(value) / sum) * 100).toFixed(1) : 0;
                            return Number(pct) >= 1 ? `${pct}%` : "";
                        }
                    }
                },
                cutout: "64%",
            }
        });

        return () => defectChart.current?.destroy();
    }, [chartsData?.defect_donut, fontBase]);

    // ── 4. Internal Mac Rejection PPM Chart ──
    useEffect(() => {
        if (!ppmRef.current) return;
        ppmChart.current?.destroy();

        const ppmData = chartsData?.mac_rejection_ppm || { labels: [], datasets: [] };

        ppmChart.current = new Chart(ppmRef.current, {
            type: "line",
            data: ppmData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 15, right: 15, top: 16 } },
                plugins: {
                    legend: { labels: { ...fontBase, size: 11, weight: 600, boxWidth: 12, padding: 14 } },
                    title: {
                        display: true,
                        text: ppmData.fy ? `Internal Mac Rejection PPM — ${ppmData.fy}` : "Internal Mac Rejection PPM",
                        font: { ...fontBase, size: 12, weight: 600 },
                        color: "#5a6a9a",
                        padding: { bottom: 8 }
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
                            label: (ctx) => {
                                const val = Number(ctx.parsed.y) || 0;
                                const val2 = (Math.floor(val * 100) / 100).toFixed(2);
                                return ` ${ctx.dataset.label || "Actual PPM"}: ${val2} PPM`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: (context) => (context.dataIndex === 0 ? "right" : "top"),
                        offset: (context) => (context.dataIndex === 0 ? 6 : 4),
                        formatter: (v) => {
                            const val = Number(v) || 0;
                            if (val <= 0) return "";
                            const val2 = (Math.floor(val * 100) / 100).toFixed(2);
                            return `${val2} PPM`;
                        },
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
                    x: { grid: { display: false }, ticks: { ...fontBase, size: 9, color: "#5a6a9a" } },
                    y: {
                        beginAtZero: true,
                        grace: "15%",
                        grid: { color: "rgba(26,84,212,0.07)" },
                        ticks: {
                            ...fontBase,
                            size: 9,
                            color: "#5a6a9a",
                            callback: v => v.toLocaleString() + ' PPM'
                        },
                        border: { dash: [4, 4] }
                    },
                },
            }
        });

        return () => ppmChart.current?.destroy();
    }, [chartsData?.mac_rejection_ppm, fontBase]);

    // ── 5. Top Defect Causes (Pareto) Chart ──
    useEffect(() => {
        if (!paretoRef.current) return;
        paretoChart.current?.destroy();

        const paretoData = chartsData?.pareto || { labels: [], datasets: [] };

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
                    legend: { labels: { ...fontBase, size: 11, weight: 600, boxWidth: 12, padding: 14 } },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.dataset.type === "line") {
                                    return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}%`;
                                }
                                const val = Number(ctx.parsed.y) || 0;
                                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : "0.0";
                                return ` ${ctx.dataset.label}: ${val.toLocaleString()} (${pct}%)`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        formatter: (value, context) => {
                            if (context.datasetIndex === 0) {
                                return value > 0 ? value.toString() : "";
                            } else {
                                return value > 0 ? `${value.toFixed(1)}%` : "";
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
                    y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { ...fontBase, size: 9, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                    y2: { position: "right", min: 0, max: 100, grid: { display: false }, ticks: { ...fontBase, size: 9, color: "#5a6a9a", callback: v => v + "%" } },
                    x: { grid: { display: false }, ticks: { ...fontBase, size: 9, color: "#5a6a9a" } },
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
                    y: { beginAtZero: true, grid: { color: "rgba(26,84,212,0.07)" }, ticks: { ...fontBase, size: 9, color: "#5a6a9a" }, border: { dash: [4, 4] } },
                    x: { grid: { display: false }, ticks: { ...fontBase, size: 9, color: "#5a6a9a" } },
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
                    legend: { position: "right", labels: { ...fontBase, size: 10, weight: 600, boxWidth: 10, padding: 8 } },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 11, weight: "700", family: "Poppins" },
                        bodyFont: { size: 11, family: "Poppins" },
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => {
                                const val = Number(ctx.parsed) || 0;
                                const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = sum > 0 ? ((val / sum) * 100).toFixed(1) : "0.0";
                                return ` ${ctx.label}: ${val.toLocaleString()} (${pct}%)`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: "#fff",
                        font: { size: 9.5, weight: "750", family: "Poppins" },
                        formatter: (value, context) => {
                            const sum = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
                            const pct = sum > 0 ? ((value / sum) * 100).toFixed(1) : 0;
                            return pct > 3 ? `${pct}%` : "";
                        }
                    }
                }
            };
        }

        paretoChart.current = new Chart(paretoRef.current, {
            type: finalParetoType,
            data: finalParetoData,
            options: finalParetoOptions
        });

        return () => paretoChart.current?.destroy();
    }, [chartsData?.pareto, paretoChartType, fontBase]);

    // ── 6. Rejection Analytics Trend Chart ──
    useEffect(() => {
        if (!rejectionRef.current) return;
        rejectionChart.current?.destroy();

        const trendLabels = chartsData?.trend?.labels || [];
        const rejectDataPoints = activeRejectionTrendData.points || [];

        const rejectionCanvas = rejectionRef.current;
        let rejectionGradient = "rgba(239, 68, 68, 0.1)";
        if (rejectionCanvas) {
            const ctx = rejectionCanvas.getContext("2d");
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 0, 260);
                grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
                grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");
                rejectionGradient = grad;
            }
        }

        rejectionChart.current = new Chart(rejectionRef.current, {
            type: "line",
            data: {
                labels: activeRejectionTrendData.labels || trendLabels,
                datasets: [{
                    label: "Rejection Qty",
                    data: rejectDataPoints,
                    borderColor: "#ef4444",
                    backgroundColor: rejectionGradient,
                    tension: (activeRejectionTrendData.axisType && activeRejectionTrendData.axisType !== "week") ? 0.2 : 0.4,
                    fill: true,
                    pointRadius: (activeRejectionTrendData.axisType && activeRejectionTrendData.axisType !== "week") ? 5 : 4,
                    pointBackgroundColor: "#ef4444",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 15, right: 15, top: 16 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: (context) => (context.dataIndex === 0 ? "right" : "top"),
                        offset: (context) => (context.dataIndex === 0 ? 6 : 4),
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
                    x: {
                        grid: { display: false },
                        ticks: {
                            ...fontBase,
                            size: 9,
                            color: "#5a6a9a",
                            autoSkip: false,
                            maxRotation: (activeRejectionTrendData.axisType && activeRejectionTrendData.axisType !== "week") ? 25 : 0,
                            minRotation: (activeRejectionTrendData.axisType && activeRejectionTrendData.axisType !== "week") ? 15 : 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grace: "15%",
                        grid: { color: "rgba(26,84,212,0.07)" },
                        ticks: { ...fontBase, size: 9, color: "#5a6a9a" },
                        border: { dash: [4, 4] }
                    },
                }
            }
        });

        return () => rejectionChart.current?.destroy();
    }, [activeRejectionTrendData, chartsData?.trend?.labels, fontBase]);

    // ── 7. Rework Analytics Trend Chart ──
    useEffect(() => {
        if (!reworkRef.current) return;
        reworkChart.current?.destroy();

        const trendLabels = chartsData?.trend?.labels || [];
        const reworkDataPoints = activeReworkTrendData.points || [];

        const reworkCanvas = reworkRef.current;
        let reworkGradient = "rgba(245, 166, 35, 0.1)";
        if (reworkCanvas) {
            const ctx = reworkCanvas.getContext("2d");
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 0, 260);
                grad.addColorStop(0, "rgba(245, 166, 35, 0.35)");
                grad.addColorStop(1, "rgba(245, 166, 35, 0.0)");
                reworkGradient = grad;
            }
        }

        reworkChart.current = new Chart(reworkRef.current, {
            type: "line",
            data: {
                labels: activeReworkTrendData.labels || trendLabels,
                datasets: [{
                    label: "Rework Qty",
                    data: reworkDataPoints,
                    borderColor: "#f97316",
                    backgroundColor: reworkGradient,
                    tension: (activeReworkTrendData.axisType && activeReworkTrendData.axisType !== "week") ? 0.2 : 0.4,
                    fill: true,
                    pointRadius: (activeReworkTrendData.axisType && activeReworkTrendData.axisType !== "week") ? 5 : 4,
                    pointBackgroundColor: "#f97316",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { left: 15, right: 15, top: 16 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        display: true,
                        anchor: "end",
                        align: (context) => (context.dataIndex === 0 ? "right" : "top"),
                        offset: (context) => (context.dataIndex === 0 ? 6 : 4),
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
                    x: {
                        grid: { display: false },
                        ticks: {
                            ...fontBase,
                            size: 9,
                            color: "#5a6a9a",
                            autoSkip: false,
                            maxRotation: (activeReworkTrendData.axisType && activeReworkTrendData.axisType !== "week") ? 25 : 0,
                            minRotation: (activeReworkTrendData.axisType && activeReworkTrendData.axisType !== "week") ? 15 : 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grace: "15%",
                        grid: { color: "rgba(26,84,212,0.07)" },
                        ticks: { ...fontBase, size: 9, color: "#5a6a9a" },
                        border: { dash: [4, 4] }
                    },
                }
            }
        });

        return () => reworkChart.current?.destroy();
    }, [activeReworkTrendData, chartsData?.trend?.labels, fontBase]);

    // ── 8. Supplier Rejections Chart ──
    useEffect(() => {
        if (!supplierRef.current) return;
        supplierChart.current?.destroy();

        const suppMap = {};
        activeSupplierRejections.forEach(r => {
            const mat = (parseFloat(r.matRej) || 0);
            const mac = (parseFloat(r.macRej) || 0);
            if (mat > 0 || mac > 0) {
                const sName = r.supplier || "Unknown";
                if (!suppMap[sName]) {
                    suppMap[sName] = { matRej: 0, macRej: 0, total: 0 };
                }
                suppMap[sName].matRej += mat;
                suppMap[sName].macRej += mac;
                suppMap[sName].total += (mat + mac);
            }
        });
        const supplierLabels = Object.keys(suppMap).sort((a, b) => suppMap[b].total - suppMap[a].total);
        const supplierMatRej = supplierLabels.map(l => suppMap[l].matRej);
        const supplierMacRej = supplierLabels.map(l => suppMap[l].macRej);

        supplierChart.current = new Chart(supplierRef.current, {
            type: "bar",
            data: {
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
            },
            options: {
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
            }
        });

        return () => supplierChart.current?.destroy();
    }, [activeSupplierRejections]);

    const resetFilters = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setDateRange({ from: startOfMonth, to: endOfMonth });
        setSelectedCustomers([]);
        setSearchQuery("");
        setFilters({
            fromDate: formatYmd(startOfMonth),
            toDate: formatYmd(endOfMonth),
            reportType: "All Reports",
            department: "All Departments",
            product: "All Products",
            defectType: "All Defects"
        });
    };

    // ── Memoised derived data (avoids re-computation on unrelated renders) ─────

    const allTraceInspNoOptions = useMemo(() => {
        const set = new Set();
        searchFilteredInspectionRows.forEach(r => { if (r && r.id) set.add(r.id); });
        return Array.from(set).sort();
    }, [searchFilteredInspectionRows]);

    const allTraceMachineNoOptions = useMemo(() => {
        const set = new Set();
        searchFilteredInspectionRows.forEach(r => { if (r && r.machineNo && r.machineNo !== "—") set.add(r.machineNo); });
        return Array.from(set).sort();
    }, [searchFilteredInspectionRows]);

    const allTracePartNoOptions = useMemo(() => {
        const set = new Set();
        searchFilteredInspectionRows.forEach(r => { if (r && r.partNoDesc && r.partNoDesc !== "—") set.add(r.partNoDesc); });
        return Array.from(set).sort();
    }, [searchFilteredInspectionRows]);

    const activeTraceabilityRows = useMemo(() => {
        let rows = searchFilteredInspectionRows;

        if (selectedTraceTypeFilter !== "ALL") {
            rows = rows.filter(r => {
                const label = (r.typeLabel || "").toLowerCase();
                const id = (r.id || "").toLowerCase();
                if (selectedTraceTypeFilter === "FINAL") return label.includes("final") || id.startsWith("fi");
                if (selectedTraceTypeFilter === "INTER") return label.includes("inter") || id.startsWith("ii");
                if (selectedTraceTypeFilter === "JOB") return label.includes("job") || (!label.includes("final") && !label.includes("inter") && !id.startsWith("fi") && !id.startsWith("ii"));
                return true;
            });
        }

        return rows.filter(r => {
            if (!r) return false;
            const matchInspNo = selectedTraceInspNos === null || selectedTraceInspNos.includes(r.id);
            const matchMachineNo = selectedTraceMachineNos === null || selectedTraceMachineNos.includes(r.machineNo);
            const matchPartNo = selectedTracePartNos === null || selectedTracePartNos.includes(r.partNoDesc);
            return matchInspNo && matchMachineNo && matchPartNo;
        });
    }, [searchFilteredInspectionRows, selectedTraceTypeFilter, selectedTraceInspNos, selectedTraceMachineNos, selectedTracePartNos]);

    const activeTraceabilityRowsTotals = useMemo(() => {
        let totalProd = 0;
        let totalOk = 0;
        let totalMatRej = 0;
        let totalMacRej = 0;
        let totalRework = 0;

        activeTraceabilityRows.forEach(r => {
            const prod = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
            const ok = parseFloat(String(r.okQty || (r.result === "PASS" ? r.qty : 0)).replace(/,/g, "")) || 0;
            const matRej = parseFloat(String(r.matRejQty || 0).replace(/,/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty || 0).replace(/,/g, "")) || 0;
            const rework = parseFloat(String(r.reworkQty || 0).replace(/,/g, "")) || 0;

            totalProd += prod;
            totalOk += ok;
            totalMatRej += matRej;
            totalMacRej += macRej;
            totalRework += rework;
        });

        return {
            prodQty: totalProd,
            okQty: totalOk,
            matRej: totalMatRej,
            macRej: totalMacRej,
            reworkQty: totalRework
        };
    }, [activeTraceabilityRows]);

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
        let rows = searchFilteredInspectionRows;

        if (selectedType !== "ALL") {
            rows = rows.filter(r => {
                const l = (r.typeLabel || "").toLowerCase();
                const id = (r.id || "").toLowerCase();
                if (selectedType === "INTER") return l.includes("inter") || id.startsWith("ii");
                if (selectedType === "FINAL") return l.includes("final") || id.startsWith("fi");
                if (selectedType === "JOB") return l.includes("job") || id.startsWith("ji");
                return true;
            });
        }

        if (tableInspNoSearch.trim()) {
            const q = tableInspNoSearch.toLowerCase().trim();
            rows = rows.filter(r => (r.id || "").toLowerCase().includes(q));
        }

        if (tableSelectedCustomers.length > 0) {
            rows = rows.filter(r => {
                const cName = (r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")).trim();
                return tableSelectedCustomers.some(c => c.toLowerCase() === cName.toLowerCase());
            });
        }

        if (tablePartNoDescSearch.trim()) {
            const q = tablePartNoDescSearch.toLowerCase().trim();
            rows = rows.filter(r => {
                const pnd = r.partNoDesc || (r.partNo && r.product ? `${r.partNo} - ${r.product}` : (r.partNo || r.product || ""));
                return pnd.toLowerCase().includes(q);
            });
        }

        return rows;
    }, [searchFilteredInspectionRows, selectedType, tableInspNoSearch, tableSelectedCustomers, tablePartNoDescSearch]);

    const activeInspectionRowsTotals = useMemo(() => {
        let totalInsp = 0;
        let totalOk = 0;
        let totalMatRej = 0;
        let totalMacRej = 0;
        let totalRework = 0;

        activeInspectionRows.forEach(r => {
            const qty = parseFloat(String(r.qty || 0).replace(/,/g, "")) || 0;
            const ok = parseFloat(String(r.okQty || (r.result === "PASS" ? r.qty : (r.result === "PENDING" ? r.qty : "0"))).replace(/,/g, "")) || 0;
            const matRej = parseFloat(String(r.matRejQty || 0).replace(/,/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty || 0).replace(/,/g, "")) || 0;
            const rework = parseFloat(String(r.reworkQty || (r.result === "REWORK" ? r.qty : "0")).replace(/,/g, "")) || 0;

            totalInsp += qty;
            totalOk += ok;
            totalMatRej += matRej;
            totalMacRej += macRej;
            totalRework += rework;
        });

        const totalRej = totalMatRej + totalMacRej;
        const totalRejPct = totalInsp > 0 ? ((totalRej / totalInsp) * 100).toFixed(1) : "0.0";

        return {
            insp: totalInsp,
            ok: totalOk,
            matRej: totalMatRej,
            macRej: totalMacRej,
            rejPct: `${totalRejPct}%`,
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
            const matRej = parseFloat(String(r.matRejQty || 0).replace(/[^0-9.]/g, "")) || 0;
            if (matRej > 0) {
                if (!map[partNoDesc]) {
                    map[partNoDesc] = { name: partNoDesc, qty: 0, process: r.process || "—" };
                }
                map[partNoDesc].qty += matRej;
            }
        });
        const list = Object.values(map).sort((a, b) => b.qty - a.qty);
        return list.slice(0, 10);
    }, [searchFilteredInspectionRows, hasNoData]);

    const topMachineRejections = useMemo(() => {
        const map = {};
        searchFilteredInspectionRows.forEach(r => {
            const partNoDesc = r.partNoDesc || (r.partNo && r.product ? `${r.partNo} - ${r.product}` : (r.partNo || r.product || "—"));
            const macRej = parseFloat(String(r.macRejQty || 0).replace(/[^0-9.]/g, "")) || 0;
            if (macRej > 0) {
                if (!map[partNoDesc]) {
                    map[partNoDesc] = { name: partNoDesc, qty: 0, process: r.process || "—" };
                }
                map[partNoDesc].qty += macRej;
            }
        });
        const list = Object.values(map).sort((a, b) => b.qty - a.qty);
        return list.slice(0, 10);
    }, [searchFilteredInspectionRows, hasNoData]);

    const departmentRejections = useMemo(() => {
        const map = {};
        searchFilteredInspectionRows.forEach(r => {
            const dept = getDepartmentForProcess(r.process || "Other");
            const matRej = parseFloat(String(r.matRejQty || 0).replace(/[^0-9.]/g, "")) || 0;
            const macRej = parseFloat(String(r.macRejQty || 0).replace(/[^0-9.]/g, "")) || 0;
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

    // Traceability — mapped to searchFilteredInspectionRows and filtered by selectedTraceTypeFilter

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


    const activeSummaryStrip = useMemo(() => {
        const totalInsp = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.qty).replace(/[^0-9.]/g, "")) || 0), 0);
        const totalOk = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.okQty || (r.result === "PASS" ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0), 0);
        const totalMatRej = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.matRejQty || 0).replace(/[^0-9.]/g, "")) || 0), 0);
        const totalMacRej = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.macRejQty || 0).replace(/[^0-9.]/g, "")) || 0), 0);
        const totalRej = totalMatRej + totalMacRej;
        const totalRwk = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.reworkQty || "0").replace(/[^0-9.]/g, "")) || 0), 0);
        const pendingCount = searchFilteredInspectionRows.filter(r => r.result === "PENDING" || (r.id || "").toLowerCase().includes("pending")).length;

        if (searchQuery) {
            return {
                period: summaryData?.period ?? "Jul 2026",
                totalInspected: totalInsp.toLocaleString("en-IN"),
                passRate: totalInsp > 0 ? `${((totalOk / totalInsp) * 100).toFixed(1)}%` : "0.0%",
                totalRejected: totalRej.toLocaleString("en-IN"),
                rework: totalRwk.toLocaleString("en-IN"),
                pending: pendingCount.toString(),
            };
        }

        return {
            period: summaryData?.period ?? "Jul 2026",
            totalInspected: summaryData?.total_inspected ?? totalInsp.toLocaleString("en-IN"),
            passRate: summaryData?.pass_rate ?? (totalInsp > 0 ? `${((totalOk / totalInsp) * 100).toFixed(1)}%` : "0.0%"),
            totalRejected: summaryData?.total_rejected ?? totalRej.toLocaleString("en-IN"),
            rework: summaryData?.rework ?? totalRwk.toLocaleString("en-IN"),
            pending: summaryData?.pending_inspection ?? pendingCount.toString(),
        };
    }, [searchQuery, summaryData, searchFilteredInspectionRows]);

    const activeKpiCards = useMemo(() => {
        if (hasNoData) return EMPTY_KPI_CARDS;

        const rowsInspected = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.qty || 0).replace(/[^0-9.]/g, "")) || 0), 0);
        const rowsOk = searchFilteredInspectionRows.reduce((sum, r) => sum + (parseFloat(String(r.okQty || (r.result === "PASS" ? r.qty : "0")).replace(/[^0-9.]/g, "")) || 0), 0);
        const rowsMatRej = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.matRejQty || 0).replace(/[^0-9.]/g, "")) || 0);
        }, 0);
        const rowsMacRej = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.macRejQty || 0).replace(/[^0-9.]/g, "")) || 0);
        }, 0);
        const rowsRework = searchFilteredInspectionRows.reduce((sum, r) => {
            return sum + (parseFloat(String(r.reworkQty || "0").replace(/[^0-9.]/g, "")) || 0);
        }, 0);

        const summaryMatRej = summaryData?.total_mat_rej !== undefined
            ? parseFloat(summaryData.total_mat_rej)
            : (parseFloat(String(summaryData?.kpis?.material_rej_card?.value || "0").replace(/[^0-9.]/g, "")) || 0);

        const summaryMacRej = summaryData?.total_mac_rej !== undefined
            ? parseFloat(summaryData.total_mac_rej)
            : (parseFloat(String(summaryData?.kpis?.machine_rej_card?.value || "0").replace(/[^0-9.]/g, "")) || 0);

        const totalMaterialRej = searchFilteredInspectionRows.length > 0 ? rowsMatRej : summaryMatRej;
        const totalMachineRej = searchFilteredInspectionRows.length > 0 ? rowsMacRej : summaryMacRej;
        const totalInspected = searchFilteredInspectionRows.length > 0 ? rowsInspected : (parseFloat(String(summaryData?.total_inspected || 0).replace(/[^0-9.]/g, "")) || 0);
        const totalOk = rowsOk;
        const totalReworkQty = searchFilteredInspectionRows.length > 0 ? rowsRework : (parseFloat(String(summaryData?.rework || 0).replace(/[^0-9.]/g, "")) || 0);

        const pendingCount = searchFilteredInspectionRows.filter(r => r.result === "PENDING" || (r.id || "").toLowerCase().includes("pending")).length;
        const complaintsCount = activeCustomerComplaints.length;
        const ppm = totalInspected > 0 ? Math.round(((totalMaterialRej + totalMachineRej) / totalInspected) * 1000000) : 0;
        const fpy = totalInspected > 0
            ? ((totalInspected - (totalMaterialRej + totalMachineRej + totalReworkQty)) / totalInspected) * 100
            : 0;
        const fpyVal = totalInspected > 0 ? `${fpy.toFixed(1)}%` : "0.0%";

        const insQty = searchQuery
            ? totalInspected.toLocaleString("en-IN")
            : (summaryData?.kpis?.total_inspected_card?.value || totalInspected.toLocaleString("en-IN"));
        const passRate = searchQuery
            ? (totalInspected > 0 ? `${((totalOk / totalInspected) * 100).toFixed(1)}%` : "0.0%")
            : (summaryData?.kpis?.pass_rate_card?.value || (totalInspected > 0 ? `${((totalOk / totalInspected) * 100).toFixed(1)}%` : "0.0%"));
        const rejRate = searchQuery
            ? (totalInspected > 0 ? `${(((totalMaterialRej + totalMachineRej) / totalInspected) * 100).toFixed(1)}%` : "0.0%")
            : (summaryData?.kpis?.rejection_rate_card?.value || (totalInspected > 0 ? `${(((totalMaterialRej + totalMachineRej) / totalInspected) * 100).toFixed(1)}%` : "0.0%"));
        const reworkRate = searchQuery
            ? (totalInspected > 0 ? `${((totalReworkQty / totalInspected) * 100).toFixed(1)}%` : "0.0%")
            : (summaryData?.kpis?.rework_rate_card?.value || (totalInspected > 0 ? `${((totalReworkQty / totalInspected) * 100).toFixed(1)}%` : "0.0%"));
        const pendingInsp = searchQuery
            ? pendingCount.toString()
            : (summaryData?.kpis?.pending_insp_card?.value || "0");
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
    }, [summaryData, hasNoData, searchQuery, searchFilteredInspectionRows, activeCustomerComplaints, calibrationAlertCount]);

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
                <div className="qa2-filter-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SlidersHorizontal size={18} style={{ color: '#2d6de8', strokeWidth: 2.25 }} /> Report Filters
                    </div>
                    {isGlobalLoading && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                            <span className="qa2-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                            Updating data...
                        </div>
                    )}
                </div>
                <div className="qa2-filter-grid" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end', padding: '1rem 1.25rem', opacity: isGlobalLoading ? 0.7 : 1, transition: 'opacity 0.2s ease', pointerEvents: isGlobalLoading ? 'none' : 'auto' }}>
                    <div className="qa2-fg" style={{ width: '320px', flex: '0 0 auto' }}>
                        <label className="qa2-fl">Date Range</label>
                        <QualityAnalysisDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={({ from, to }) => !isGlobalLoading && setDateRange({ from, to })}
                            disabled={isGlobalLoading}
                        />
                    </div>

                    {/* Customer Name Filter Dropdown */}
                    <div className="qa2-fg" style={{ width: '270px', flex: '0 0 auto', position: 'relative' }} ref={customerRef}>
                        <label className="qa2-fl">Customer Name</label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <button
                                type="button"
                                disabled={isGlobalLoading}
                                className={`qa2-cust-select-trigger${customerDropdownOpen ? " active" : ""}${selectedCustomers.length > 0 ? " has-filter" : ""}${isGlobalLoading ? " disabled" : ""}`}
                                onClick={() => !isGlobalLoading && setCustomerDropdownOpen(!customerDropdownOpen)}
                                title={isGlobalLoading ? "Data is loading..." : "Filter by Customer Name"}
                                style={isGlobalLoading ? { cursor: 'not-allowed', opacity: 0.65 } : {}}
                            >
                                <Users size={14} className="qa2-cust-trigger-icon" />
                                <span className="qa2-cust-trigger-label">
                                    {selectedCustomers.length === 0
                                        ? "All Customers"
                                        : selectedCustomers.length === 1
                                            ? selectedCustomers[0]
                                            : `${selectedCustomers.length} Customers`}
                                </span>
                                {selectedCustomers.length > 0 && (
                                    <span className="qa2-cust-count-badge">{selectedCustomers.length}</span>
                                )}
                                <ChevronDown size={13} className={`qa2-cust-arrow-icon${customerDropdownOpen ? " open" : ""}`} />
                            </button>

                            {customerDropdownOpen && !isGlobalLoading && (
                                <div className="qa2-cust-dropdown-panel">
                                    <div className="qa2-cust-search-row">
                                        <Search size={13} className="qa2-cust-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search customers..."
                                            className="qa2-cust-search-input"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                        {customerSearch && (
                                            <button
                                                type="button"
                                                className="qa2-cust-search-clear"
                                                onClick={(e) => { e.stopPropagation(); setCustomerSearch(""); }}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="qa2-cust-list-scroll">
                                        {/* All Customers Option */}
                                        <div
                                            className={`qa2-cust-item${selectedCustomers.length === 0 ? " is-active" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCustomers([]);
                                            }}
                                        >
                                            <div className={`qa2-cust-check-box${selectedCustomers.length === 0 ? " checked" : ""}`}>
                                                {selectedCustomers.length === 0 && <Check size={11} strokeWidth={3} />}
                                            </div>
                                            <span className="qa2-cust-item-title">All Customers</span>
                                            <span className="qa2-cust-item-meta">{uniqueCustomerNames.length}</span>
                                        </div>

                                        <div className="qa2-cust-divider" />

                                        {filteredDropdownCustomers.length === 0 ? (
                                            <div className="qa2-cust-empty">
                                                No customers found
                                            </div>
                                        ) : (
                                            filteredDropdownCustomers.map((cust) => {
                                                const isSelected = selectedCustomers.includes(cust);
                                                return (
                                                    <div
                                                        key={cust}
                                                        className={`qa2-cust-item${isSelected ? " is-active" : ""}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCustomerToggle(cust);
                                                        }}
                                                    >
                                                        <div className={`qa2-cust-check-box${isSelected ? " checked" : ""}`}>
                                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                                        </div>
                                                        <span className="qa2-cust-item-title" title={cust}>{cust}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {selectedCustomers.length > 0 && (
                                        <div className="qa2-cust-footer">
                                            <button
                                                type="button"
                                                className="qa2-cust-reset-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCustomers([]);
                                                }}
                                            >
                                                Reset to All Customers
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="qa2-fg" style={{ width: '240px', flex: '0 0 auto' }}>
                        <label className="qa2-fl">Search Records</label>
                        <div className="qa2-search-input-wrapper" style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="text"
                                className="qa2-fi"
                                disabled={isGlobalLoading}
                                style={{ width: '100%', padding: '0.65rem 2.25rem 0.65rem 2.25rem', background: isGlobalLoading ? '#f8fafc' : '#ffffff', cursor: isGlobalLoading ? 'not-allowed' : 'text', opacity: isGlobalLoading ? 0.65 : 1 }}
                                placeholder={isGlobalLoading ? "Loading data..." : "Search by description, ID, etc..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            {searchQuery && (
                                <button
                                    type="button"
                                    disabled={isGlobalLoading}
                                    onClick={() => !isGlobalLoading && setSearchQuery("")}
                                    style={{
                                        position: 'absolute',
                                        right: '0.8rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: isGlobalLoading ? 'not-allowed' : 'pointer',
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

                    {(selectedCustomers.length > 0 || searchQuery) && (
                        <div className="qa2-fg" style={{ flex: '0 0 auto' }}>
                            <button
                                type="button"
                                disabled={isGlobalLoading}
                                className="qa2-reset-btn"
                                onClick={() => !isGlobalLoading && resetFilters()}
                                title="Reset all filters"
                                style={isGlobalLoading ? { cursor: 'not-allowed', opacity: 0.65 } : {}}
                            >
                                <RotateCcw size={13} /> Reset Filters
                            </button>
                        </div>
                    )}
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
                        { lbl: "Period", val: activeSummaryStrip.period, cls: "" },
                        { lbl: "Total Inspected", val: activeSummaryStrip.totalInspected, cls: "qa2-blue" },
                        { lbl: "Pass Rate", val: activeSummaryStrip.passRate, cls: "qa2-green" },
                        { lbl: "Total Rejected", val: activeSummaryStrip.totalRejected, cls: "qa2-red" },
                        { lbl: "Rework", val: activeSummaryStrip.rework, cls: "qa2-orange" },
                        { lbl: "Final Insp. Pending", val: activeSummaryStrip.pending, cls: "qa2-yellow" },
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
                <div className="qa2-kpi-grid" data-spotlight="qa-kpis">
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
                <div className="qa2-kpi-grid" data-spotlight="qa-kpis">
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-weekly-trend" style={{ marginBottom: 0 }}>
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-results-split">
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-defect-breakdown">
                    <SectionHead icon={AlertTriangle} iconColor="#ef4444" title="Defect Category Breakdown" />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ justifyContent: "center", alignItems: "center", height: "192px" }}>
                            <div className="qa2-skeleton qa2-shimmer qa2-skeleton-circle" style={{ width: "100px", height: "100px", border: "10px solid #f1f5f9" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.defect_donut || !chartsData?.defect_donut?.datasets?.[0]?.data?.some(v => Number(v) > 0)) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={defectRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 2: 2-col ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-ppm-trend">
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-defect-causes">
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
                    ) : (hasNoData || !chartsData?.pareto || !chartsData?.pareto?.labels?.length || !chartsData?.pareto?.datasets?.[0]?.data?.some(v => Number(v) > 0)) ? (
                        <QualityEmptyState message="No Data found on this period" height="192px" />
                    ) : (
                        <div className="qa2-chart-wrap"><canvas ref={paretoRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Charts Row 3: Rejection & Rework Analytics ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">
                {/* Rejection Analytics Trend Card */}
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-rejection-trend" style={{ overflow: "visible" }}>
                    <SectionHead
                        icon={AlertTriangle}
                        iconColor="#ef4444"
                        title="Rejection Analytics Trend"
                        badge={activeRejectionTrendData.rate}
                        badgeCls="qa2-badge-red"
                        extra={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {/* Rejection Customer Filter */}
                                <div style={{ position: 'relative' }} ref={trendRejCustRef}>
                                    <button
                                        type="button"
                                        className={`qa2-trend-filter-btn${trendRejCustDropdownOpen ? " active" : ""}${trendRejCustFilter.length > 0 ? " has-filter" : ""}`}
                                        onClick={() => setTrendRejCustDropdownOpen(!trendRejCustDropdownOpen)}
                                        title="Filter Rejection by Customer"
                                    >
                                        <Building2 size={12} className="qa2-trend-filter-icon" />
                                        <span className="qa2-trend-filter-label">
                                            {trendRejCustFilter.length === 0
                                                ? "Customer: All"
                                                : trendRejCustFilter.length === 1
                                                    ? trendRejCustFilter[0]
                                                    : `${trendRejCustFilter.length} Customers`}
                                        </span>
                                        {trendRejCustFilter.length > 0 && (
                                            <span className="qa2-trend-filter-badge">{trendRejCustFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className={`qa2-trend-arrow${trendRejCustDropdownOpen ? " open" : ""}`} />
                                    </button>

                                    {trendRejCustDropdownOpen && (
                                        <div className="qa2-trend-dropdown-panel">
                                            <div className="qa2-cust-search-row">
                                                <Search size={12} className="qa2-cust-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search customer..."
                                                    className="qa2-cust-search-input"
                                                    value={trendRejCustSearch}
                                                    onChange={(e) => setTrendRejCustSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {trendRejCustSearch && (
                                                    <button type="button" className="qa2-cust-search-clear" onClick={(e) => { e.stopPropagation(); setTrendRejCustSearch(""); }}>
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="qa2-cust-list-scroll">
                                                <div
                                                    className={`qa2-cust-item${trendRejCustFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); setTrendRejCustFilter([]); }}
                                                >
                                                    <div className={`qa2-cust-check-box${trendRejCustFilter.length === 0 ? " checked" : ""}`}>
                                                        {trendRejCustFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="qa2-cust-item-title" style={{ fontWeight: 600 }}>All Customers</span>
                                                </div>
                                                {filteredRejDropdownCustomers.map((cust, idx) => {
                                                    const isChecked = trendRejCustFilter.includes(cust);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`qa2-cust-item${isChecked ? " is-active" : ""}`}
                                                            onClick={(e) => { e.stopPropagation(); handleTrendRejCustToggle(cust); }}
                                                        >
                                                            <div className={`qa2-cust-check-box${isChecked ? " checked" : ""}`}>
                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                            <span className="qa2-cust-item-title" title={cust}>{cust}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Rejection Part No Filter */}
                                <div style={{ position: 'relative' }} ref={trendRejPartRef}>
                                    <button
                                        type="button"
                                        className={`qa2-trend-filter-btn${trendRejPartDropdownOpen ? " active" : ""}${trendRejPartFilter.length > 0 ? " has-filter" : ""}`}
                                        onClick={() => setTrendRejPartDropdownOpen(!trendRejPartDropdownOpen)}
                                        title="Filter Rejection by Part No"
                                    >
                                        <Package size={12} className="qa2-trend-filter-icon" />
                                        <span className="qa2-trend-filter-label">
                                            {trendRejPartFilter.length === 0
                                                ? "Part: All"
                                                : trendRejPartFilter.length === 1
                                                    ? trendRejPartFilter[0]
                                                    : `${trendRejPartFilter.length} Parts`}
                                        </span>
                                        {trendRejPartFilter.length > 0 && (
                                            <span className="qa2-trend-filter-badge">{trendRejPartFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className={`qa2-trend-arrow${trendRejPartDropdownOpen ? " open" : ""}`} />
                                    </button>

                                    {trendRejPartDropdownOpen && (
                                        <div className="qa2-trend-dropdown-panel">
                                            <div className="qa2-cust-search-row">
                                                <Search size={12} className="qa2-cust-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search part..."
                                                    className="qa2-cust-search-input"
                                                    value={trendRejPartSearch}
                                                    onChange={(e) => setTrendRejPartSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {trendRejPartSearch && (
                                                    <button type="button" className="qa2-cust-search-clear" onClick={(e) => { e.stopPropagation(); setTrendRejPartSearch(""); }}>
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="qa2-cust-list-scroll">
                                                <div
                                                    className={`qa2-cust-item${trendRejPartFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); setTrendRejPartFilter([]); }}
                                                >
                                                    <div className={`qa2-cust-check-box${trendRejPartFilter.length === 0 ? " checked" : ""}`}>
                                                        {trendRejPartFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="qa2-cust-item-title" style={{ fontWeight: 600 }}>All Parts</span>
                                                </div>
                                                {filteredRejDropdownParts.map((part, idx) => {
                                                    const isChecked = trendRejPartFilter.includes(part);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`qa2-cust-item${isChecked ? " is-active" : ""}`}
                                                            onClick={(e) => { e.stopPropagation(); handleTrendRejPartToggle(part); }}
                                                        >
                                                            <div className={`qa2-cust-check-box${isChecked ? " checked" : ""}`}>
                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                            <span className="qa2-cust-item-title" title={part}>{part}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {(trendRejCustFilter.length > 0 || trendRejPartFilter.length > 0) && (
                                    <button
                                        type="button"
                                        onClick={() => { setTrendRejCustFilter([]); setTrendRejPartFilter([]); }}
                                        className="qa2-trend-reset-btn"
                                        title="Reset Rejection Filters"
                                    >
                                        <RotateCcw size={11} />
                                    </button>
                                )}
                            </div>
                        }
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "250px" }}>
                            <div className="qa2-skeleton qa2-shimmer" style={{ height: "100%", borderRadius: "8px" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.trend) ? (
                        <QualityEmptyState message="No Data found on this period" height="250px" />
                    ) : (
                        <div className="qa2-chart-wrap" style={{ height: "250px" }}><canvas ref={rejectionRef} /></div>
                    )}
                </div>

                {/* Rework Analytics Trend Card */}
                <div className="qa2-card qa2-chart-card qa2-card-premium" data-spotlight="qa-rework-trend" style={{ overflow: "visible" }}>
                    <SectionHead
                        icon={Wrench}
                        iconColor="#f97316"
                        title="Rework Analytics Trend"
                        badge={activeReworkTrendData.rate}
                        badgeCls="qa2-badge-orange"
                        extra={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {/* Rework Customer Filter */}
                                <div style={{ position: 'relative' }} ref={trendRwkCustRef}>
                                    <button
                                        type="button"
                                        className={`qa2-trend-filter-btn${trendRwkCustDropdownOpen ? " active" : ""}${trendRwkCustFilter.length > 0 ? " has-filter" : ""}`}
                                        onClick={() => setTrendRwkCustDropdownOpen(!trendRwkCustDropdownOpen)}
                                        title="Filter Rework by Customer"
                                    >
                                        <Building2 size={12} className="qa2-trend-filter-icon" />
                                        <span className="qa2-trend-filter-label">
                                            {trendRwkCustFilter.length === 0
                                                ? "Customer: All"
                                                : trendRwkCustFilter.length === 1
                                                    ? trendRwkCustFilter[0]
                                                    : `${trendRwkCustFilter.length} Customers`}
                                        </span>
                                        {trendRwkCustFilter.length > 0 && (
                                            <span className="qa2-trend-filter-badge">{trendRwkCustFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className={`qa2-trend-arrow${trendRwkCustDropdownOpen ? " open" : ""}`} />
                                    </button>

                                    {trendRwkCustDropdownOpen && (
                                        <div className="qa2-trend-dropdown-panel">
                                            <div className="qa2-cust-search-row">
                                                <Search size={12} className="qa2-cust-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search customer..."
                                                    className="qa2-cust-search-input"
                                                    value={trendRwkCustSearch}
                                                    onChange={(e) => setTrendRwkCustSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {trendRwkCustSearch && (
                                                    <button type="button" className="qa2-cust-search-clear" onClick={(e) => { e.stopPropagation(); setTrendRwkCustSearch(""); }}>
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="qa2-cust-list-scroll">
                                                <div
                                                    className={`qa2-cust-item${trendRwkCustFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); setTrendRwkCustFilter([]); }}
                                                >
                                                    <div className={`qa2-cust-check-box${trendRwkCustFilter.length === 0 ? " checked" : ""}`}>
                                                        {trendRwkCustFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="qa2-cust-item-title" style={{ fontWeight: 600 }}>All Customers</span>
                                                </div>
                                                {filteredRwkDropdownCustomers.map((cust, idx) => {
                                                    const isChecked = trendRwkCustFilter.includes(cust);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`qa2-cust-item${isChecked ? " is-active" : ""}`}
                                                            onClick={(e) => { e.stopPropagation(); handleTrendRwkCustToggle(cust); }}
                                                        >
                                                            <div className={`qa2-cust-check-box${isChecked ? " checked" : ""}`}>
                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                            <span className="qa2-cust-item-title" title={cust}>{cust}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Rework Part No Filter */}
                                <div style={{ position: 'relative' }} ref={trendRwkPartRef}>
                                    <button
                                        type="button"
                                        className={`qa2-trend-filter-btn${trendRwkPartDropdownOpen ? " active" : ""}${trendRwkPartFilter.length > 0 ? " has-filter" : ""}`}
                                        onClick={() => setTrendRwkPartDropdownOpen(!trendRwkPartDropdownOpen)}
                                        title="Filter Rework by Part No"
                                    >
                                        <Package size={12} className="qa2-trend-filter-icon" />
                                        <span className="qa2-trend-filter-label">
                                            {trendRwkPartFilter.length === 0
                                                ? "Part: All"
                                                : trendRwkPartFilter.length === 1
                                                    ? trendRwkPartFilter[0]
                                                    : `${trendRwkPartFilter.length} Parts`}
                                        </span>
                                        {trendRwkPartFilter.length > 0 && (
                                            <span className="qa2-trend-filter-badge">{trendRwkPartFilter.length}</span>
                                        )}
                                        <ChevronDown size={11} className={`qa2-trend-arrow${trendRwkPartDropdownOpen ? " open" : ""}`} />
                                    </button>

                                    {trendRwkPartDropdownOpen && (
                                        <div className="qa2-trend-dropdown-panel">
                                            <div className="qa2-cust-search-row">
                                                <Search size={12} className="qa2-cust-search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Search part..."
                                                    className="qa2-cust-search-input"
                                                    value={trendRwkPartSearch}
                                                    onChange={(e) => setTrendRwkPartSearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                                {trendRwkPartSearch && (
                                                    <button type="button" className="qa2-cust-search-clear" onClick={(e) => { e.stopPropagation(); setTrendRwkPartSearch(""); }}>
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="qa2-cust-list-scroll">
                                                <div
                                                    className={`qa2-cust-item${trendRwkPartFilter.length === 0 ? " is-active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); setTrendRwkPartFilter([]); }}
                                                >
                                                    <div className={`qa2-cust-check-box${trendRwkPartFilter.length === 0 ? " checked" : ""}`}>
                                                        {trendRwkPartFilter.length === 0 && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="qa2-cust-item-title" style={{ fontWeight: 600 }}>All Parts</span>
                                                </div>
                                                {filteredRwkDropdownParts.map((part, idx) => {
                                                    const isChecked = trendRwkPartFilter.includes(part);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`qa2-cust-item${isChecked ? " is-active" : ""}`}
                                                            onClick={(e) => { e.stopPropagation(); handleTrendRwkPartToggle(part); }}
                                                        >
                                                            <div className={`qa2-cust-check-box${isChecked ? " checked" : ""}`}>
                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                            <span className="qa2-cust-item-title" title={part}>{part}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {(trendRwkCustFilter.length > 0 || trendRwkPartFilter.length > 0) && (
                                    <button
                                        type="button"
                                        onClick={() => { setTrendRwkCustFilter([]); setTrendRwkPartFilter([]); }}
                                        className="qa2-trend-reset-btn"
                                        title="Reset Rework Filters"
                                    >
                                        <RotateCcw size={11} />
                                    </button>
                                )}
                            </div>
                        }
                    />
                    {chartsLoading ? (
                        <div className="qa2-skeleton-chart qa2-pulse-loader" style={{ height: "250px" }}>
                            <div className="qa2-skeleton qa2-shimmer" style={{ height: "100%", borderRadius: "8px" }} />
                        </div>
                    ) : (hasNoData || !chartsData?.trend) ? (
                        <QualityEmptyState message="No Data found on this period" height="250px" />
                    ) : (
                        <div className="qa2-chart-wrap" style={{ height: "250px" }}><canvas ref={reworkRef} /></div>
                    )}
                </div>
            </div>

            {/* ── Product Quality + Defect Cause ── */}
            <div className="qa2-charts-2 qa2-animate qa2-d3">

                {/* Product Quality */}
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-product-quality">
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
                                                <div className="qa2-pq-name" title={p.name}>{p.name}</div>
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
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-defect-cause-analysis">
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
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-vendor-rejection">
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
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-operation-rejection">
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
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-calibration-status">
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

            {/* ── Top 10 Material Rejection + Top 10 Machine Rejection + Dept Rejection (3-Col Grid) ── */}
            <div className="qa2-charts-3-equal qa2-animate qa2-d4">

                {/* Top 10 Material Rejection */}
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-top-material-rejection">
                    <SectionHead icon={Package} iconColor="#f43f5e" title="Top 10 Material Rejection"
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

                {/* Top 10 Machine Rejection */}
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-top-machine-rejection">
                    <SectionHead icon={Activity} iconColor="#0f766e" title="Top 10 Machine Rejection"
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
                <div className="qa2-card qa2-card-premium" data-spotlight="qa-dept-rejection">
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
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium" data-spotlight="qa-inspection-records" style={{ overflow: 'visible' }}>
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
                {/* Table Head Filter Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.65rem 1.25rem', borderBottom: '1px solid rgba(26,84,212,0.08)', background: '#f8fafc', flexWrap: 'wrap', position: 'relative', zIndex: 15 }}>
                    {/* Insp No Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 0 auto', width: '200px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Insp No:</span>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="text"
                                className="qa2-fi"
                                style={{ width: '100%', padding: '0.35rem 1.75rem 0.35rem 1.75rem', fontSize: '0.73rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                placeholder="Filter Insp No..."
                                value={tableInspNoSearch}
                                onChange={(e) => setTableInspNoSearch(e.target.value)}
                            />
                            <Search size={12} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            {tableInspNoSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTableInspNoSearch("")}
                                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer Name Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '0 0 auto', width: '250px', position: 'relative' }} ref={tableCustomerRef}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Customer:</span>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <button
                                type="button"
                                className="qa2-trend-filter-btn"
                                style={{ width: '100%', justifyContent: 'space-between', padding: '0.35rem 0.65rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', height: '31px' }}
                                onClick={() => setTableCustomerDropdownOpen(prev => !prev)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Building2 size={12} style={{ color: '#2d6de8', flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.73rem', fontWeight: 500, color: tableSelectedCustomers.length > 0 ? '#1e293b' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {tableSelectedCustomers.length === 0
                                            ? "All Customers"
                                            : tableSelectedCustomers.length === 1
                                                ? tableSelectedCustomers[0]
                                                : `${tableSelectedCustomers.length} Customers`}
                                    </span>
                                </div>
                                <ChevronDown size={12} style={{ color: '#94a3b8', flexShrink: 0, transform: tableCustomerDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                            </button>

                            {tableCustomerDropdownOpen && (
                                <div className="qa2-trend-dropdown-panel" style={{ width: '270px', top: '100%', marginTop: '4px', left: 0, zIndex: 50 }}>
                                    <div className="qa2-cust-search-wrap">
                                        <Search size={12} className="qa2-cust-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="Search customer..."
                                            className="qa2-cust-search-input"
                                            value={tableCustomerSearch}
                                            onChange={(e) => setTableCustomerSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                        {tableCustomerSearch && (
                                            <button type="button" className="qa2-cust-search-clear" onClick={(e) => { e.stopPropagation(); setTableCustomerSearch(""); }}>
                                                <X size={11} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="qa2-cust-list-scroll" style={{ maxHeight: '200px' }}>
                                        <div
                                            className={`qa2-cust-item${tableSelectedCustomers.length === 0 ? " is-active" : ""}`}
                                            onClick={(e) => { e.stopPropagation(); setTableSelectedCustomers([]); }}
                                        >
                                            <div className={`qa2-cust-check-box${tableSelectedCustomers.length === 0 ? " checked" : ""}`}>
                                                {tableSelectedCustomers.length === 0 && <Check size={11} strokeWidth={3} />}
                                            </div>
                                            <span className="qa2-cust-item-title" style={{ fontWeight: 600 }}>All Customers</span>
                                        </div>
                                        {filteredTableDropdownCustomers.map((cust, idx) => {
                                            const isChecked = tableSelectedCustomers.includes(cust);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`qa2-cust-item${isChecked ? " is-active" : ""}`}
                                                    onClick={(e) => { e.stopPropagation(); handleTableCustomerToggle(cust); }}
                                                >
                                                    <div className={`qa2-cust-check-box${isChecked ? " checked" : ""}`}>
                                                        {isChecked && <Check size={11} strokeWidth={3} />}
                                                    </div>
                                                    <span className="qa2-cust-item-title" title={cust}>{cust}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Part No – Description Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1', minWidth: '220px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Part No – Description:</span>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="text"
                                className="qa2-fi"
                                style={{ width: '100%', padding: '0.35rem 1.75rem 0.35rem 1.75rem', fontSize: '0.73rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                placeholder="Filter Part No or Description..."
                                value={tablePartNoDescSearch}
                                onChange={(e) => setTablePartNoDescSearch(e.target.value)}
                            />
                            <Search size={12} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            {tablePartNoDescSearch && (
                                <button
                                    type="button"
                                    onClick={() => setTablePartNoDescSearch("")}
                                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {(tableInspNoSearch || tableSelectedCustomers.length > 0 || tablePartNoDescSearch) && (
                        <button
                            type="button"
                            onClick={() => { setTableInspNoSearch(""); setTableSelectedCustomers([]); setTablePartNoDescSearch(""); }}
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.3rem 0.65rem', borderRadius: '5px', marginLeft: 'auto' }}
                        >
                            <X size={12} /> Clear Head Filters
                        </button>
                    )}
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
                                    {["Type", "Insp No", "Insp Date", "Part No", "Description", "Process", "Insp Qty", "OK Qty", "Mat Rej Qty", "Mac Rej Qty", "Rej %", "Rework Qty", "Insp By"].map(h => (
                                        <th key={h} className={h.includes("Qty") || h.includes("%") ? "qa2-td-r" : ""}>{h}</th>
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
                                        const partNo = r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : (r.partNoDesc || "—"));
                                        const description = r.description || r.product || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ").slice(1).join(" - ") : "—");
                                        const process = r.process !== undefined ? r.process : "";
                                        const inspQty = r.qty;
                                        const okQty = r.okQty || (r.result === "PASS" ? r.qty : (r.result === "PENDING" ? r.qty : "0"));
                                        const matRejQty = r.matRejQty || (r.result === "FAIL" && !r.product?.toLowerCase().includes("segment") ? r.qty : "0");
                                        const macRejQty = r.macRejQty || (r.result === "FAIL" && r.product?.toLowerCase().includes("segment") ? r.qty : "0");
                                        const rowInspNum = parseFloat(String(inspQty || 0).replace(/,/g, "")) || 0;
                                        const rowTotalRej = (parseFloat(String(matRejQty || 0).replace(/,/g, "")) || 0) + (parseFloat(String(macRejQty || 0).replace(/,/g, "")) || 0);
                                        const rejPct = rowInspNum > 0 ? ((rowTotalRej / rowInspNum) * 100).toFixed(1) : "0.0";
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
                                                <td className="qa2-mono qa2-muted" style={getColStyle("Part No")}>{partNo}</td>
                                                <td style={getColStyle("Description")}>{description}</td>
                                                <td style={getColStyle("Process")}>
                                                    {process ? (
                                                        <span className="qa2-badge qa2-tag-blue" style={{ background: "rgba(224,242,254,0.6)", color: "#0369a1" }}>{process}</span>
                                                    ) : "—"}
                                                </td>
                                                <td className="qa2-td-r" style={{ ...getColStyle("Insp Qty"), fontWeight: 600 }}>{inspQty}</td>
                                                <td className="qa2-td-r qa2-green" style={{ ...getColStyle("OK Qty"), fontWeight: 600 }}>{okQty}</td>
                                                <td className="qa2-td-r qa2-red" style={getColStyle("Mat Rej Qty")}>{matRejQty}</td>
                                                <td className="qa2-td-r qa2-red" style={getColStyle("Mac Rej Qty")}>{macRejQty}</td>
                                                <td className="qa2-td-r" style={getColStyle("Rej %")}>
                                                    {parseFloat(rejPct) > 0 ? (
                                                        <span style={{
                                                            display: "inline-block",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            fontSize: "0.74rem",
                                                            fontWeight: 700,
                                                            background: parseFloat(rejPct) > 5 ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)",
                                                            color: parseFloat(rejPct) > 5 ? "#dc2626" : "#ea580c"
                                                        }}>
                                                            {rejPct}%
                                                        </span>
                                                    ) : (
                                                        <span className="qa2-muted" style={{ fontSize: "0.75rem", fontWeight: 500 }}>0.0%</span>
                                                    )}
                                                </td>
                                                <td className="qa2-td-r qa2-orange" style={getColStyle("Rework Qty")}>{reworkQty}</td>
                                                <td className="qa2-muted qa2-nowrap" style={getColStyle("Insp By")}>{inspBy}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="13" style={{ padding: 0 }}>
                                            <QualityEmptyState message="No Data found on this period" height="240px" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="qa2-total-row">
                                    <td colSpan="6" className="qa2-total-label">Total</td>
                                    <td className="qa2-td-r" style={getColStyle("Insp Qty")}><span className="qa2-total-badge qa2-total-badge-blue">{activeInspectionRowsTotals.insp.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("OK Qty")}><span className="qa2-total-badge qa2-total-badge-green">{activeInspectionRowsTotals.ok.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Mat Rej Qty")}><span className="qa2-total-badge qa2-total-badge-red">{activeInspectionRowsTotals.matRej.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Mac Rej Qty")}><span className="qa2-total-badge qa2-total-badge-red">{activeInspectionRowsTotals.macRej.toLocaleString()}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Rej %")}><span className="qa2-total-badge qa2-total-badge-red">{activeInspectionRowsTotals.rejPct}</span></td>
                                    <td className="qa2-td-r" style={getColStyle("Rework Qty")}><span className="qa2-total-badge qa2-total-badge-orange">{activeInspectionRowsTotals.rework.toLocaleString()}</span></td>
                                    <td style={getColStyle("Insp By")}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Rejection & Rework Summary (Full Width) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium" data-spotlight="qa-rejection-records">
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
                                    {["Insp No", "Insp Type", "Part No", "Description", "Reason", "Qty", "Disposition", "Date"].map(h => (
                                        <th key={h} style={getRejColStyle(h)} className={h === "Qty" ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeRejectionRows.length > 0 ? (
                                    activeRejectionRows.map((r, i) => {
                                        const type = r.inspType || "Job Order";
                                        const typeCls = type.includes("Job") ? "qa2-tag-teal" : "qa2-tag-blue";
                                        const partNo = r.partNo || (r.product && r.product.includes(" - ") ? r.product.split(" - ")[0] : (r.product || "—"));
                                        const description = r.description || (r.product && r.product.includes(" - ") ? r.product.split(" - ").slice(1).join(" - ") : (r.product !== partNo ? r.product : "—"));
                                        return (
                                            <tr key={i} className="qa2-tr">
                                                <td style={getRejColStyle("Insp No")}><span className="qa2-rej-id">{r.id}</span></td>
                                                <td style={getRejColStyle("Insp Type")}>
                                                    <span className={`qa2-badge ${typeCls}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                        {type}
                                                    </span>
                                                </td>
                                                <td className="qa2-mono qa2-muted" style={getRejColStyle("Part No")}>{partNo}</td>
                                                <td style={getRejColStyle("Description")}>{description}</td>
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
                                        <td colSpan="8" style={{ padding: 0 }}>
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
                                        <td style={getRejColStyle("Part No")}></td>
                                        <td style={getRejColStyle("Description")}></td>
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
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium" data-spotlight="qa-supplier-grn">
                <SectionHead
                    icon={PieChart}
                    iconColor="#8b5cf6"
                    title="Supplier Wise Rejection"
                    badge={`${activeSupplierRejections.length} Record${activeSupplierRejections.length !== 1 ? "s" : ""}`}
                    badgeCls="qa2-badge-purple"
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <MultiSelectFilterDropdown
                                title="Supplier Name"
                                options={allSupplierOptions}
                                selectedValues={selectedSuppliers}
                                onChange={setSelectedSuppliers}
                            />
                            <MultiSelectFilterDropdown
                                title="Grn no"
                                options={allGrnOptions}
                                selectedValues={selectedGrnNos}
                                onChange={setSelectedGrnNos}
                            />
                            <MultiSelectFilterDropdown
                                title="Item Details"
                                options={allItemOptions}
                                selectedValues={selectedItems}
                                onChange={setSelectedItems}
                            />
                            {(selectedSuppliers !== null || selectedGrnNos !== null || selectedItems !== null) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedSuppliers(null);
                                        setSelectedGrnNos(null);
                                        setSelectedItems(null);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8b5cf6',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '4px 6px'
                                    }}
                                >
                                    <X size={12} style={{ strokeWidth: 3 }} /> Clear Filters
                                </button>
                            )}
                        </div>
                    }
                />
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
                    <div className="qa2-table-scroll" style={{ margin: 0, padding: 0, background: "#ffffff", borderRadius: "12px", border: "1px solid rgba(226, 232, 240, 0.8)", minHeight: "340px", overflow: "auto" }}>
                        <table className="qa2-table">
                            <thead>
                                <tr>
                                    {["#", "Supplier Name", "Grn no", "Grn Date", "Item Details", "GRN Qty", "UOM", "Ok Qty", "Mat Rej", "Mac Rej"].map(h => (
                                        <th key={h} style={getSuppColStyle(h)} className={["GRN Qty", "Ok Qty", "Mat Rej", "Mac Rej"].includes(h) ? "qa2-th-r" : ""}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeSupplierRejections.length > 0 ? (
                                    activeSupplierRejections.map((r, i) => (
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" style={{ padding: 0 }}>
                                            <QualityEmptyState message="No Supplier Rejections match the selected filters" height="220px" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {activeSupplierRejections.length > 0 && (
                                <tfoot>
                                    <tr className="qa2-total-row">
                                        <td colSpan="5" className="qa2-total-label">Total</td>
                                        <td className="qa2-td-r" style={getSuppColStyle("GRN Qty")}>
                                            <span className="qa2-total-badge qa2-total-badge-blue">{activeSupplierRejectionsTotals.qty.toLocaleString()}</span>
                                        </td>
                                        <td style={getSuppColStyle("UOM")}></td>
                                        <td className="qa2-td-r" style={getSuppColStyle("Ok Qty")}>
                                            <span className="qa2-total-badge qa2-total-badge-green">{activeSupplierRejectionsTotals.okQty.toLocaleString()}</span>
                                        </td>
                                        <td className="qa2-td-r" style={getSuppColStyle("Mat Rej")}>
                                            <span className="qa2-total-badge qa2-total-badge-red">{activeSupplierRejectionsTotals.matRej.toLocaleString()}</span>
                                        </td>
                                        <td className="qa2-td-r" style={getSuppColStyle("Mac Rej")}>
                                            <span className="qa2-total-badge qa2-total-badge-red">{activeSupplierRejectionsTotals.macRej.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Customer Complaints (Full Width) ── */}
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
                <SectionHead
                    icon={AlertCircle}
                    iconColor="#ef4444"
                    title="Customer Complaints Log"
                    badge={`${activeCustomerComplaints.length} Complaint${activeCustomerComplaints.length !== 1 ? "s" : ""}`}
                    badgeCls="qa2-badge-red"
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <MultiSelectFilterDropdown
                                title="Complaint ID"
                                options={allComplaintIdOptions}
                                selectedValues={selectedComplaintIds}
                                onChange={setSelectedComplaintIds}
                                accentColor="#ef4444"
                            />
                            <MultiSelectFilterDropdown
                                title="Customer"
                                options={allComplaintCustomerOptions}
                                selectedValues={selectedComplaintCustomers}
                                onChange={setSelectedComplaintCustomers}
                                accentColor="#ef4444"
                            />
                            <MultiSelectFilterDropdown
                                title="Product"
                                options={allComplaintProductOptions}
                                selectedValues={selectedComplaintProducts}
                                onChange={setSelectedComplaintProducts}
                                accentColor="#ef4444"
                            />
                            {(selectedComplaintIds !== null || selectedComplaintCustomers !== null || selectedComplaintProducts !== null) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedComplaintIds(null);
                                        setSelectedComplaintCustomers(null);
                                        setSelectedComplaintProducts(null);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '4px 6px'
                                    }}
                                >
                                    <X size={12} style={{ strokeWidth: 3 }} /> Clear Filters
                                </button>
                            )}
                        </div>
                    }
                />
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

            {/* ── Quality Timeline (End-to-End Lineage: Invoice -> DC -> Final Insp -> Prod -> GRN -> Supplier) ── */}
            <div data-spotlight="qa-timeline">
                <QualityTimelineSection />
            </div>

            {/* ── Traceability (Full Width) ── */}
            <div className="qa2-card qa2-card-premium qa2-animate qa2-d4" data-spotlight="qa-traceability">
                <SectionHead
                    icon={FileText}
                    iconColor="#8b5cf6"
                    title="Traceability Records"
                    badge={`${activeTraceabilityRows.length} Record${activeTraceabilityRows.length !== 1 ? "s" : ""}`}
                    badgeCls="qa2-badge-purple"
                    extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <MultiSelectFilterDropdown
                                title="Insp No"
                                options={allTraceInspNoOptions}
                                selectedValues={selectedTraceInspNos}
                                onChange={setSelectedTraceInspNos}
                            />
                            <MultiSelectFilterDropdown
                                title="Machine No"
                                options={allTraceMachineNoOptions}
                                selectedValues={selectedTraceMachineNos}
                                onChange={setSelectedTraceMachineNos}
                            />
                            <MultiSelectFilterDropdown
                                title="Part No"
                                options={allTracePartNoOptions}
                                selectedValues={selectedTracePartNos}
                                onChange={setSelectedTracePartNos}
                            />
                            {(selectedTraceInspNos !== null || selectedTraceMachineNos !== null || selectedTracePartNos !== null) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedTraceInspNos(null);
                                        setSelectedTraceMachineNos(null);
                                        setSelectedTracePartNos(null);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#8b5cf6',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '4px 6px'
                                    }}
                                >
                                    <X size={12} style={{ strokeWidth: 3 }} /> Clear Filters
                                </button>
                            )}
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
                                {["#", "Inspno", "Insp Date", "Machine No", "Shift", "Part No", "Description", "Process", "Operator Name / Vendor Name", "Prod Qty", "Ok Qty", "Mat Rej", "Mac Rej", "Rw Qty", "Inspected By", "Routecard Details"].map(h => (
                                    <th key={h} style={getTraceColStyle(h)} className={["Prod Qty", "Ok Qty", "Mat Rej", "Mac Rej", "Rw Qty"].includes(h) ? "qa2-td-r" : ""}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeTraceabilityRows.length > 0 ? (
                                activeTraceabilityRows.map((r, i) => {
                                    const isJobOrder = (r.typeLabel?.toLowerCase().includes("job") || r.id?.toLowerCase().startsWith("ji") || r.id?.toLowerCase().startsWith("jir") || r.inspType?.toLowerCase().includes("job"));
                                    const displayName = isJobOrder
                                        ? (r.cname || r.partyName || r.vendor || getPartyName(r.id, r.product || r.partNoDesc) || "—")
                                        : (r.operatorName || "—");
                                    const partNo = r.partNo || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ")[0] : (r.partNoDesc || "—"));
                                    const description = r.description || r.product || (r.partNoDesc && r.partNoDesc.includes(" - ") ? r.partNoDesc.split(" - ").slice(1).join(" - ") : "—");
                                    const okQty = parseFloat(r.okQty || (r.result === "PASS" ? r.qty : 0)) || 0;
                                    const matRej = parseFloat(r.matRejQty || 0) || 0;
                                    const macRej = parseFloat(r.macRejQty || 0) || 0;
                                    const reworkQty = parseFloat(r.reworkQty || 0) || 0;
                                    const routecardVal = r.roucard || r.routecardDetails || r.routecard || "—";

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
                                            <td style={getTraceColStyle("Part No")} className="qa2-mono qa2-muted">{partNo}</td>
                                            <td style={getTraceColStyle("Description")}>{description}</td>
                                            <td style={getTraceColStyle("Process")}>
                                                {r.process ? (
                                                    <span className="qa2-badge qa2-tag-blue" style={{ background: "rgba(224,242,254,0.6)", color: "#0369a1" }}>{r.process}</span>
                                                ) : "—"}
                                            </td>
                                            <td style={getTraceColStyle("Operator Name / Vendor Name")}>{displayName}</td>
                                            <td style={{ ...getTraceColStyle("Prod Qty"), fontWeight: 600 }} className="qa2-td-r">{r.qty}</td>
                                            <td style={{ ...getTraceColStyle("Ok Qty"), fontWeight: 600 }} className="qa2-td-r qa2-green">{okQty}</td>
                                            <td className="qa2-td-r" style={{ ...getTraceColStyle("Mat Rej"), fontWeight: matRej > 0 ? 600 : 400, color: matRej > 0 ? "#ef4444" : "inherit" }}>{matRej}</td>
                                            <td className="qa2-td-r" style={{ ...getTraceColStyle("Mac Rej"), fontWeight: macRej > 0 ? 600 : 400, color: macRej > 0 ? "#ef4444" : "inherit" }}>{macRej}</td>
                                            <td className="qa2-td-r" style={{ ...getTraceColStyle("Rw Qty"), fontWeight: reworkQty > 0 ? 600 : 400, color: reworkQty > 0 ? "#f97316" : "inherit" }}>{reworkQty}</td>
                                            <td style={getTraceColStyle("Inspected By")}>{r.inspBy}</td>
                                            <td style={getTraceColStyle("Routecard Details")} className="qa2-mono qa2-muted">{routecardVal}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="16" style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                                        No traceability records found for the selected period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {activeTraceabilityRows.length > 0 && (
                            <tfoot>
                                <tr className="qa2-total-row">
                                    <td colSpan="9" className="qa2-total-label">Total</td>
                                    <td className="qa2-td-r" style={getTraceColStyle("Prod Qty")}>
                                        <span className="qa2-total-badge qa2-total-badge-blue">{activeTraceabilityRowsTotals.prodQty.toLocaleString()}</span>
                                    </td>
                                    <td className="qa2-td-r" style={getTraceColStyle("Ok Qty")}>
                                        <span className="qa2-total-badge qa2-total-badge-green">{activeTraceabilityRowsTotals.okQty.toLocaleString()}</span>
                                    </td>
                                    <td className="qa2-td-r" style={getTraceColStyle("Mat Rej")}>
                                        <span className="qa2-total-badge qa2-total-badge-red">{activeTraceabilityRowsTotals.matRej.toLocaleString()}</span>
                                    </td>
                                    <td className="qa2-td-r" style={getTraceColStyle("Mac Rej")}>
                                        <span className="qa2-total-badge qa2-total-badge-red">{activeTraceabilityRowsTotals.macRej.toLocaleString()}</span>
                                    </td>
                                    <td className="qa2-td-r" style={getTraceColStyle("Rw Qty")}>
                                        <span className="qa2-total-badge qa2-total-badge-orange">{activeTraceabilityRowsTotals.reworkQty.toLocaleString()}</span>
                                    </td>
                                    <td style={getTraceColStyle("Inspected By")}></td>
                                    <td style={getTraceColStyle("Routecard Details")}></td>
                                </tr>
                            </tfoot>
                        )}
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