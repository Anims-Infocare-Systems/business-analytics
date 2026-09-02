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
    Inbox,
    Check,
    Building2,
    RotateCcw
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
                        width: "240px",
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

                    <div style={{ maxHeight: "170px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => {
                                const checked = currentSelected.includes(opt);
                                return (
                                    <label
                                        key={opt}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "4px 6px",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "0.72rem",
                                            color: "#334155",
                                            userSelect: "none",
                                            transition: "background 0.1s ease",
                                            background: checked ? checkedItemBg : "transparent"
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
                                                height: "13px"
                                            }}
                                        />
                                        <span style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            fontWeight: checked ? 600 : 400,
                                            color: "#0f172a"
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
        const set = new Set();
        rawCustomerComplaints.forEach(c => { if (c && c.customer_name) set.add(c.customer_name); });
        return Array.from(set).sort();
    }, [rawCustomerComplaints]);

    const allComplaintProductOptions = useMemo(() => {
        const set = new Set();
        rawCustomerComplaints.forEach(c => { if (c && c.product) set.add(c.product); });
        return Array.from(set).sort();
    }, [rawCustomerComplaints]);

    const uniqueCustomerNames = useMemo(() => {
        const set = new Set();
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
        // Extract from supplier rejections
        rawSupplierRejections.forEach(s => {
            const name = (s.supplier || "").trim();
            if (name && name !== "—" && name !== "-") set.add(name);
        });
        return Array.from(set).sort();
    }, [recordsData, rawCustomerComplaints, rawSupplierRejections]);

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
        const set = new Set();
        (recordsData?.inspection_records || []).forEach(r => {
            const name = (r.partyName || r.cname || r.vendor || (r.typeLabel?.includes("Job") ? getPartyName(r.id, r.product || r.partNoDesc) : "")).trim();
            if (name && name !== "—" && name !== "-") set.add(name);
        });
        return Array.from(set).sort();
    }, [recordsData]);

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
        if (!trendRejCustSearch.trim()) return uniqueCustomerNames;
        const q = trendRejCustSearch.toLowerCase().trim();
        return uniqueCustomerNames.filter(c => c.toLowerCase().includes(q));
    }, [uniqueCustomerNames, trendRejCustSearch]);

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
        if (!trendRwkCustSearch.trim()) return uniqueCustomerNames;
        const q = trendRwkCustSearch.toLowerCase().trim();
        return uniqueCustomerNames.filter(c => c.toLowerCase().includes(q));
    }, [uniqueCustomerNames, trendRwkCustSearch]);

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
                const sName = r.supplier ? (r.supplier.length > 20 ? r.supplier.substring(0, 18) + "..." : r.supplier) : "Unknown";
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

                    {/* Customer Name Filter Dropdown */}
                    <div className="qa2-fg" style={{ width: '270px', flex: '0 0 auto', position: 'relative' }} ref={customerRef}>
                        <label className="qa2-fl">Customer Name</label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <button
                                type="button"
                                className={`qa2-cust-select-trigger${customerDropdownOpen ? " active" : ""}${selectedCustomers.length > 0 ? " has-filter" : ""}`}
                                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                title="Filter by Customer Name"
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

                            {customerDropdownOpen && (
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

                    {(selectedCustomers.length > 0 || searchQuery) && (
                        <div className="qa2-fg" style={{ flex: '0 0 auto' }}>
                            <button
                                type="button"
                                className="qa2-reset-btn"
                                onClick={resetFilters}
                                title="Reset all filters"
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
                    ) : (hasNoData || !chartsData?.defect_donut || !chartsData?.defect_donut?.datasets?.[0]?.data?.some(v => Number(v) > 0)) ? (
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" style={{ overflow: "visible" }}>
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
                <div className="qa2-card qa2-chart-card qa2-card-premium" style={{ overflow: "visible" }}>
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

            {/* ── Top 10 Material Rejection + Top 10 Machine Rejection + Dept Rejection (3-Col Grid) ── */}
            <div className="qa2-charts-3-equal qa2-animate qa2-d4">

                {/* Top 10 Material Rejection */}
                <div className="qa2-card qa2-card-premium">
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
                <div className="qa2-card qa2-card-premium">
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
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium" style={{ overflow: 'visible' }}>
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
            <div className="qa2-card qa2-animate qa2-d4 qa2-card-premium">
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

            {/* ── Traceability (Full Width) ── */}
            <div className="qa2-card qa2-card-premium qa2-animate qa2-d4">
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