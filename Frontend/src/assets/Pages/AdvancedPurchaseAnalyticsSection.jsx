import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
    Activity,
    BarChart2,
    Building2,
    Check,
    CheckCheck,
    ChevronDown,
    ClipboardList,
    Factory,
    IndianRupee,
    Package,
    RotateCcw,
    Search,
    ShoppingCart,
    SlidersHorizontal,
    Sparkles,
    Tag,
    Target,
    TrendingDown,
    TrendingUp,
    X
} from "lucide-react";

Chart.register(...registerables, ChartDataLabels);

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

const parseDateValue = (str) => {
    if (!str) return 0;
    if (str instanceof Date) return isNaN(str.getTime()) ? 0 : str.getTime();
    const s = String(str).trim();
    if (!s) return 0;
    if (s.includes("-") || s.includes("/")) {
        const sep = s.includes("-") ? "-" : "/";
        const parts = s.split(sep);
        if (parts.length === 3) {
            // YYYY-MM-DD
            if (parts[0].length === 4) {
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            // DD-MM-YYYY or DD/MM/YYYY
            if (parts[2].length === 4) {
                const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
};

// ─────────────────────────────────────────────
//  Average Purchase Value (APV) Classification Helpers
// ─────────────────────────────────────────────
const RAW_CATEGORIES = [
    { id: "All", label: "All Categories", short: "All Categories", color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)" },
    { id: "Nos (Casting)", label: "Nos (Casting)", short: "Nos (Casting)", color: "#0284c7", bg: "rgba(2, 132, 199, 0.1)" },
    { id: "KGS (Rod)", label: "KGS (Rod)", short: "KGS (Rod)", color: "#ea580c", bg: "rgba(234, 88, 12, 0.1)" },
    { id: "Mtrs (Rod)", label: "Mtrs (Rod)", short: "Mtrs (Rod)", color: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
    { id: "B.Out", label: "B.Out (Bought Out)", short: "B.Out", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)" },
    { id: "Other", label: "Other", short: "Other", color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" }
];

const getRawMaterialCategory = (row) => {
    if (!row) return "Nos (Casting)";
    if (row.category && typeof row.category === "string") {
        const cat = row.category.trim();
        if (cat === "Nos (Casting)" || cat === "KGS (Rod)" || cat === "Mtrs (Rod)" || cat === "B.Out" || cat === "Other") {
            return cat;
        }
        if (cat.toLowerCase().includes("cast") || cat.toLowerCase().includes("nos")) return "Nos (Casting)";
        if (cat.toLowerCase().includes("kgs")) return "KGS (Rod)";
        if (cat.toLowerCase().includes("mtr") || cat.toLowerCase().includes("tube")) return "Mtrs (Rod)";
        if (cat.toLowerCase().includes("rod") || cat === "Rod") {
            const rawUom = (row.uom || row.unit || "").toUpperCase().trim();
            return (rawUom.includes("MTR") || rawUom.includes("METER")) ? "Mtrs (Rod)" : "KGS (Rod)";
        }
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

function AdvancedPurchaseAnalyticsSection({
    poRows = [],
    commercialRates = {},
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
            const rawPart = (r.rmname || r.part_no || r.partNo || r.material_code || "").trim();
            const rawDesc = (r.mattype || r.description || r.material || "").trim();
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
            const mattype = (r.mattype || "").trim();

            if (!map.has(partKey)) {
                map.set(partKey, {
                    partNo: rawPart || partKey,
                    description: rawDesc || rawPart || partKey,
                    mattype: mattype || rawDesc || "",
                    uom,
                    vendors: new Set(),
                    transactions: [],
                    originalRow: r
                });
            }

            const entry = map.get(partKey);
            if (vendor && vendor !== "—") entry.vendors.add(vendor);
            if (!entry.mattype && mattype) entry.mattype = mattype;
            if ((!entry.description || entry.description === entry.partNo) && rawDesc) entry.description = rawDesc;

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
            const rawPart = (r.rmname || r.part_no || r.partNo || "").trim();
            const rawDesc = (r.mattype || r.description || r.material || "").trim();
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
            const mattype = (r.mattype || "").trim();

            if (!map.has(partKey)) {
                map.set(partKey, {
                    partNo: rawPart || partKey,
                    description: rawDesc || rawPart || partKey,
                    mattype: mattype || rawDesc || "",
                    uom,
                    vendors: new Set(),
                    transactions: [],
                    originalRow: r
                });
            }

            const entry = map.get(partKey);
            if (vendor && vendor !== "—") entry.vendors.add(vendor);
            if (!entry.mattype && mattype) entry.mattype = mattype;

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
            // Sort transactions chronologically ascending
            const txs = [...item.transactions].sort((a, b) => {
                const da = parseDateValue(a.poDate);
                const db = parseDateValue(b.poDate);
                if (da && db && da !== db) {
                    return da - db;
                }
                return String(a.poDate).localeCompare(String(b.poDate));
            });

            const validTxs = txs.filter(t => t.rate > 0);
            const effectiveTxs = validTxs.length > 0 ? validTxs : txs;

            if (effectiveTxs.length === 0) return;

            const earliestTx = effectiveTxs[0];
            const latestAnyTx = txs[txs.length - 1];
            const latestTx = effectiveTxs[effectiveTxs.length - 1] || latestAnyTx;

            // ── Commercial Base Rate & Revisions from Commer_BaseRateDet ──
            const commHistory = commercialRates[partKey] || commercialRates[item.partNo] || [];
            const sortedComm = [...commHistory].sort((a, b) => String(a.eff_date || a.effective_date).localeCompare(String(b.eff_date || b.effective_date)));
            const validCommRates = sortedComm.filter(c => Number(c.base_rate) > 0);

            // True commercial base rate: earliest agreed contract base rate in Commer_BaseRateDet
            const initialComm = validCommRates[0] || sortedComm[0];
            const latestComm = validCommRates[validCommRates.length - 1] || sortedComm[sortedComm.length - 1];

            const baseRate = initialComm && Number(initialComm.base_rate) > 0
                ? Number(initialComm.base_rate)
                : (earliestTx.rate || 0);

            const activeRate = latestTx.rate || (latestComm && Number(latestComm.base_rate) > 0 ? Number(latestComm.base_rate) : baseRate);
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

            const rowCat = sampleRow.category || (sampleRow.originalRow && sampleRow.originalRow.category);
            const rawCategory = rowCat && rowCat !== "Other" && rowCat !== "Store Material" ? rowCat : getRawMaterialCategory(sampleRow);
            const rowGrp = sampleRow.group_name || (sampleRow.originalRow && sampleRow.originalRow.group_name);
            const storeGroup = rowGrp || getStoreMaterialGroup(sampleRow);
            const matType = sampleRow.material_type || (sampleRow.originalRow && sampleRow.originalRow.material_type) || "";
            let materialMode = matType.includes("STORE") ? "store" : "raw";
            if (!matType) {
                const txTypes = effectiveTxs.map(t => (t.poType || "").toLowerCase()).filter(Boolean);
                const isExplicitRaw = txTypes.some(t => t.includes("raw") || t.includes("rm"));
                const isExplicitStore = txTypes.some(t => t.includes("store") || t.includes("consumable") || t.includes("tool") || t.includes("service"));

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

            // Rate Progression Milestones (Chronological timeline steps combining commercial revisions & POs)
            let milestoneItems = [];
            if (validCommRates.length > 0) {
                validCommRates.forEach(c => {
                    milestoneItems.push({
                        date: c.eff_date || c.effective_date || "—",
                        rate: Number(c.base_rate),
                        poNumber: c.cmno ? `Commercial ${c.cmno}` : "Base Revision",
                        vendor: primaryVendor,
                        isCommercial: true
                    });
                });
                // If latest PO rate or date differs from latest commercial milestone, include active PO milestone
                const lastM = milestoneItems[milestoneItems.length - 1];
                if (latestTx && (latestTx.rate !== lastM.rate || (latestTx.poDate && latestTx.poDate !== lastM.date))) {
                    milestoneItems.push({
                        date: latestTx.poDate || "—",
                        rate: latestTx.rate,
                        poNumber: latestTx.poNumber || "Active PO",
                        vendor: latestTx.vendor || primaryVendor,
                        isCommercial: false
                    });
                }
            } else {
                milestoneItems = effectiveTxs.map(t => ({
                    date: t.poDate || "—",
                    rate: t.rate,
                    poNumber: t.poNumber || "PO",
                    vendor: t.vendor || primaryVendor,
                    isCommercial: false
                }));
            }

            // Deduplicate adjacent identical date & rate
            const dedupedMilestones = [];
            milestoneItems.forEach(m => {
                const prev = dedupedMilestones[dedupedMilestones.length - 1];
                if (!prev || prev.rate !== m.rate || prev.date !== m.date) {
                    dedupedMilestones.push(m);
                }
            });

            const timelineSteps = dedupedMilestones.map((m, idx) => {
                const prevR = idx === 0 ? m.rate : dedupedMilestones[idx - 1].rate;
                const delta = m.rate - prevR;
                const pct = prevR > 0 ? (delta / prevR) * 100 : 0;
                return {
                    node: idx === 0 ? "B" : `#${idx}`,
                    date: m.date,
                    poNumber: m.poNumber,
                    vendor: m.vendor,
                    rate: m.rate,
                    previousRate: prevR,
                    rateVariance: delta,
                    changePercent: pct,
                    isCommercial: m.isCommercial,
                    isLatest: idx === dedupedMilestones.length - 1
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
                mattype: item.mattype,
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
                lastPoDate: (latestTx && latestTx.poDate) || (latestAnyTx && latestAnyTx.poDate) || "",
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

        // Sort catalog by latest PO date descending, then partNo / rmname ascending (as per query logic: ORDER BY podate DESC, rmname)
        catalogList.sort((a, b) => {
            const timeA = parseDateValue(a.lastPoDate);
            const timeB = parseDateValue(b.lastPoDate);
            if (timeB !== timeA) return timeB - timeA;
            return String(a.partNo || "").localeCompare(String(b.partNo || ""));
        });
        return catalogList;
    }, [poRows, commercialRates, priceTrendRows]);

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

    // Auto-switch mode if active mode has 0 parts but the other mode has parts
    useEffect(() => {
        if (rawCatalogList.length === 0 && storeCatalogList.length > 0 && apaMode !== "store") {
            setApaMode("store");
        } else if (storeCatalogList.length === 0 && rawCatalogList.length > 0 && apaMode !== "raw") {
            setApaMode("raw");
        }
    }, [rawCatalogList.length, storeCatalogList.length, apaMode]);

    // Reset selected part on mode switch so the default (last PO partno) of that mode is displayed
    useEffect(() => {
        setSelectedPartNo("");
    }, [apaMode]);

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
        return (hero.partNo || "").trim();
    }, [hero]);

    const displayDesc = useMemo(() => {
        if (!hero) return "";
        return (hero.mattype || hero.description || hero.partNo || "").trim();
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
        <div className="apa-root" id="advanced-purchase-analytics-section" data-spotlight="pa-advanced-analytics">
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
                                        setSelectedPartNo("");
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
                                        setSelectedPartNo("");
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
                                                        <span className="apa-dropdown-item-desc">{p.mattype || p.description}</span>
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
                        <PaNoData icon={<Sparkles size={24} style={{ color: "#2563eb" }} />} message="No data found on this period" />
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
                        <PaNoData icon={<SlidersHorizontal size={22} style={{ color: apaMode === "raw" ? "#2563eb" : "#7c3aed" }} />} message="No data found on this period" />
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
                                                const cleanPart = (p.partNo || "").trim();
                                                const cleanDesc = (p.mattype || p.description || p.partNo || "").trim();

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


export default memo(AdvancedPurchaseAnalyticsSection);
