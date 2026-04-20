/**
 * TApproval.jsx  —  T-Approval Dashboard (Transport / Travel Approvals)
 * Prefix: tap-   |   Theme: Teal / Emerald
 * Updated: collapsible groups + rich E-Approval-style detail preview modal
 */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import "./TApproval.css";
import DateRangePicker from "./DateRangePicker";

// ─── Data ────────────────────────────────────────────────────
const T_CARDS = [
    {
        id: 101, type: "Returnable DC Issue - Material Issue", status: "Pending",
        vendor: "RAJESH LOGISTICS PVT LTD", poNo: "TR250601", poDate: "01/12/2025",
        countLabel: "Distance (km)", countVal: 320,
        items: [
            { sNo: 1, codeNo: "RM-001", description: "ALUMINIUM BILLETS 6082", uom: "KGS", qty: 500, qtyOthers: 500, rate: 185, amount: 92500 },
            { sNo: 2, codeNo: "RM-002", description: "STEEL RODS 10MM", uom: "KGS", qty: 300, qtyOthers: 300, rate: 72, amount: 21600 },
        ],
        discount: 0, bfTaxPF: 500, afTaxPF: 0, cgstPct: 9, sgstPct: 9, roundOff: 0.5,
    },
    {
        id: 102, type: "Returnable DC Issue - Material Issue", status: "Approved",
        vendor: "AMIT KUMAR (EMP-1042)", poNo: "TR250602", poDate: "02/12/2025",
        countLabel: "Amount", countVal: 3500,
        items: [
            { sNo: 1, codeNo: "RM-010", description: "COPPER SHEETS 2MM", uom: "KGS", qty: 120, qtyOthers: 120, rate: 650, amount: 78000 },
        ],
        discount: 500, bfTaxPF: 0, afTaxPF: 0, cgstPct: 9, sgstPct: 9, roundOff: -0.22,
    },
    {
        id: 103, type: "Returnable DC Issue - Service Issue", status: "Pending",
        vendor: "SWIFT TRAVELS & TOURS", poNo: "TR250603", poDate: "03/12/2025",
        countLabel: "Amount", countVal: 7200,
        items: [
            { sNo: 1, codeNo: "SV-001", description: "HYDRAULIC SERVICE CHARGE", uom: "JOB", qty: 1, qtyOthers: 1, rate: 4500, amount: 4500 },
            { sNo: 2, codeNo: "SV-002", description: "TRANSPORT TO SITE", uom: "NOS", qty: 2, qtyOthers: 2, rate: 1200, amount: 2400 },
        ],
        discount: 200, bfTaxPF: 300, afTaxPF: 0, cgstPct: 18, sgstPct: 18, roundOff: 0.12,
    },
    {
        id: 104, type: "Returnable DC Issue - Service Issue", status: "Approved",
        vendor: "BLUE DART LOGISTICS", poNo: "TR250604", poDate: "04/12/2025",
        countLabel: "Weight (kg)", countVal: 850,
        items: [
            { sNo: 1, codeNo: "SV-010", description: "COURIER CHARGES — BULK", uom: "KGS", qty: 850, qtyOthers: 850, rate: 18, amount: 15300 },
            { sNo: 2, codeNo: "SV-011", description: "PACKING MATERIAL", uom: "NOS", qty: 50, qtyOthers: 50, rate: 35, amount: 1750 },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 250, cgstPct: 18, sgstPct: 18, roundOff: -0.38,
    },
    {
        id: 105, type: "Invoice - General", status: "Pending",
        vendor: "PRIYA MEHTA (EMP-1078)", poNo: "TR250605", poDate: "05/12/2025",
        countLabel: "Amount", countVal: 1800,
        items: [
            { sNo: 1, codeNo: "INV-01", description: "TRAVEL REIMBURSEMENT", uom: "NOS", qty: 1, qtyOthers: 1, rate: 1800, amount: 1800 },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 0, cgstPct: 0, sgstPct: 0, roundOff: 0,
    },
    {
        id: 106, type: "Invoice - General", status: "Approved",
        vendor: "EXPRESS CARGO SOLUTIONS", poNo: "TR250606", poDate: "06/12/2025",
        countLabel: "Distance (km)", countVal: 540,
        items: [
            { sNo: 1, codeNo: "INV-10", description: "FREIGHT CHARGES — OUTWARD", uom: "KMS", qty: 540, qtyOthers: 540, rate: 12, amount: 6480 },
            { sNo: 2, codeNo: "INV-11", description: "TOLL & MISC CHARGES", uom: "NOS", qty: 1, qtyOthers: 1, rate: 850, amount: 850 },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 0, cgstPct: 9, sgstPct: 9, roundOff: 0.3,
    },
    {
        id: 107, type: "Invoice - General Labour", status: "Pending",
        vendor: "NATIONAL TRANSPORT CO.", poNo: "TR250607", poDate: "07/12/2025",
        countLabel: "Amount", countVal: 9500,
        items: [
            { sNo: 1, codeNo: "LB-001", description: "LOADING LABOUR CHARGES", uom: "NOS", qty: 10, qtyOthers: 10, rate: 450, amount: 4500 },
            { sNo: 2, codeNo: "LB-002", description: "UNLOADING LABOUR CHARGES", uom: "NOS", qty: 10, qtyOthers: 10, rate: 400, amount: 4000 },
            { sNo: 3, codeNo: "LB-003", description: "OVERTIME CHARGES", uom: "HRS", qty: 4, qtyOthers: 4, rate: 250, amount: 1000 },
        ],
        discount: 500, bfTaxPF: 0, afTaxPF: 0, cgstPct: 18, sgstPct: 18, roundOff: 0.45,
    },
    {
        id: 108, type: "Invoice - General Labour", status: "Pending",
        vendor: "STAR FREIGHT SOLUTIONS", poNo: "TR250608", poDate: "08/12/2025",
        countLabel: "Amount", countVal: 4200,
        items: [
            { sNo: 1, codeNo: "LB-010", description: "SKILLED LABOUR — DAILY", uom: "DAYS", qty: 6, qtyOthers: 6, rate: 700, amount: 4200 },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 0, cgstPct: 18, sgstPct: 18, roundOff: -0.1,
    },
];

const T_STATS = [
    { label: "Pending Trips", value: "38", change: "↑ 5 added today" },
    { label: "Approved Today", value: "14", change: "↑ 8% vs yesterday" },
    { label: "Avg. Approval Time", value: "1.7h", change: "↓ 22% improvement" },
];

const TYPE_ORDER = [
    "Returnable DC Issue - Material Issue",
    "Returnable DC Issue - Service Issue",
    "Invoice - General",
    "Invoice - General Labour",
];

const TYPE_ICONS = {
    "Returnable DC Issue - Material Issue": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    "Returnable DC Issue - Service Issue": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    ),
    "Invoice - General": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    "Invoice - General Labour": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
};

function parseCardDate(str) {
    const [d, m, y] = str.split("/").map(Number);
    return new Date(y, m - 1, d);
}

// ─── Rich Detail Preview Modal — mirrors EApproval, teal theme ───────────────
function DetailModal({ card, onClose, onApprove }) {
    if (!card) return null;

    const totalAmount = card.items.reduce((s, r) => s + r.amount, 0);
    const afterDiscount = totalAmount - (card.discount || 0);
    const bfTax = afterDiscount + (card.bfTaxPF || 0);
    const cgstAmt = +(bfTax * card.cgstPct / 100).toFixed(2);
    const sgstAmt = +(bfTax * card.sgstPct / 100).toFixed(2);
    const afTax = bfTax + (card.afTaxPF || 0);
    const grandTotal = Math.round(afTax + cgstAmt + sgstAmt + (card.roundOff || 0));
    const fmt = n => Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 });

    return createPortal(
        <div className="tap-modal tap-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="tap-preview-box">

                {/* ── Header ── */}
                <div className="tap-prev__hd">
                    <div className="tap-prev__hd-left">
                        <div className="tap-prev__hd-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <line x1="10" y1="9" x2="8" y2="9" />
                            </svg>
                        </div>
                        <div>
                            <div className="tap-prev__hd-title">T-Approval Detail Preview</div>
                            <div className="tap-prev__hd-sub">Transport Order — {card.poNo}</div>
                        </div>
                    </div>
                    <div className="tap-prev__hd-right">
                        <span className={`tap-prev__badge tap-prev__badge--${card.status.toLowerCase()}`}>
                            {card.status === "Approved"
                                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12" /></svg> Approved</>
                                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> Pending</>
                            }
                        </span>
                        <button className="tap-prev__close" onClick={onClose}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Meta row ── */}
                <div className="tap-prev__meta">
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            Request Date
                        </span>
                        <span className="tap-prev__meta-val">{card.poDate}</span>
                    </div>
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            Vendor / Requested By
                        </span>
                        <span className="tap-prev__meta-val tap-prev__meta-val--vendor">{card.vendor}</span>
                    </div>
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                            Type
                        </span>
                        <span className="tap-prev__meta-val">{card.type}</span>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="tap-prev__body">

                    <div className="tap-prev__section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                        Line Items
                    </div>

                    <div className="tap-prev__table-wrap">
                        <table className="tap-prev__table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Code No</th>
                                    <th className="tap-prev__td--desc">Description</th>
                                    <th>UOM</th>
                                    <th className="tap-prev__td--num">Qty</th>
                                    <th className="tap-prev__td--num">Qty Others</th>
                                    <th className="tap-prev__td--num">Rate (₹)</th>
                                    <th className="tap-prev__td--num">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {card.items.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "tap-prev__tr--even" : ""}>
                                        <td className="tap-prev__td--center">{row.sNo}</td>
                                        <td><span className="tap-prev__code">{row.codeNo}</span></td>
                                        <td className="tap-prev__td--desc">{row.description}</td>
                                        <td className="tap-prev__td--center"><span className="tap-prev__uom">{row.uom}</span></td>
                                        <td className="tap-prev__td--num">{row.qty.toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num">{row.qtyOthers.toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num">{row.rate.toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num tap-prev__td--amt">{fmt(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="tap-prev__summary-wrap">
                        <div className="tap-prev__section-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            Financial Summary
                        </div>
                        <div className="tap-prev__summary">
                            {[
                                { label: "Total Amount", val: fmt(totalAmount), sub: false },
                                { label: "Discount", val: `- ${fmt(card.discount)}`, sub: true },
                                { label: "Before Tax P & F", val: fmt(card.bfTaxPF), sub: true },
                                { label: "After Tax P & F", val: fmt(card.afTaxPF), sub: true },
                                { label: `Tax CGST @ ${card.cgstPct} %`, val: fmt(cgstAmt), sub: false },
                                { label: `Tax SGST @ ${card.sgstPct} %`, val: fmt(sgstAmt), sub: false },
                                { label: "Round Off", val: (card.roundOff >= 0 ? "+ " : "") + fmt(card.roundOff), sub: true },
                            ].map(r => (
                                <div key={r.label} className={`tap-prev__sum-row${r.sub ? " tap-prev__sum-row--sub" : ""}`}>
                                    <span className="tap-prev__sum-label">{r.label}</span>
                                    <span className="tap-prev__sum-val">{r.val}</span>
                                </div>
                            ))}
                            <div className="tap-prev__sum-row tap-prev__sum-row--grand">
                                <span className="tap-prev__sum-label">Grand Total</span>
                                <span className="tap-prev__sum-val">₹ {fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="tap-prev__footer">
                    <button className="tap-prev-btn tap-prev-btn--ghost" onClick={onClose}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Close
                    </button>
                    {card.status !== "Approved" && (
                        <button className="tap-prev-btn tap-prev-btn--approve" onClick={() => onApprove(card)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20,6 9,17 4,12" />
                            </svg>
                            Approve Order
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Collapsible Group ────────────────────────────────────────
function TypeGroup({ type, cards, collapsed, onToggle, onPreview, onApprove, resolvedStatus }) {
    const pendingCount = cards.filter(c => resolvedStatus(c) === "Pending").length;
    const approvedCount = cards.filter(c => resolvedStatus(c) === "Approved").length;

    return (
        <div className="tap-group">
            <div className="tap-group__hd" onClick={onToggle}>
                <div className="tap-group__hd-left">
                    <span className="tap-group__hd-icon">{TYPE_ICONS[type]}</span>
                    <span className="tap-group__hd-title">{type}</span>
                    <span className="tap-group__hd-count">{cards.length} request{cards.length !== 1 ? "s" : ""}</span>
                    {pendingCount > 0 && <span className="tap-group__pill tap-group__pill--pending">{pendingCount} Pending</span>}
                    {approvedCount > 0 && <span className="tap-group__pill tap-group__pill--approved">{approvedCount} Approved</span>}
                </div>
                <button className="tap-group__collapse-btn" aria-label={collapsed ? "Expand" : "Collapse"}>
                    <svg
                        className={`tap-group__chevron${collapsed ? " tap-group__chevron--collapsed" : ""}`}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                        <polyline points="18,15 12,9 6,15" />
                    </svg>
                    <span>{collapsed ? "Expand" : "Collapse"}</span>
                </button>
            </div>

            <div className={`tap-group__body${collapsed ? " tap-group__body--collapsed" : ""}`}>
                <div className="tap-grid tap-grid--group">
                    {cards.map((card, i) => {
                        const status = resolvedStatus(card);
                        return (
                            <div
                                key={card.id}
                                className="tap-card"
                                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                                onClick={() => onPreview({ ...card, status })}
                            >
                                <div className="tap-card__hd">
                                    <span className="tap-card__type">{card.type}</span>
                                    <span className={`tap-card__status tap-card__status--${status.toLowerCase()}`}>{status}</span>
                                </div>
                                <div className="tap-card__vendor">{card.vendor}</div>
                                <div className="tap-card__info">
                                    <div className="tap-info-row">
                                        <span className="tap-info-label">Reference No</span>
                                        <span className="tap-info-val">{card.poNo}</span>
                                    </div>
                                    <div className="tap-info-row">
                                        <span className="tap-info-label">Request Date</span>
                                        <span className="tap-info-val">{card.poDate}</span>
                                    </div>
                                </div>
                                <div className="tap-card__count">
                                    <div className="tap-count-row">
                                        <span className="tap-count-label">{card.countLabel}:</span>
                                        <span className="tap-count-val">{card.countVal.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="tap-card__actions">
                                    <button className="tap-action-btn"
                                        onClick={e => { e.stopPropagation(); onPreview({ ...card, status }); }}>
                                        Preview
                                    </button>
                                    <button className="tap-action-btn tap-action-btn--primary"
                                        onClick={e => { e.stopPropagation(); onApprove(card); }}>
                                        Approve
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────
export default function TApproval() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [approved, setApproved] = useState([]);
    const [dateRange, setDateRange] = useState({
        from: new Date(2025, 8, 1),
        to: new Date(2026, 0, 25),
    });
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = type =>
        setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return T_CARDS.filter(c => {
            const matchText = !q ||
                c.vendor.toLowerCase().includes(q) ||
                c.poNo.toLowerCase().includes(q) ||
                c.type.toLowerCase().includes(q);
            let matchDate = true;
            if (dateRange.from || dateRange.to) {
                const cardDate = parseCardDate(c.poDate);
                if (dateRange.from && cardDate < dateRange.from) matchDate = false;
                if (dateRange.to && cardDate > dateRange.to) matchDate = false;
            }
            return matchText && matchDate;
        });
    }, [search, dateRange]);

    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach(c => {
            if (!map[c.type]) map[c.type] = [];
            map[c.type].push(c);
        });
        const ordered = TYPE_ORDER.filter(t => map[t]?.length > 0).map(t => [t, map[t]]);
        const extras = Object.entries(map).filter(([t]) => !TYPE_ORDER.includes(t));
        return [...ordered, ...extras];
    }, [filtered]);

    const resolvedStatus = card => approved.includes(card.id) ? "Approved" : card.status;
    const handleApprove = card => { setApproved(prev => [...prev, card.id]); setSelected(null); };

    return (
        <div className="tap-root">

            <div className="tap-stats">
                {T_STATS.map(s => (
                    <div className="tap-stat" key={s.label}>
                        <div className="tap-stat__label">{s.label}</div>
                        <div className="tap-stat__value">{s.value}</div>
                        <div className="tap-stat__change">{s.change}</div>
                    </div>
                ))}
            </div>

            <div className="tap-filter">
                <DateRangePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} theme="teal" />
                <input
                    className="tap-filter__search"
                    type="text"
                    placeholder="Search transport approvals…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button className="tap-filter__btn">🔍 Search</button>
            </div>

            <div className="tap-groups">
                {grouped.length === 0 ? (
                    <div className="tap-empty">
                        <div className="tap-empty__icon">🚚</div>
                        <div className="tap-empty__txt">No transport approvals match your search</div>
                    </div>
                ) : (
                    grouped.map(([type, cards]) => (
                        <TypeGroup
                            key={type}
                            type={type}
                            cards={cards}
                            collapsed={!!collapsedGroups[type]}
                            onToggle={() => toggleGroup(type)}
                            onPreview={setSelected}
                            onApprove={handleApprove}
                            resolvedStatus={resolvedStatus}
                        />
                    ))
                )}
            </div>

            <DetailModal card={selected} onClose={() => setSelected(null)} onApprove={handleApprove} />
        </div>
    );
}