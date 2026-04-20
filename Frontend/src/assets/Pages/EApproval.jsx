/**
 * EApproval.jsx  —  E-Approval Dashboard (Electronic Purchase / Material Approvals)
 * Prefix: eap-   |   Theme: Indigo / Blue
 * Updated: collapsible groups by type (Raw Material, Store Material, Capital Item)
 */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import "./EApproval.css";
import DateRangePicker from "./DateRangePicker";

// ─── Data ────────────────────────────────────────────────────
const E_CARDS = [
    {
        id: 1, type: "Raw Material", status: "Approved",
        vendor: "NAHATAL ALLOYS PRIVATE LIMITED", poNo: "AD250495", poDate: "29/11/2025",
        countLabel: "Amount", countVal: 8800,
        items: [
            { sNo: 1, codeNo: "ADC 12",  description: "ALUMINIUM INGOTS",      dia: 1, uom: "KGS", qty: 3289, qtyOthers: 3289, rate: 227,  amount: 746603 },
            { sNo: 2, codeNo: "ADC 10",  description: "ALUMINIUM ALLOY RODS",  dia: 2, uom: "KGS", qty: 500,  qtyOthers: 500,  rate: 210,  amount: 105000 },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 0,
        cgstPct: 9, sgstPct: 9, roundOff: 0.438,
    },
    {
        id: 2, type: "Raw Material", status: "Pending",
        vendor: "NAHATAL ALLOYS PRIVATE LIMITED", poNo: "AD250495", poDate: "27/11/2025",
        countLabel: "Amount", countVal: 2000,
        items: [
            { sNo: 1, codeNo: "ALU-88",  description: "ALUMINIUM SHEETS 2MM",  dia: 2, uom: "KGS", qty: 200,  qtyOthers: 200,  rate: 215,  amount: 43000  },
        ],
        discount: 500, bfTaxPF: 0, afTaxPF: 200,
        cgstPct: 9, sgstPct: 9, roundOff: 0.12,
    },
    {
        id: 3, type: "Raw Material", status: "Pending",
        vendor: "ALU TECH ENSG", poNo: "AD250493", poDate: "26/11/2025",
        countLabel: "Amount", countVal: 5000,
        items: [
            { sNo: 1, codeNo: "AT-001",  description: "COPPER WIRE COIL",      dia: 3, uom: "MTR", qty: 150,  qtyOthers: 150,  rate: 320,  amount: 48000  },
            { sNo: 2, codeNo: "AT-002",  description: "BRASS FITTINGS 10MM",   dia: 1, uom: "NOS", qty: 80,   qtyOthers: 80,   rate: 95,   amount: 7600   },
        ],
        discount: 200, bfTaxPF: 100, afTaxPF: 0,
        cgstPct: 12, sgstPct: 12, roundOff: -0.22,
    },
    {
        id: 4, type: "Store Material", status: "Pending",
        vendor: "STAR SUPPLIES LIMITED", poNo: "AD250500", poDate: "30/11/2025",
        countLabel: "Amount", countVal: 12000,
        items: [
            { sNo: 1, codeNo: "SS-101",  description: "SAFETY GLOVES (PAIR)",  dia: "-", uom: "NOS", qty: 100, qtyOthers: 100, rate: 45,   amount: 4500   },
            { sNo: 2, codeNo: "SS-102",  description: "SAFETY HELMET",          dia: "-", uom: "NOS", qty: 50,  qtyOthers: 50,  rate: 120,  amount: 6000   },
            { sNo: 3, codeNo: "SS-103",  description: "FIRST AID BOX",          dia: "-", uom: "NOS", qty: 10,  qtyOthers: 10,  rate: 850,  amount: 8500   },
        ],
        discount: 0, bfTaxPF: 0, afTaxPF: 0,
        cgstPct: 9, sgstPct: 9, roundOff: 0.55,
    },
    {
        id: 5, type: "Store Material", status: "Pending",
        vendor: "VEND TECH SOLUTIONS", poNo: "AD250501", poDate: "01/12/2025",
        countLabel: "Amount", countVal: 8000,
        items: [
            { sNo: 1, codeNo: "VT-010",  description: "INDUSTRIAL LUBRICANT 5L", dia: "-", uom: "LTR", qty: 30, qtyOthers: 30, rate: 260,  amount: 7800   },
        ],
        discount: 0, bfTaxPF: 50, afTaxPF: 50,
        cgstPct: 18, sgstPct: 18, roundOff: 0.1,
    },
    {
        id: 6, type: "Service Po", status: "Approved",
        vendor: "OMEGA MACHINES LTD", poNo: "AD250510", poDate: "02/12/2025",
        countLabel: "Amount", countVal: 45000,
        items: [
            { sNo: 1, codeNo: "OM-501",  description: "HYDRAULIC PRESS 50T",   dia: "-", uom: "NOS", qty: 1,   qtyOthers: 1,   rate: 42000, amount: 42000  },
            { sNo: 2, codeNo: "OM-502",  description: "INSTALLATION CHARGES",  dia: "-", uom: "JOB", qty: 1,   qtyOthers: 1,   rate: 3000,  amount: 3000   },
        ],
        discount: 1500, bfTaxPF: 500, afTaxPF: 0,
        cgstPct: 18, sgstPct: 18, roundOff: -0.33,
    },
];

const E_STATS = [
    { label: "Total Pending",        value: "145",  change: "↑ 12 waiting action" },
    { label: "Approved Today",       value: "28",   change: "↑ 15% vs yesterday"  },
    { label: "Avg. Processing Time", value: "2.3h", change: "↓ 30% improvement"   },
];

// Type order and icon map
const TYPE_ORDER = ["Raw Material", "Store Material", "Service Po"];
const TYPE_ICONS = {
    "Raw Material":   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    "Store Material": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    "Service Po":   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
};

function parseCardDate(str) {
    const [d, m, y] = str.split("/").map(Number);
    return new Date(y, m - 1, d);
}

// ─── Detail Preview Modal ─────────────────────────────────────
function DetailModal({ card, onClose, onApprove }) {
    if (!card) return null;

    const totalAmount = card.items.reduce((s, r) => s + r.amount, 0);
    const afterDiscount = totalAmount - (card.discount || 0);
    const bfTax = afterDiscount + (card.bfTaxPF || 0);
    const cgstAmt = +(bfTax * card.cgstPct / 100).toFixed(2);
    const sgstAmt = +(bfTax * card.sgstPct  / 100).toFixed(2);
    const afTax = bfTax + (card.afTaxPF || 0);
    const grandTotal = Math.round(afTax + cgstAmt + sgstAmt + (card.roundOff || 0));
    const fmt = n => Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 });

    return createPortal(
        <div className="eap-modal eap-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="eap-preview-box">

                {/* ── Header bar ── */}
                <div className="eap-prev__hd">
                    <div className="eap-prev__hd-left">
                        <div className="eap-prev__hd-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <line x1="10" y1="9"  x2="8" y2="9"/>
                            </svg>
                        </div>
                        <div>
                            <div className="eap-prev__hd-title">E-Approval Detail Preview</div>
                            <div className="eap-prev__hd-sub">Purchase Order — {card.poNo}</div>
                        </div>
                    </div>
                    <div className="eap-prev__hd-right">
                        <span className={`eap-prev__badge eap-prev__badge--${card.status.toLowerCase()}`}>
                            {card.status === "Approved"
                                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg> Approved</>
                                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Pending</>
                            }
                        </span>
                        <button className="eap-prev__close" onClick={onClose}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                {/* ── PO Meta ── */}
                <div className="eap-prev__meta">
                    <div className="eap-prev__meta-item">
                        <span className="eap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            PO Date
                        </span>
                        <span className="eap-prev__meta-val">{card.poDate}</span>
                    </div>
                    <div className="eap-prev__meta-item">
                        <span className="eap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Vendor
                        </span>
                        <span className="eap-prev__meta-val eap-prev__meta-val--vendor">{card.vendor}</span>
                    </div>
                    <div className="eap-prev__meta-item">
                        <span className="eap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                            Type
                        </span>
                        <span className="eap-prev__meta-val">{card.type}</span>
                    </div>
                </div>

                {/* ── Scrollable body ── */}
                <div className="eap-prev__body">

                    <div className="eap-prev__section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                        Line Items
                    </div>

                    <div className="eap-prev__table-wrap">
                        <table className="eap-prev__table">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Code No</th>
                                    <th className="eap-prev__td--desc">Description</th>
                                    <th>UOM</th>
                                    <th className="eap-prev__td--num">Qty</th>
                                    <th className="eap-prev__td--num">Qty Others</th>
                                    <th className="eap-prev__td--num">Rate (₹)</th>
                                    <th className="eap-prev__td--num">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {card.items.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "eap-prev__tr--even" : ""}>
                                        <td className="eap-prev__td--center">{row.sNo}</td>
                                        <td><span className="eap-prev__code">{row.codeNo}</span></td>
                                        <td className="eap-prev__td--desc">{row.description}</td>
                                        <td className="eap-prev__td--center"><span className="eap-prev__uom">{row.uom}</span></td>
                                        <td className="eap-prev__td--num">{row.qty.toLocaleString("en-IN")}</td>
                                        <td className="eap-prev__td--num">{row.qtyOthers.toLocaleString("en-IN")}</td>
                                        <td className="eap-prev__td--num">{row.rate.toLocaleString("en-IN")}</td>
                                        <td className="eap-prev__td--num eap-prev__td--amt">{fmt(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="eap-prev__summary-wrap">
                        <div className="eap-prev__section-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Financial Summary
                        </div>
                        <div className="eap-prev__summary">
                            {[
                                { label: "Total Amount",        val: fmt(totalAmount),    highlight: false },
                                { label: "Discount",            val: `- ${fmt(card.discount)}`, highlight: false, sub: true },
                                { label: "Before Tax P & F",    val: fmt(card.bfTaxPF),   highlight: false, sub: true },
                                { label: "After Tax P & F",     val: fmt(card.afTaxPF),   highlight: false, sub: true },
                                { label: `Tax CGST @ ${card.cgstPct} %`, val: fmt(cgstAmt), highlight: false },
                                { label: `Tax SGST @ ${card.sgstPct} %`, val: fmt(sgstAmt), highlight: false },
                                { label: "Round Off",           val: (card.roundOff >= 0 ? "+ " : "") + fmt(card.roundOff), highlight: false, sub: true },
                            ].map(r => (
                                <div key={r.label} className={`eap-prev__sum-row${r.sub ? " eap-prev__sum-row--sub" : ""}`}>
                                    <span className="eap-prev__sum-label">{r.label}</span>
                                    <span className="eap-prev__sum-val">{r.val}</span>
                                </div>
                            ))}
                            <div className="eap-prev__sum-row eap-prev__sum-row--grand">
                                <span className="eap-prev__sum-label">Grand Total</span>
                                <span className="eap-prev__sum-val">₹ {fmt(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer actions ── */}
                <div className="eap-prev__footer">
                    <button className="eap-prev-btn eap-prev-btn--ghost" onClick={onClose}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Close
                    </button>
                    {card.status !== "Approved" && (
                        <button className="eap-prev-btn eap-prev-btn--approve" onClick={() => onApprove(card)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                            Approve Order
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Collapsible Group Section ────────────────────────────────
function TypeGroup({ type, cards, collapsed, onToggle, onPreview, onApprove, resolvedStatus }) {
    const pendingCount   = cards.filter(c => resolvedStatus(c) === "Pending").length;
    const approvedCount  = cards.filter(c => resolvedStatus(c) === "Approved").length;

    return (
        <div className="eap-group">
            {/* Group header — styled like the KPI/Charts section header in Image 2 */}
            <div className="eap-group__hd" onClick={onToggle}>
                <div className="eap-group__hd-left">
                    <span className="eap-group__hd-icon">{TYPE_ICONS[type]}</span>
                    <span className="eap-group__hd-title">{type}</span>
                    <span className="eap-group__hd-count">{cards.length} order{cards.length !== 1 ? "s" : ""}</span>
                    {pendingCount  > 0 && <span className="eap-group__pill eap-group__pill--pending">{pendingCount} Pending</span>}
                    {approvedCount > 0 && <span className="eap-group__pill eap-group__pill--approved">{approvedCount} Approved</span>}
                </div>
                <button className="eap-group__collapse-btn" aria-label={collapsed ? "Expand" : "Collapse"}>
                    <svg
                        className={`eap-group__chevron${collapsed ? " eap-group__chevron--collapsed" : ""}`}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                        <polyline points="18,15 12,9 6,15"/>
                    </svg>
                    <span>{collapsed ? "Expand" : "Collapse"}</span>
                </button>
            </div>

            {/* Grid of cards — animated collapse */}
            <div className={`eap-group__body${collapsed ? " eap-group__body--collapsed" : ""}`}>
                <div className="eap-grid eap-grid--group">
                    {cards.map((card, i) => {
                        const status = resolvedStatus(card);
                        return (
                            <div
                                key={card.id}
                                className="eap-card"
                                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                                onClick={() => onPreview({ ...card, status })}
                            >
                                <div className="eap-card__hd">
                                    <span className="eap-card__type">{card.type}</span>
                                    <span className={`eap-card__status eap-card__status--${status.toLowerCase()}`}>{status}</span>
                                </div>
                                <div className="eap-card__vendor">{card.vendor}</div>
                                <div className="eap-card__info">
                                    <div className="eap-info-row">
                                        <span className="eap-info-label">PO Number</span>
                                        <span className="eap-info-val">{card.poNo}</span>
                                    </div>
                                    <div className="eap-info-row">
                                        <span className="eap-info-label">PO Date</span>
                                        <span className="eap-info-val">{card.poDate}</span>
                                    </div>
                                </div>
                                <div className="eap-card__count">
                                    <div className="eap-count-row">
                                        <span className="eap-count-label">{card.countLabel}:</span>
                                        <span className="eap-count-val">₹ {card.countVal.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="eap-card__actions">
                                    <button className="eap-action-btn"
                                        onClick={e => { e.stopPropagation(); onPreview({ ...card, status }); }}>
                                        Preview
                                    </button>
                                    <button className="eap-action-btn eap-action-btn--primary"
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
export default function EApproval() {
    const [search,    setSearch]   = useState("");
    const [selected,  setSelected] = useState(null);
    const [approved,  setApproved] = useState([]);
    const [dateRange, setDateRange] = useState({
        from: new Date(2025, 8, 1),
        to:   new Date(2026, 0, 25),
    });

    // Track which groups are collapsed — default all expanded
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = type =>
        setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return E_CARDS.filter(c => {
            const matchText = !q ||
                c.vendor.toLowerCase().includes(q) ||
                c.poNo.toLowerCase().includes(q)   ||
                c.type.toLowerCase().includes(q);
            let matchDate = true;
            if (dateRange.from || dateRange.to) {
                const cardDate = parseCardDate(c.poDate);
                if (dateRange.from && cardDate < dateRange.from) matchDate = false;
                if (dateRange.to   && cardDate > dateRange.to)   matchDate = false;
            }
            return matchText && matchDate;
        });
    }, [search, dateRange]);

    // Group cards by type in the defined order
    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach(c => {
            if (!map[c.type]) map[c.type] = [];
            map[c.type].push(c);
        });
        // Return ordered list of [type, cards[]]
        return TYPE_ORDER.filter(t => map[t]?.length > 0).map(t => [t, map[t]]);
    }, [filtered]);

    const resolvedStatus = card => approved.includes(card.id) ? "Approved" : card.status;
    const handleApprove  = card => { setApproved(prev => [...prev, card.id]); setSelected(null); };

    return (
        <div className="eap-root">

            {/* ── Stats ── */}
            <div className="eap-stats">
                {E_STATS.map(s => (
                    <div className="eap-stat" key={s.label}>
                        <div className="eap-stat__label">{s.label}</div>
                        <div className="eap-stat__value">{s.value}</div>
                        <div className="eap-stat__change">{s.change}</div>
                    </div>
                ))}
            </div>

            {/* ── Filter ── */}
            <div className="eap-filter">
                <DateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onChange={setDateRange}
                    theme="indigo"
                />
                <input
                    className="eap-filter__search"
                    type="text"
                    placeholder="Search e-approvals…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button className="eap-filter__btn">🔍 Search</button>
            </div>

            {/* ── Grouped Sections ── */}
            <div className="eap-groups">
                {grouped.length === 0 ? (
                    <div className="eap-empty">
                        <div className="eap-empty__icon">📭</div>
                        <div className="eap-empty__txt">No e-approvals match your search</div>
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

            {/* ── Preview Modal ── */}
            <DetailModal card={selected} onClose={() => setSelected(null)} onApprove={handleApprove} />
        </div>
    );
}