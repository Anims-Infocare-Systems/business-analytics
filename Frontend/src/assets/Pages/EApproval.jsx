/**
 * EApproval.jsx  —  E-Approval Dashboard (Electronic Purchase / Material Approvals)
 * Prefix: eap-   |   Theme: Indigo / Blue
 * Data from Django /api/eapproval/*; layout matches the original static UI.
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./EApproval.css";
import DateRangePicker from "./DateRangePicker";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

function toYMD(d) {
    if (!d) return "";
    const x = d instanceof Date ? d : new Date(d);
    const p = n => String(n).padStart(2, "0");
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

const TYPE_ORDER = ["Raw Material", "Store Material", "Service Po", "General"];
const TYPE_ICONS = {
    "Raw Material":   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    "Store Material": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    "Service Po":     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>,
    "General":        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
};

const DEFAULT_STATS = [
    { label: "Total PO's", value: "—", change: "" },
    { label: "Approved", value: "—", change: "" },
    { label: "Pending", value: "—", change: "" },
];

// ─── Inline spinner SVG ─────────────────────────────────
const BtnSpinner = () => (
    <svg className="eap-btn-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
);

// ─── Toast notification ─────────────────────────────
function Toast({ toasts }) {
    return createPortal(
        <div className="eap-toast-stack">
            {toasts.map(t => (
                <div key={t.id} className={`eap-toast eap-toast--${t.type}`}>
                    <span className="eap-toast__icon">
                        {t.type === "success-approve" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                        )}
                        {t.type === "success-modify" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        )}
                        {t.type === "error" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        )}
                    </span>
                    <span className="eap-toast__msg">{t.msg}</span>
                </div>
            ))}
        </div>,
        document.body
    );
}

function parseCardDate(str) {
    if (!str || typeof str !== "string") return new Date(NaN);
    const parts = str.split("/");
    if (parts.length !== 3) return new Date(NaN);
    const [d, m, y] = parts.map(Number);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return new Date(NaN);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? new Date(NaN) : dt;
}

/** Map API financial + taxes → legacy CGST/SGST summary numbers (same layout as original UI). */
function legacyFinancialFromCard(card) {
    const items = card.items || [];
    const fin = card.financial;
    const lineSum = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalAmount = fin ? Number(fin.lineItemsTotal) || lineSum : lineSum;
    const discount = Number(fin ? fin.discount : card.discount) || 0;
    const bfTaxPF = Number(fin ? fin.beforeTaxPF : card.bfTaxPF) || 0;
    const afTaxPF = Number(fin ? fin.afterTaxPF : card.afTaxPF) || 0;
    const roundOff = Number(fin ? fin.roundOff : card.roundOff) || 0;
    const taxes = fin?.taxes || [];

    let cgstPct = Number(card.cgstPct) || 0;
    let sgstPct = Number(card.sgstPct) || 0;
    let cgstAmt = 0;
    let sgstAmt = 0;

    const pick = re => taxes.find(t => re.test(String(t.ttype || "")));
    const cgst = pick(/cgst/i);
    const sgst = pick(/sgst/i);
    if (cgst) {
        cgstPct = Number(cgst.tp) || cgstPct;
        cgstAmt = Number(cgst.txAmt) || 0;
    }
    if (sgst) {
        sgstPct = Number(sgst.tp) || sgstPct;
        sgstAmt = Number(sgst.txAmt) || 0;
    }
    if (!cgst && !sgst && taxes.length >= 1) {
        cgstAmt = Number(taxes[0].txAmt) || 0;
        cgstPct = Number(taxes[0].tp) || 0;
    }
    if (!cgst && !sgst && taxes.length >= 2) {
        sgstAmt = Number(taxes[1].txAmt) || 0;
        sgstPct = Number(taxes[1].tp) || 0;
    }

    const afterDiscount = totalAmount - discount;
    const bfTax = afterDiscount + bfTaxPF;
    if ((!fin || taxes.length === 0) && cgstAmt === 0 && sgstAmt === 0) {
        cgstAmt = +(bfTax * cgstPct / 100).toFixed(2);
        sgstAmt = +(bfTax * sgstPct / 100).toFixed(2);
    }

    const afTax = bfTax + afTaxPF;
    const grandTotal = fin
        ? Math.round(Number(fin.grandTotal) || 0)
        : Math.round(afTax + cgstAmt + sgstAmt + roundOff);

    return {
        totalAmount,
        discount,
        bfTaxPF,
        afTaxPF,
        roundOff,
        cgstPct,
        sgstPct,
        cgstAmt,
        sgstAmt,
        grandTotal,
    };
}

// ─── Detail Preview Modal (original financial layout) ─────────
function DetailModal({ card, isLoading, actionLoading, onClose, onApprove, onModify }) {
    if (!card && !isLoading) return null;

    // ── Skeleton body shown while fetching detail ──
    if (isLoading) return createPortal(
        <div className="eap-modal eap-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="eap-preview-box">
                {/* Top stripe */}
                <div className="eap-prev__hd">
                    <div className="eap-prev__hd-left">
                        <div className="eap-prev__hd-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                            </svg>
                        </div>
                        <div>
                            <div className="eap-prev__hd-title">Loading PO Details…</div>
                            <div className="eap-prev__hd-sub">Fetching purchase order information</div>
                        </div>
                    </div>
                    <div className="eap-prev__hd-right">
                        <button type="button" className="eap-prev__close" onClick={onClose}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                {/* Skeleton body */}
                <div className="eap-prev__body eap-prev-loading">
                    {/* Arc spinner */}
                    <div className="eap-pvl__center">
                        <div className="eap-pvl__arc-wrap">
                            <svg className="eap-pvl__arc" viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="26" stroke="rgba(99,102,241,.1)" strokeWidth="5"/>
                                <circle className="eap-pvl__arc-ring" cx="32" cy="32" r="26"
                                    stroke="url(#pvl-grad)" strokeWidth="5"
                                    strokeLinecap="round" strokeDasharray="60 103"
                                />
                                <defs>
                                    <linearGradient id="pvl-grad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%"  stopColor="#6366f1"/>
                                        <stop offset="100%" stopColor="#06b6d4"/>
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="eap-pvl__dots">
                                <span/><span/><span/>
                            </div>
                        </div>
                        <p className="eap-pvl__label">Fetching purchase order…</p>
                    </div>
                    {/* Skeleton rows */}
                    <div className="eap-pvl__skel-rows">
                        {[100, 75, 90, 60, 85, 70].map((w, i) => (
                            <div key={i} className="eap-pvl__skel-row" style={{ animationDelay: `${i * 0.07}s` }}>
                                <div className="eap-pvl__sk" style={{ width: `${w * 0.35}%` }} />
                                <div className="eap-pvl__sk eap-pvl__sk--val" style={{ width: `${w * 0.2}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="eap-prev__footer">
                    <button type="button" className="eap-prev-btn eap-prev-btn--ghost" onClick={onClose}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

    const {
        totalAmount,
        discount,
        bfTaxPF,
        afTaxPF,
        roundOff,
        cgstPct,
        sgstPct,
        cgstAmt,
        sgstAmt,
        grandTotal,
    } = legacyFinancialFromCard(card);

    const fmt = n => Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 });
    const items = card.items || [];
    const approvedBy = card.approvedBy || "—";
    const approvedDateTime = card.approvedDateTime || "—";

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
                        <button type="button" className="eap-prev__close" onClick={onClose}>
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
                    <div className="eap-prev__meta-item">
                        <span className="eap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Approved By
                        </span>
                        <span className={`eap-prev__meta-val-badge eap-prev__meta-val-badge--${card.approvedBy ? "approved" : "pending"}`}>
                            {approvedBy}
                        </span>
                    </div>
                    <div className="eap-prev__meta-item">
                        <span className="eap-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                            Date-Time
                        </span>
                        <span className={`eap-prev__meta-val-badge eap-prev__meta-val-badge--${card.approvedBy ? "approved" : "pending"}`}>
                            {approvedDateTime}
                        </span>
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
                                {items.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "eap-prev__tr--even" : ""}>
                                        <td className="eap-prev__td--center">{row.sNo}</td>
                                        <td><span className="eap-prev__code">{row.codeNo}</span></td>
                                        <td className="eap-prev__td--desc">{row.description}</td>
                                        <td className="eap-prev__td--center"><span className="eap-prev__uom">{row.uom}</span></td>
                                        <td className="eap-prev__td--num">{Number(row.qty || 0).toLocaleString("en-IN")}</td>
                                        <td className="eap-prev__td--num">{Number(row.qtyOthers || 0).toLocaleString("en-IN")}</td>
                                        <td className="eap-prev__td--num">{Number(row.rate || 0).toLocaleString("en-IN")}</td>
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
                                { label: "Total Amount", val: fmt(totalAmount), sub: false },
                                { label: "Discount", val: `- ${fmt(discount)}`, sub: true },
                                { label: "Before Tax P & F", val: fmt(bfTaxPF), sub: true },
                                { label: "After Tax P & F", val: fmt(afTaxPF), sub: true },
                                { label: `Tax CGST @ ${cgstPct} %`, val: fmt(cgstAmt), sub: false },
                                { label: `Tax SGST @ ${sgstPct} %`, val: fmt(sgstAmt), sub: false },
                                { label: "Round Off", val: (roundOff >= 0 ? "+ " : "") + fmt(roundOff), sub: true },
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
                    <button type="button" className="eap-prev-btn eap-prev-btn--ghost" onClick={onClose}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Close
                    </button>
                    {card.status === "Approved" ? (
                        <button
                            type="button"
                            className="eap-prev-btn eap-prev-btn--modify"
                            disabled={!!actionLoading}
                            onClick={() => onModify(card)}
                        >
                            {actionLoading?.pono === card.poNo && actionLoading?.type === "modify"
                                ? <><BtnSpinner /> Modifying…</>
                                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Modify Open</>
                            }
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="eap-prev-btn eap-prev-btn--approve"
                            disabled={!!actionLoading}
                            onClick={() => onApprove(card)}
                        >
                            {actionLoading?.pono === card.poNo && actionLoading?.type === "approve"
                                ? <><BtnSpinner /> Approving…</>
                                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg> Approve Order</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── Collapsible Group Section ────────────────────────────────
function TypeGroup({ type, cards, collapsed, onToggle, onPreview, onApprove, onModify, actionLoading, resolvedStatus, searchQuery }) {
    const [filterStatus, setFilterStatus] = useState("Pending");

    useEffect(() => {
        if (searchQuery) {
            setFilterStatus("All");
        } else {
            setFilterStatus("Pending");
        }
    }, [searchQuery]);

    const pendingCount = cards.filter(c => resolvedStatus(c) === "Pending").length;
    const approvedCount = cards.filter(c => resolvedStatus(c) === "Approved").length;

    const displayedCards = useMemo(() => {
        if (filterStatus === "Pending") {
            return cards.filter(c => resolvedStatus(c) === "Pending");
        }
        if (filterStatus === "Approved") {
            return cards.filter(c => resolvedStatus(c) === "Approved");
        }
        return cards;
    }, [cards, filterStatus, resolvedStatus]);

    const handlePillClick = (e, status) => {
        e.stopPropagation();
        setFilterStatus(status);
        if (collapsed) {
            onToggle();
        }
    };

    return (
        <div className="eap-group">
            {/* Group header — styled like the KPI/Charts section header in Image 2 */}
            <div className="eap-group__hd" onClick={onToggle}>
                <div className="eap-group__hd-left">
                    <span className="eap-group__hd-icon">{TYPE_ICONS[type] ?? TYPE_ICONS.General}</span>
                    <span className="eap-group__hd-title">{type}</span>
                    
                    <button
                        type="button"
                        className={`eap-group__pill eap-group__pill--all ${filterStatus === "All" ? "eap-group__pill--all-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "All")}
                    >
                        {cards.length} All
                    </button>
                    <button
                        type="button"
                        className={`eap-group__pill eap-group__pill--pending ${filterStatus === "Pending" ? "eap-group__pill--pending-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "Pending")}
                    >
                        {pendingCount} Pending
                    </button>
                    <button
                        type="button"
                        className={`eap-group__pill eap-group__pill--approved ${filterStatus === "Approved" ? "eap-group__pill--approved-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "Approved")}
                    >
                        {approvedCount} Approved
                    </button>
                </div>
                <button type="button" className="eap-group__collapse-btn" aria-label={collapsed ? "Expand" : "Collapse"}>
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
                    {displayedCards.map((card, i) => {
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
                                        <span className="eap-count-val">₹ {Number(card.countVal).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="eap-card__actions">
                                    <button type="button" className="eap-action-btn"
                                        onClick={e => { e.stopPropagation(); onPreview({ ...card, status }); }}>
                                        Preview
                                    </button>
                                    {status === "Approved" ? (
                                        <button
                                            type="button"
                                            className="eap-action-btn eap-action-btn--modify"
                                            disabled={!!actionLoading}
                                            onClick={e => { e.stopPropagation(); onModify(card); }}
                                        >
                                            {actionLoading?.pono === card.poNo && actionLoading?.type === "modify"
                                                ? <><BtnSpinner /> Modifying…</>
                                                : "Modify Open"
                                            }
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="eap-action-btn eap-action-btn--primary"
                                            disabled={!!actionLoading}
                                            onClick={e => { e.stopPropagation(); onApprove(card); }}
                                        >
                                            {actionLoading?.pono === card.poNo && actionLoading?.type === "approve"
                                                ? <><BtnSpinner /> Approving…</>
                                                : "Approve"
                                            }
                                        </button>
                                    )}
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
/* ── sessionStorage filter helpers ── */
function readFilterSession(key, defaults) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        // Rehydrate date strings back to Date objects
        if (parsed.from) parsed.from = new Date(parsed.from);
        if (parsed.to) parsed.to = new Date(parsed.to);
        return { ...defaults, ...parsed };
    } catch { return defaults; }
}
function writeFilterSession(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export default function EApproval() {
    const today = new Date();
    const _savedEap = readFilterSession("ba_filter_eapproval", { from: today, to: today, search: "" });
    const [search, setSearch] = useState(_savedEap.search || "");
    const [cards, setCards] = useState([]);
    const [selected, setSelected] = useState(null);
    const [approved, setApproved] = useState([]);
    const [dateRange, setDateRange] = useState({ from: _savedEap.from, to: _savedEap.to });
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // { pono, type }
    const [toasts, setToasts] = useState([]);
    const [typeFilter, setTypeFilter] = useState(null); // null = All
    const [typeDropOpen, setTypeDropOpen] = useState(false);
    const [typePanelStyle, setTypePanelStyle] = useState({});
    const typeDropRef = useRef(null);
    const typeTriggerRef = useRef(null);

    // Compute KPI stats dynamically from cards so they update instantly on approval/revert
    const stats = useMemo(() => {
        if (isLoading && cards.length === 0) {
            return [
                { label: "Total PO's", value: "—", change: "Fetching POs..." },
                { label: "Approved", value: "—", change: "Fetching stats..." },
                { label: "Pending", value: "—", change: "Fetching stats..." },
                { label: "Total Value", value: "—", change: "Fetching amounts..." },
            ];
        }
        const total = cards.length;
        const approvedCount = cards.filter(c => c.status === "Approved" || approved.includes(c.id)).length;
        const pendingCount = total - approvedCount;
        const approvalRate = total > 0 ? (approvedCount / total * 100).toFixed(1) : "0.0";
        const remainingRate = total > 0 ? (100 - parseFloat(approvalRate)).toFixed(1) : "0.0";
        const totalValue = cards.reduce((sum, c) => sum + (Number(c.countVal) || 0), 0);

        return [
            {
                label: "Total PO's",
                value: String(total),
                change: `↑ ${pendingCount} waiting action`,
            },
            {
                label: "Approved",
                value: String(approvedCount),
                change: `↑ ${approvalRate}% approval rate`,
            },
            {
                label: "Pending",
                value: String(pendingCount),
                change: total > 0 ? `↓ ${remainingRate}% remaining` : "No POs in range",
            },
            {
                label: "Total Value",
                value: `₹ ${(totalValue / 100000).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`,
                change: total > 0 ? `↑ ${total} purchase orders` : "No POs in range",
            },
        ];
    }, [cards, approved, isLoading]);

    // Detail cache — key: pono, value: full card object from API
    // Cleared when date range changes (refreshBoard) or on approve/modify
    const detailCache = useRef({});

    // ✅ Persist filters to sessionStorage on every change
    useEffect(() => {
        writeFilterSession("ba_filter_eapproval", { from: dateRange.from, to: dateRange.to, search });
    }, [dateRange.from, dateRange.to, search]);

    const addToast = useCallback((msg, type = "success-approve") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
    }, []);

    // Close type dropdown on outside click
    useEffect(() => {
        if (!typeDropOpen) return;
        const h = e => {
            if (typeDropRef.current && typeDropRef.current.contains(e.target)) return;
            if (e.target.closest(".eap-type-dd__panel-portal")) return;
            setTypeDropOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [typeDropOpen]);

    // Reposition panel whenever it opens or on scroll/resize
    useEffect(() => {
        if (!typeDropOpen || !typeTriggerRef.current) return;
        const reposition = () => {
            const rect = typeTriggerRef.current.getBoundingClientRect();
            setTypePanelStyle({
                position: "fixed",
                top: rect.bottom + 6,
                left: rect.left,
                zIndex: 999999,
            });
        };
        reposition();
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        return () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
        };
    }, [typeDropOpen]);

    const toggleGroup = type =>
        setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));

    const resolvedStatus = card => (approved.includes(card.id) ? "Approved" : card.status);

    const refreshBoard = useCallback(async () => {
        const from = toYMD(dateRange.from);
        const to   = toYMD(dateRange.to || dateRange.from);
        if (!from) return;
        detailCache.current = {}; // invalidate on date change
        setIsLoading(true);
        try {
            const qsList  = new URLSearchParams({ from, to, page: "1", page_size: "2000" });
            const resList = await fetch(`${API}/eapproval/list/?${qsList}`,  { credentials: "include" });
            const dataList  = await resList.json();
            if (resList.ok) setCards(dataList.cards || []);
            else { console.error(dataList.error || resList.statusText); setCards([]); }
        } catch (e) {
            console.error(e);
            setCards([]);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange.from, dateRange.to]);

    useEffect(() => { refreshBoard(); }, [refreshBoard]);

    // Only text-search + type filter — API already scopes by date range
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return cards.filter(c => {
            if (typeFilter && c.type !== typeFilter) return false;
            if (!q) return true;
            return (
                (c.vendor || "").toLowerCase().includes(q) ||
                (c.poNo   || "").toLowerCase().includes(q) ||
                (c.type   || "").toLowerCase().includes(q)
            );
        });
    }, [cards, search, typeFilter]);

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

    // All types present in the current date-filtered dataset (ignores typeFilter)
    const availableTypes = useMemo(() => {
        const seen = new Set();
        cards.forEach(c => { if (c.type) seen.add(c.type); });
        const ordered = TYPE_ORDER.filter(t => seen.has(t));
        const extras  = [...seen].filter(t => !TYPE_ORDER.includes(t));
        return [...ordered, ...extras];
    }, [cards]);

    const openPreview = useCallback(async (listCard) => {
        const pono = listCard.poNo;
        // Cache hit — no network call needed
        if (detailCache.current[pono]) {
            const cached = { ...detailCache.current[pono] };
            cached.status = approved.includes(listCard.id) ? "Approved" : cached.status;
            setSelected(cached);
            return;
        }
        const qs = new URLSearchParams({
            pono,
            from: toYMD(dateRange.from),
            to:   toYMD(dateRange.to || dateRange.from),
        });
        setPreviewLoading(true);
        setSelected({ ...listCard, items: [], financial: null, _loading: true });
        try {
            const res  = await fetch(`${API}/eapproval/detail/?${qs}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.success && data.card) {
                const merged = { ...data.card, id: listCard.id };
                merged.status = approved.includes(listCard.id) ? "Approved" : merged.status;
                detailCache.current[pono] = merged; // store in cache
                setSelected(merged);
            } else {
                console.error(data.error || res.statusText);
                setSelected({ ...listCard, items: listCard.items || [], financial: null });
            }
        } catch (e) {
            setSelected({ ...listCard, items: listCard.items || [] });
        } finally {
            setPreviewLoading(false);
        }
    }, [dateRange.from, dateRange.to, approved]);

    const handleApprove = useCallback(async (card) => {
        const pono = card.poNo;
        if (!pono || actionLoading) return;
        setActionLoading({ pono, type: "approve" });
        try {
            const res = await fetch(`${API}/eapproval/approve/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pono }),
            });
            const data = await res.json();
            if (!res.ok) { addToast(`Failed: ${data.error || res.statusText}`, "error"); return; }
            delete detailCache.current[pono]; // invalidate cached detail
            setApproved(prev => (prev.includes(card.id) ? prev : [...prev, card.id]));
            setCards(prev => prev.map(c =>
                (c.poNo === pono || c.id === card.id) ? { ...c, status: "Approved" } : c
            ));
            setSelected(null);
            addToast(`PO ${pono} approved successfully`, "success-approve");
        } catch (e) {
            addToast("Network error — please try again", "error");
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast]);

    const handleModify = useCallback(async (card) => {
        const pono = card.poNo;
        if (!pono || actionLoading) return;
        setActionLoading({ pono, type: "modify" });
        try {
            const res = await fetch(`${API}/eapproval/modify/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pono }),
            });
            const data = await res.json();
            if (!res.ok) { addToast(`Failed: ${data.error || res.statusText}`, "error"); return; }
            delete detailCache.current[pono]; // invalidate cached detail
            setApproved(prev => prev.filter(id => id !== card.id));
            setCards(prev => prev.map(c =>
                (c.poNo === pono || c.id === card.id) ? { ...c, status: "Pending" } : c
            ));
            setSelected(null);
            addToast(`PO ${pono} moved back to Pending`, "success-modify");
        } catch (e) {
            addToast("Network error — please try again", "error");
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast]);

    return (
        <div className="eap-root">

            {/* ── Stats ── */}
            <div className="eap-stats">
                {stats.map(s => (
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
                    onChange={r => { setDateRange(r); setTypeFilter(null); }}
                    theme="indigo"
                />
                <div className="eap-filter__search-wrap">
                    <svg className="eap-filter__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        className="eap-filter__search"
                        type="text"
                        placeholder="Search vendor, PO…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            className="eap-filter__clear-btn"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* ── Type Dropdown ── */}
                <div className="eap-type-dd" ref={typeDropRef}>
                    <button
                        ref={typeTriggerRef}
                        type="button"
                        className={`eap-type-dd__trigger ${typeFilter ? "eap-type-dd__trigger--active" : ""} ${typeDropOpen ? "eap-type-dd__trigger--open" : ""}`}
                        onClick={() => setTypeDropOpen(o => !o)}
                    >
                        <span className="eap-type-dd__trigger-icon">
                            {typeFilter ? TYPE_ICONS[typeFilter] : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                                </svg>
                            )}
                        </span>
                        <span className="eap-type-dd__trigger-label">
                            {typeFilter || "All Types"}
                        </span>
                        {typeFilter && (
                            <span className="eap-type-dd__trigger-count">
                                {cards.filter(c => c.type === typeFilter).length}
                            </span>
                        )}
                        <svg
                            className={`eap-type-dd__caret ${typeDropOpen ? "eap-type-dd__caret--up" : ""}`}
                            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                            <polyline points="6,9 12,15 18,9"/>
                        </svg>
                    </button>

                    {/* Panel portalled to body so it renders above everything */}
                    {typeDropOpen && createPortal(
                        <div className="eap-type-dd__panel-portal" style={typePanelStyle}>
                            <div className="eap-type-dd__panel">
                                <div className="eap-type-dd__header">Filter by Type</div>
                                {/* All option */}
                                <button
                                    type="button"
                                    className={`eap-type-dd__item ${typeFilter === null ? "eap-type-dd__item--active" : ""}`}
                                    onClick={() => { setTypeFilter(null); setTypeDropOpen(false); }}
                                >
                                    <span className="eap-type-dd__item-icon">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                                            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                                        </svg>
                                    </span>
                                    <span className="eap-type-dd__item-label">All Types</span>
                                    <span className="eap-type-dd__item-badge">{cards.length}</span>
                                    {typeFilter === null && (
                                        <svg className="eap-type-dd__item-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12"/>
                                        </svg>
                                    )}
                                </button>

                                <div className="eap-type-dd__divider"/>

                                {/* Per-type options */}
                                {availableTypes.map(t => {
                                    const cnt = cards.filter(c => c.type === t).length;
                                    const isActive = typeFilter === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`eap-type-dd__item eap-type-dd__item--${t.toLowerCase().replace(/\s+/g,"-")} ${isActive ? "eap-type-dd__item--active" : ""}`}
                                            onClick={() => { setTypeFilter(isActive ? null : t); setTypeDropOpen(false); }}
                                        >
                                            <span className="eap-type-dd__item-icon">{TYPE_ICONS[t]}</span>
                                            <span className="eap-type-dd__item-label">{t}</span>
                                            <span className="eap-type-dd__item-badge">{cnt}</span>
                                            {isActive && (
                                                <svg className="eap-type-dd__item-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20,6 9,17 4,12"/>
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                <button type="button" className="eap-filter__btn" onClick={() => refreshBoard()}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Search
                </button>
            </div>

            {/* ── Grouped Sections / Loader ── */}
            {isLoading ? (
                <div className="eap-loader">
                    {/* Spinner bar */}
                    <div className="eap-loader__bar">
                        <div className="eap-loader__bar-track">
                            <div className="eap-loader__bar-fill" />
                        </div>
                        <div className="eap-loader__bar-label">
                            <span className="eap-loader__spinner" />
                            Fetching purchase orders…
                        </div>
                    </div>
                    {/* Skeleton cards */}
                    <div className="eap-skeleton-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="eap-skeleton-card" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="eap-sk eap-sk--hd">
                                    <div className="eap-sk eap-sk--badge" />
                                    <div className="eap-sk eap-sk--status" />
                                </div>
                                <div className="eap-sk eap-sk--vendor" />
                                <div className="eap-sk eap-sk--line" />
                                <div className="eap-sk eap-sk--line eap-sk--line-short" />
                                <div className="eap-sk eap-sk--amount" />
                                <div className="eap-sk eap-sk--actions">
                                    <div className="eap-sk eap-sk--btn" />
                                    <div className="eap-sk eap-sk--btn" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="eap-groups">
                    {grouped.length === 0 ? (
                        <div className="eap-empty">
                            <div className="eap-empty__icon">📭</div>
                            <div className="eap-empty__txt">No e-approvals match your search</div>
                        </div>
                    ) : (
                        grouped.map(([type, groupCards]) => (
                            <TypeGroup
                                key={type}
                                type={type}
                                cards={groupCards}
                                collapsed={!!collapsedGroups[type]}
                                onToggle={() => toggleGroup(type)}
                                onPreview={openPreview}
                                onApprove={handleApprove}
                                onModify={handleModify}
                                actionLoading={actionLoading}
                                resolvedStatus={resolvedStatus}
                                searchQuery={search}
                            />
                        ))
                    )}
                </div>
            )}

            {/* ── Preview Modal ── */}
            <DetailModal
                card={selected}
                isLoading={previewLoading}
                actionLoading={actionLoading}
                onClose={() => { setSelected(null); setPreviewLoading(false); }}
                onApprove={handleApprove}
                onModify={handleModify}
            />

            {/* ── Toast Notifications ── */}
            <Toast toasts={toasts} />
        </div>
    );
}
