/**
 * MApproval.jsx  —  M-Approval Dashboard (Material & Maintenance Approvals)
 * Prefix: map-   |   Theme: Crimson / Sunset Rose
 * Data from Django /api/mapproval/*
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./MApproval.css";
import DateRangePicker from "./DateRangePicker";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

function toYMD(d) {
    if (!d) return "";
    const x = d instanceof Date ? d : new Date(d);
    const p = n => String(n).padStart(2, "0");
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

const DEFAULT_STATS = [
    { label: "Total Documents", value: "—", change: "" },
    { label: "Approved", value: "—", change: "" },
    { label: "Pending", value: "—", change: "" }
];

const DUMMY_CARDS = [];

const TYPE_ORDER = [
    "Customer PO",
    "Purchase Indent Approval",
    "Vendor Master",
    "Product Route Card",
    "Vendor Rate Master",
    "Commercial Master",
    "Material - Maintenance",
    "Material - Capital Work",
    "Material - Subcontracting",
    "Material - Rejection Return",
    "Material - Scrap",
    "Material - Import/Export",
    "Material - Inter-plant Transfer",
];

const TYPE_ICONS = {
    "Customer PO": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <circle cx="12" cy="12" r="1" />
        </svg>
    ),
    "Purchase Indent Approval": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    ),
    "Vendor Master": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    "Product Route Card": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
    "Vendor Rate Master": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    ),
    "Commercial Master": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth="3" />
        </svg>
    ),
    "Material - Maintenance": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    ),
    "Material - Capital Work": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    ),
    "Material - Subcontracting": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    "Material - Rejection Return": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1,4 1,10 7,10" />
            <polyline points="23,20 23,14 17,14" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
    ),
    "Material - Scrap": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    "Material - Import/Export": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    ),
    "Material - Inter-plant Transfer": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
    ),
};

const BtnSpinner = () => (
    <svg className="map-btn-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

function Toast({ toasts }) {
    return createPortal(
        <div className="map-toast-stack">
            {toasts.map(t => (
                <div key={t.id} className={`map-toast map-toast--${t.type}`}>
                    <span className="map-toast__icon">
                        {t.type === "success-approve" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12" /></svg>
                        )}
                        {t.type === "success-modify" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        )}
                        {t.type === "error" && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        )}
                    </span>
                    <span className="map-toast__msg">{t.msg}</span>
                </div>
            ))}
        </div>,
        document.body
    );
}

function legacyFinancialFromCard(card) {
    const fin = card.financial;
    const items = card.items || [];
    const lineSum = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalAmount = fin ? Number(fin.totalAmount) || lineSum : lineSum;
    const discount = Number(fin ? fin.discount : card.discount) || 0;
    const bfTaxPF = Number(fin ? fin.beforeTaxPF : card.bfTaxPF) || 0;
    const afTaxPF = Number(fin ? fin.afterTaxPF : card.afTaxPF) || 0;
    const roundOff = Number(fin ? fin.roundOff : card.roundOff) || 0;
    const taxes = fin?.taxes || [];

    let cgstPct = 0;
    let sgstPct = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;

    const pick = re => taxes.find(t => re.test(String(t.ttype || "")));
    const cgst = pick(/cgst/i);
    const sgst = pick(/sgst/i);
    if (cgst) {
        cgstPct = Number(cgst.tp) || 0;
        cgstAmt = Number(cgst.txAmt) || 0;
    }
    if (sgst) {
        sgstPct = Number(sgst.tp) || 0;
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

    const grandTotal = fin
        ? Math.round(Number(fin.grandTotal) || 0)
        : Math.round(totalAmount - discount + bfTaxPF + afTaxPF + cgstAmt + sgstAmt + roundOff);

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
        summaryRows: fin?.summaryRows,
    };
}

function formatSummaryRows(fin, fmt) {
    if (fin.summaryRows?.length) {
        return fin.summaryRows.map(row => {
            let val;
            if (row.label === "Discount") val = `- ${fmt(row.value)}`;
            else if (row.label === "Round Off") val = (row.value >= 0 ? "+ " : "") + fmt(row.value);
            else if (row.grand) val = `₹ ${fmt(row.value)}`;
            else val = fmt(row.value);
            return { label: row.label, val, sub: row.sub, grand: row.grand };
        });
    }
    return [
        { label: "Total Amount", val: fmt(fin.totalAmount), sub: false },
        { label: "Discount", val: `- ${fmt(fin.discount)}`, sub: true },
        { label: "Before Tax P & F", val: fmt(fin.bfTaxPF), sub: true },
        { label: "After Tax P & F", val: fmt(fin.afTaxPF), sub: true },
        { label: `Tax CGST @ ${fin.cgstPct} %`, val: fmt(fin.cgstAmt), sub: false },
        { label: `Tax SGST @ ${fin.sgstPct} %`, val: fmt(fin.sgstAmt), sub: false },
        { label: "Round Off", val: (fin.roundOff >= 0 ? "+ " : "") + fmt(fin.roundOff), sub: true },
        { label: "Grand Total", val: `₹ ${fmt(fin.grandTotal)}`, sub: false, grand: true },
    ];
}

function docLabels(card) {
    const k = (card?.docKind || "").toLowerCase();
    if (k === "customer_po") {
        return {
            docNoLabel: "CUSTOMER PO NO",
            docDateLabel: "PO DATE",
            docTitle: "Customer PO",
            approveLabel: "Approve Customer PO",
        };
    }
    if (k === "purchase_indent") {
        return {
            docNoLabel: "PI NO",
            docDateLabel: "PI DATE",
            docTitle: "Purchase Indent Approval",
            approveLabel: "Approve Purchase Indent",
        };
    }
    if (k === "vendor_master") {
        return {
            docNoLabel: "VENDOR CODE",
            docDateLabel: "ENTITY DATE",
            docTitle: "Vendor Master",
            approveLabel: "Approve Vendor",
        };
    }
    if (k === "ret_dc") {
        return {
            docNoLabel: "RET. ISSUE NO",
            docDateLabel: "ISSUE DATE",
            docTitle: "Returnable DC",
            approveLabel: "Approve Returnable DC",
        };
    }
    if (k === "vendor_rate") {
        return {
            docNoLabel: "RATE SLIP NO",
            docDateLabel: "EFFECTIVE DATE",
            docTitle: "Vendor Rate Master",
            approveLabel: "Approve Vendor Rate",
        };
    }
    if (k === "commercial") {
        return {
            docNoLabel: "RATE SLIP NO",
            docDateLabel: "TRANS DATE",
            docTitle: "Commercial Master",
            approveLabel: "Approve Commercial",
        };
    }
    if (k === "dc") {
        return {
            docNoLabel: "DC NO",
            docDateLabel: "DC DATE",
            docTitle: "DC",
            approveLabel: "Approve DC",
        };
    }
    return {
        docNoLabel: "ROUTE CARD NO",
        docDateLabel: "ROUTE CARD DATE",
        docTitle: "Product Route Card",
        approveLabel: "Approve Route Card",
    };
}

function DetailModal({ card, isLoading, actionLoading, onClose, onApprove, onModify }) {
    const [activeTab, setActiveTab] = useState("items");
    const [approvedPoRows, setApprovedPoRows] = useState({});

    useEffect(() => {
        if (!card) return;
        if (card.type === "Commercial Master") {
            setActiveTab("comm_rates");
        } else if (card.type === "Customer PO" || card.type === "Purchase Indent Approval") {
            setActiveTab("po_items");
        } else {
            setActiveTab("items");
        }
    }, [card?.id]);

    useEffect(() => {
        if (card?.type === "Customer PO" || card?.type === "Purchase Indent Approval") {
            const initial = {};
            (card.items || []).forEach((item, idx) => {
                initial[idx] = !!item.approved;
            });
            setApprovedPoRows(initial);
        }
    }, [card?.id, card?.items]);

    if (!card && !isLoading) return null;

    if (isLoading || (card && card._loading)) {
        const docNo = card ? card.poNo : "";
        return createPortal(
            <div className="map-modal map-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="map-preview-box">
                    <div className="map-prev__hd">
                        <div className="map-prev__hd-left">
                            <div className="map-prev__hd-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                </svg>
                            </div>
                            <div>
                                <div className="map-prev__hd-title">Loading Route Card Details…</div>
                                <div className="map-prev__hd-sub">Fetching route card information {docNo ? `— ${docNo}` : ""}</div>
                            </div>
                        </div>
                        <div className="map-prev__hd-right">
                            <button type="button" className="map-prev__close" onClick={onClose} aria-label="Close">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="map-prev__body map-prev-loading">
                        <div className="map-pvl__center">
                            <div className="map-pvl__arc-wrap">
                                <svg className="map-pvl__arc" viewBox="0 0 64 64" fill="none">
                                    <circle cx="32" cy="32" r="26" stroke="rgba(225,29,72,.12)" strokeWidth="5" />
                                    <circle
                                        className="map-pvl__arc-ring"
                                        cx="32"
                                        cy="32"
                                        r="26"
                                        stroke="url(#map-pvl-grad)"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray="60 103"
                                    />
                                    <defs>
                                        <linearGradient id="map-pvl-grad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#e11d48" />
                                            <stop offset="100%" stopColor="#f43f5e" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="map-pvl__dots">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                            <p className="map-pvl__label">Fetching document…</p>
                        </div>
                        <div className="map-pvl__skel-rows">
                            {[100, 75, 90, 60, 85, 70].map((w, i) => (
                                <div key={i} className="map-pvl__skel-row" style={{ animationDelay: `${i * 0.07}s` }}>
                                    <div className="map-pvl__sk" style={{ width: `${w * 0.35}%` }} />
                                    <div className="map-pvl__sk map-pvl__sk--val" style={{ width: `${w * 0.2}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="map-prev__footer">
                        <button type="button" className="map-prev-btn map-prev-btn--ghost" onClick={onClose}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Close
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    if (!card) return null;

    const fin = legacyFinancialFromCard(card);
    const fmt = n => Number(n).toLocaleString("en-IN", { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 });
    const items = card.items || [];
    const rawMaterials = card.rawMaterials || [
        {
            supplierName: card.vendor || "FINE FORGINGS PVT LTD",
            rmName: "F533-65-RM",
            rmDescription: "ASTM A182 F316 STAINLESS STEEL",
            grnNo: "GS250748",
            grnDate: "03/04/2025",
            supplierDcNo: "7831",
            dcDate: "29/03/2025",
            uom: "NOS",
            grnQty: 55,
            routeCardQty: 4,
            rmConsQty: "4.000"
        }
    ];
    const heatNumbers = card.heatNumbers || [
        { sNo: 1, heatNo: "H-90823", qty: 4, certNo: "TC-2025-998", status: "Verified & Passed" },
        { sNo: 2, heatNo: "HT-2025-44B", qty: 10, certNo: "TC-2025-999", status: "Verified & Passed" }
    ];

    const summaryRows = formatSummaryRows(fin, fmt);
    const docNo = card.poNo;
    const labels = docLabels(card);
    const approvedBy = card.approvedBy || "—";
    const approvedDateTime = card.approvedDateTime || "—";

    return createPortal(
        <div className="map-modal map-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="map-preview-box">
                <div className="map-prev__hd">
                    <div className="map-prev__hd-left">
                        <div className="map-prev__hd-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                        </div>
                        <div>
                            <div className="map-prev__hd-title">M-Approval Detail Preview</div>
                            <div className="map-prev__hd-sub">
                                {card.type === "Vendor Rate Master" ? labels.docTitle : `${labels.docTitle} — ${docNo}`}
                            </div>
                        </div>
                    </div>
                    <div className="map-prev__hd-right">
                        <span className={`map-prev__badge map-prev__badge--${card.status.toLowerCase()}`}>
                            {card.status === "Approved" ? "Approved" : "Pending"}
                        </span>
                        <button type="button" className="map-prev__close" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="map-prev__meta">
                    <div className="map-prev__meta-item">
                        <span className="map-prev__meta-label">{labels.docDateLabel}</span>
                        <span className="map-prev__meta-val">{card.poDate}</span>
                    </div>
                    <div className="map-prev__meta-item">
                        <span className="map-prev__meta-label">
                            {card.type === "Commercial Master" ? "Part No" : card.type === "Purchase Indent Approval" ? "Department" : "Vendor / Customer"}
                        </span>
                        <span className="map-prev__meta-val map-prev__meta-val--vendor">
                            {card.type === "Commercial Master" ? card.partNo : card.type === "Purchase Indent Approval" ? card.department : card.vendor}
                        </span>
                    </div>
                    <div className="map-prev__meta-item">
                        <span className="map-prev__meta-label">Type</span>
                        <span className="map-prev__meta-val">{card.poType || card.type}</span>
                    </div>
                    {card.type === "Customer PO" && (
                        <>
                            <div className="map-prev__meta-item">
                                <span className="map-prev__meta-label">Auto PO No</span>
                                <span className="map-prev__meta-val" style={{ fontWeight: 700, color: "#e11d48" }}>{card.apoNo || "—"}</span>
                            </div>
                            <div className="map-prev__meta-item">
                                <span className="map-prev__meta-label">PO No</span>
                                <span className="map-prev__meta-val" style={{ fontWeight: 700, color: "#e11d48" }}>{card.poNo || "—"}</span>
                            </div>
                        </>
                    )}
                    {card.type === "Purchase Indent Approval" && (
                        <>
                            <div className="map-prev__meta-item">
                                <span className="map-prev__meta-label">Requested By</span>
                                <span className="map-prev__meta-val" style={{ fontWeight: 700, color: "#e11d48" }}>{card.requestedBy || "—"}</span>
                            </div>
                            <div className="map-prev__meta-item">
                                <span className="map-prev__meta-label">Indent Type</span>
                                <span className="map-prev__meta-val" style={{ fontWeight: 700, color: "#e11d48" }}>{card.indentType || "—"}</span>
                            </div>
                        </>
                    )}
                    <div className="map-prev__meta-item map-prev__meta-item--compact">
                        <span className="map-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            Approved By
                        </span>
                        <span className={`map-prev__meta-val-badge map-prev__meta-val-badge--${card.approvedBy ? "approved" : "pending"}`}>
                            {approvedBy}
                        </span>
                    </div>
                    <div className="map-prev__meta-item map-prev__meta-item--compact">
                        <span className="map-prev__meta-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                            Date-Time
                        </span>
                        <span className={`map-prev__meta-val-badge map-prev__meta-val-badge--${card.approvedBy ? "approved" : "pending"}`}>
                            {approvedDateTime}
                        </span>
                    </div>
                </div>

                <div className="map-prev__body">
                    {card.type === "Vendor Master" ? null : card.type === "Commercial Master" ? (
                        <div className="map-prev__tabs">
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "comm_rates" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("comm_rates")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Commercial Rates & Taxes
                            </button>
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "comm_ops" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("comm_ops")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                {["Raw Material", "Stores Material"].includes(card.subType) ? "Supplier Details" : "Operations & Contacts"}
                            </button>
                        </div>
                    ) : card.type === "Vendor Rate Master" ? (
                        <div className="map-prev__tabs">
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "items" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("items")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                Rate Details
                            </button>
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "raw_material" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("raw_material")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Rate Revision History ({(card.revisions || []).length})
                            </button>
                        </div>
                    ) : card.type === "Customer PO" ? (
                        <div className="map-prev__tabs">
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "po_items" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("po_items")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                PO Line Items ({(card.items || []).length})
                            </button>
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "po_schedules" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("po_schedules")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Delivery Schedules ({(card.schedules || []).length})
                            </button>
                        </div>
                    ) : card.type === "Purchase Indent Approval" ? (
                        <div className="map-prev__tabs">
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "po_items" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("po_items")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                Indent Items ({(card.items || []).length})
                            </button>
                        </div>
                    ) : (
                        <div className="map-prev__tabs">
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "items" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("items")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                Line Items & Operations ({items.length})
                            </button>
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "raw_material" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("raw_material")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                Raw Material & Supplier DC ({rawMaterials.length})
                            </button>
                            <button
                                type="button"
                                className={`map-prev__tab ${activeTab === "heat_no" ? "map-prev__tab--active" : ""}`}
                                onClick={() => setActiveTab("heat_no")}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Heat Traceability ({heatNumbers.length})
                            </button>
                        </div>
                    )}

                    {/* Unified Vendor Master Layout */}
                    {card.type === "Vendor Master" && (
                        <div className="map-prev__rate-details-modern">
                            <div className="map-vendor-modern-layout">
                                
                                {/* Card 1: Vendor Profile */}
                                <div className="map-vendor-card-section animate-fade-in">
                                    <div className="map-vendor-card-header">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        General Identity
                                    </div>
                                    <div className="map-vendor-card-grid-3">
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">ENTITY DT</span>
                                            <span className="map-vendor-card-val" style={{ fontWeight: 600 }}>
                                                {card.entityDate}
                                            </span>
                                        </div>
                                        <div className="map-vendor-card-item map-vendor-card-item--span-2">
                                            <span className="map-vendor-card-label">NAME</span>
                                            <span className="map-vendor-card-val map-vendor-card-val--highlight">{card.name}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">CATEGORY</span>
                                            <span className="map-vendor-card-val">{card.category || "—"}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">SUB CATEGORY</span>
                                            <span className="map-vendor-card-val">{card.subCategory || "—"}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">GROUP</span>
                                            <span className="map-vendor-card-val">{card.group || "—"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Address Details */}
                                <div className="map-vendor-card-section animate-fade-in" style={{ animationDelay: "0.1s" }}>
                                    <div className="map-vendor-card-header">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        Address & Geography
                                    </div>
                                    <div className="map-vendor-card-grid-3">
                                        <div className="map-vendor-card-item map-vendor-card-item--full">
                                            <span className="map-vendor-card-label">ADDRESS 1</span>
                                            <span className="map-vendor-card-val">{card.address1}</span>
                                        </div>
                                        <div className="map-vendor-card-item map-vendor-card-item--full">
                                            <span className="map-vendor-card-label">ADDRESS 2</span>
                                            <span className="map-vendor-card-val">{card.address2}</span>
                                        </div>
                                        <div className="map-vendor-card-item map-vendor-card-item--full">
                                            <span className="map-vendor-card-label">ADDRESS 3</span>
                                            <span className="map-vendor-card-val">{card.address3 || "—"}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">CITY</span>
                                            <span className="map-vendor-card-val">{card.city}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">STATE</span>
                                            <span className="map-vendor-card-val">{card.state}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">STATE CODE</span>
                                            <span className="map-vendor-card-val">{card.stateCode}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">COUNTRY</span>
                                            <span className="map-vendor-card-val">{card.country}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">COUNTRY CODE</span>
                                            <span className="map-vendor-card-val">{card.countryCode || "—"}</span>
                                        </div>
                                        <div className="map-vendor-card-item">
                                            <span className="map-vendor-card-label">PINCODE</span>
                                            <span className="map-vendor-card-val" style={{ fontWeight: 600 }}>{card.pincode}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row containing Card 3 & Card 4 side-by-side */}
                                <div className="map-vendor-card-row-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                                    {/* Card 3: Contact Channels */}
                                    <div className="map-vendor-card-section">
                                        <div className="map-vendor-card-header">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                            Communication
                                        </div>
                                        <div className="map-vendor-card-grid-2">
                                            <div className="map-vendor-card-item">
                                                <span className="map-vendor-card-label">PHONE NO</span>
                                                <span className="map-vendor-card-val">{card.phoneNo || "—"}</span>
                                            </div>
                                            <div className="map-vendor-card-item">
                                                <span className="map-vendor-card-label">MOBILE NO</span>
                                                <span className="map-vendor-card-val" style={{ fontWeight: 600 }}>{card.mobileNo || "—"}</span>
                                            </div>
                                            <div className="map-vendor-card-item">
                                                <span className="map-vendor-card-label">FAX NO</span>
                                                <span className="map-vendor-card-val">{card.faxNo || "—"}</span>
                                            </div>
                                            <div className="map-vendor-card-item">
                                                <span className="map-vendor-card-label">WEB SITE</span>
                                                <span className="map-vendor-card-val">{card.website || "—"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 4: Accounts Ledger */}
                                    <div className="map-vendor-card-section">
                                        <div className="map-vendor-card-header">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                                            Accounting Ledger
                                        </div>
                                        <div className="map-vendor-card-grid-2">
                                            <div className="map-vendor-card-item map-vendor-card-item--full">
                                                <span className="map-vendor-card-label">A/C LEDGER NAME</span>
                                                <span className="map-vendor-card-val" style={{ fontWeight: 600 }}>{card.acLedgerName || "—"}</span>
                                            </div>
                                            <div className="map-vendor-card-item map-vendor-card-item--full">
                                                <span className="map-vendor-card-label">A/C LEDGER HEAD</span>
                                                <span className="map-vendor-card-val">{card.acLedgerHead || "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* TAB: Customer PO Line Items */}
                    {activeTab === "po_items" && card.type === "Customer PO" && (
                        <div className="map-prev__table-wrap animate-fade-in">
                            <table className="map-prev__table">
                                <thead>
                                    <tr>
                                        <th className="map-prev__td--center">Sl.No</th>
                                        <th>Partno</th>
                                        <th className="map-prev__td--desc">Description</th>
                                        <th className="map-prev__td--center">Uom</th>
                                        <th className="map-prev__td--num">Qty</th>
                                        <th className="map-prev__td--num">Rate</th>
                                        <th className="map-prev__td--num">Ammount</th>
                                        <th className="map-prev__td--center map-prev__th--sticky">Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(card.items || []).map((row, i) => {
                                        const amt = row.qty * row.rate;
                                        return (
                                            <tr key={i}>
                                                <td className="map-prev__td--center">{i + 1}</td>
                                                <td><span className="map-prev__code">{row.partNo}</span></td>
                                                <td className="map-prev__td--desc">{row.description}</td>
                                                <td className="map-prev__td--center">{row.uom || "NOS"}</td>
                                                <td className="map-prev__td--num">{row.qty}</td>
                                                <td className="map-prev__td--num">₹ {fmt(row.rate)}</td>
                                                <td className="map-prev__td--num" style={{ fontWeight: 700, color: "#e11d48" }}>₹ {fmt(amt)}</td>
                                                <td className="map-prev__td--center map-prev__td--sticky">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!approvedPoRows[i]} 
                                                        onChange={() => setApprovedPoRows(prev => ({ ...prev, [i]: !prev[i] }))}
                                                        className="map-prev__checkbox"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                        </div>
                    )}

                    {/* TAB: Purchase Indent Line Items */}
                    {activeTab === "po_items" && card.type === "Purchase Indent Approval" && (
                        <div className="map-prev__table-wrap animate-fade-in">
                            <table className="map-prev__table">
                                <thead>
                                    <tr>
                                        <th className="map-prev__td--center" style={{ whiteSpace: 'nowrap' }}>Sl.No</th>
                                        <th style={{ whiteSpace: 'nowrap' }}>PI No</th>
                                        <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                                        <th style={{ minWidth: '180px' }}>Raw Material Name</th>
                                        <th style={{ minWidth: '180px' }}>Material Type</th>
                                        <th className="map-prev__td--center" style={{ whiteSpace: 'nowrap' }}>Dia</th>
                                        <th className="map-prev__td--center" style={{ whiteSpace: 'nowrap' }}>Uom</th>
                                        <th className="map-prev__td--num" style={{ whiteSpace: 'nowrap' }}>Qty</th>
                                        <th className="map-prev__td--num" style={{ whiteSpace: 'nowrap' }}>Qty (Others)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(card.items || []).map((row, i) => {
                                        return (
                                            <tr key={i}>
                                                <td className="map-prev__td--center">{i + 1}</td>
                                                <td><span className="map-prev__code" style={{ whiteSpace: 'nowrap' }}>{card.poNo}</span></td>
                                                <td><span style={{ whiteSpace: 'nowrap' }}>{card.poDate}</span></td>
                                                <td className="map-prev__td--desc" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '180px', maxWidth: '240px', lineHeight: '1.4' }}>
                                                    {row.rawMaterialName}
                                                </td>
                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '180px', maxWidth: '240px', lineHeight: '1.4' }}>
                                                    {row.materialType}
                                                </td>
                                                <td className="map-prev__td--center"><span style={{ whiteSpace: 'nowrap' }}>{row.dia}</span></td>
                                                <td className="map-prev__td--center"><span style={{ whiteSpace: 'nowrap' }}>{row.uom || "NOS"}</span></td>
                                                <td className="map-prev__td--num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{row.qty}</td>
                                                <td className="map-prev__td--num" style={{ whiteSpace: 'nowrap' }}>{Number(row.qtyOthers || 0).toFixed(3)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: Customer PO Delivery Schedules */}
                    {activeTab === "po_schedules" && card.type === "Customer PO" && (
                        <div className="map-prev__table-wrap animate-fade-in">
                            <table className="map-prev__table">
                                <thead>
                                    <tr>
                                        <th className="map-prev__td--center">Sl.No</th>
                                        <th>Partno</th>
                                        <th className="map-prev__td--center">Schedule Date</th>
                                        <th className="map-prev__td--num">Schedule Qty</th>
                                        <th className="map-prev__td--center">Required Date</th>
                                        <th className="map-prev__td--center">Po Sl No</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(card.schedules || []).map((row, i) => (
                                        <tr key={i}>
                                            <td className="map-prev__td--center">{i + 1}</td>
                                            <td><span className="map-prev__code">{row.partNo}</span></td>
                                            <td className="map-prev__td--center"><span className="map-prev__process">{row.date}</span></td>
                                            <td className="map-prev__td--num" style={{ fontWeight: 600 }}>{row.qty}</td>
                                            <td className="map-prev__td--center">{row.reqDate || "—"}</td>
                                            <td className="map-prev__td--center" style={{ fontWeight: 600 }}>{row.poSlNo || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}





                    {/* TAB 1: Line Items & Process Operations OR Rate Details */}
                    {activeTab === "items" && (
                        card.type === "Vendor Rate Master" || card.type === "Commercial Master" ? (
                            <div className="map-prev__rate-details-modern">
                                <div className="map-modern-layout">
                                    {/* Left Side: Technical Specs */}
                                    <div className="map-modern-left">
                                        <div className="map-modern-section">
                                            <div className="map-modern-section-title">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                Part & Process Specifications
                                            </div>
                                            
                                            <div className="map-modern-item">
                                                <div className="map-modern-label">Part Number</div>
                                                <div className="map-modern-value map-modern-value--part">
                                                    {card.partNo}
                                                </div>
                                            </div>

                                            <div className="map-modern-grid-two">
                                                <div className="map-modern-item">
                                                    <div className="map-modern-label">Issue Process</div>
                                                    <div className="map-modern-value-badge">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                                        {card.process}
                                                    </div>
                                                </div>
                                                
                                                <div className="map-modern-item">
                                                    <div className="map-modern-label">Return Process</div>
                                                    <div className="map-modern-value-badge map-modern-value-badge--return">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                                        {card.rtnProcess}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="map-modern-item">
                                                <div className="map-modern-label">HSN Classification</div>
                                                <div className="map-modern-hsn-pill">
                                                    <strong>HSN Code:</strong> {card.currentRate?.hsnCode}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Rate & Logistics Card */}
                                    <div className="map-modern-right">
                                        <div className="map-modern-rate-summary">
                                            <div className="map-summary-header">
                                                <span>Pricing Summary</span>
                                                <span className="map-summary-badge">Active</span>
                                            </div>
                                            
                                            <div className="map-summary-price-box">
                                                <div className="map-price-row">
                                                    <span className="map-price-lbl">Approved Unit Rate</span>
                                                    <span className="map-price-val">₹ {Number(card.currentRate?.rate || 0).toFixed(3)}</span>
                                                </div>
                                                <div className="map-price-row map-price-row--sub">
                                                    <span className="map-price-lbl">Rate per KGS</span>
                                                    <span className="map-price-val">₹ {Number(card.currentRate?.ratePerKgs || 0).toFixed(3)}</span>
                                                </div>
                                            </div>

                                            <div className="map-summary-logistics">
                                                <div className="map-log-item">
                                                    <span className="map-log-lbl">Effective Date</span>
                                                    <span className="map-log-val">{card.currentRate?.effDate}</span>
                                                </div>
                                                <div className="map-log-item">
                                                    <span className="map-log-lbl">Cycle Time</span>
                                                    <span className="map-log-val">{card.currentRate?.cycleTime}</span>
                                                </div>
                                                <div className="map-log-item">
                                                    <span className="map-log-lbl">Process Lead Days</span>
                                                    <span className="map-log-val">{card.currentRate?.leadDays} Days</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="map-prev__audit-section">
                                    <h4 className="map-audit-heading">Rate Revision Audit Logs</h4>
                                    <div className="map-prev__audit-grid">
                                        <div className="map-prev__audit-card">
                                            <div className="map-audit-title">Prepared / Modified Details</div>
                                            <div className="map-audit-desc">
                                                <span>User:</span> <strong>{card.lastModifiedUser}</strong>
                                            </div>
                                            <div className="map-audit-desc">
                                                <span>Date & Time:</span> <strong>{card.lastModifiedDate} at {card.lastModifiedTime}</strong>
                                            </div>
                                        </div>
                                        <div className="map-prev__audit-card">
                                            <div className="map-audit-title">Last Approved Details</div>
                                            <div className="map-audit-desc">
                                                <span>User:</span> <strong>{card.lastApprovedUser}</strong>
                                            </div>
                                            <div className="map-audit-desc">
                                                <span>Date & Time:</span> <strong>{card.lastApprovedDate} at {card.lastApprovedTime}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="map-prev__table-wrap">
                                <table className="map-prev__table">
                                    <thead>
                                        <tr>
                                            <th className="map-prev__td--center">Sl.No</th>
                                            <th>Part No</th>
                                            <th className="map-prev__td--desc">Description</th>
                                            <th>Process</th>
                                            <th className="map-prev__td--center">UOM</th>
                                            <th className="map-prev__td--num">
                                                {card.type === "Vendor Rate Master" ? "Rate (₹)" : "Qty"}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row, i) => (
                                            <tr key={i}>
                                                <td className="map-prev__td--center">{row.sNo}</td>
                                                <td><span className="map-prev__code">{row.codeNo}</span></td>
                                                <td className="map-prev__td--desc">{row.description}</td>
                                                <td><span className="map-prev__process">{row.process || "PRE MACHINING & CNC"}</span></td>
                                                <td className="map-prev__td--center">{row.uom}</td>
                                                <td className="map-prev__td--num" style={{ fontWeight: 700 }}>
                                                    {card.type === "Vendor Rate Master" || card.type === "Commercial Master"
                                                        ? `₹ ${Number(row.rate || 0).toLocaleString("en-IN")}`
                                                        : Number(row.qty || 0).toLocaleString("en-IN")
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* TAB 2: Raw Material & Supplier Details OR Rate Revision History */}
                    {activeTab === "raw_material" && (
                        card.type === "Vendor Rate Master" || card.type === "Commercial Master" ? (
                            <div className="map-prev__table-wrap">
                                <table className="map-prev__table">
                                    <thead>
                                        <tr>
                                            <th className="map-prev__td--center" style={{ width: '60px' }}>Sl.No</th>
                                            <th className="map-prev__td--num" style={{ width: '120px' }}>Rate (₹)</th>
                                            <th style={{ width: '180px' }}>Revision No</th>
                                            <th style={{ width: '140px' }}>Revision Date</th>
                                            <th style={{ width: '140px' }}>Effective From</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(card.revisions || []).map((rev, i) => (
                                            <tr key={i}>
                                                <td className="map-prev__td--center">{i + 1}</td>
                                                <td className="map-prev__td--num" style={{ fontWeight: 700, color: "#e11d48" }}>
                                                    ₹ {Number(rev.rate).toFixed(3)}
                                                </td>
                                                <td><span className="map-prev__code">{rev.revNo}</span></td>
                                                <td>{rev.revDate}</td>
                                                <td>{rev.effFrom}</td>
                                                <td>{rev.remarks || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="map-prev__table-wrap">
                                <table className="map-prev__table map-prev__table--raw">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '160px' }}>Supplier Name</th>
                                            <th style={{ width: '110px' }}>RM Code</th>
                                            <th className="map-prev__td--desc" style={{ minWidth: '220px' }}>RM Description</th>
                                            <th style={{ width: '150px' }}>GRN No & Date</th>
                                            <th style={{ width: '150px' }}>Supplier DC & Date</th>
                                            <th className="map-prev__td--center" style={{ width: '60px' }}>UOM</th>
                                            <th className="map-prev__td--num" style={{ width: '80px' }}>GRN Qty</th>
                                            <th className="map-prev__td--num" style={{ width: '85px' }}>Route Qty</th>
                                            <th className="map-prev__td--num" style={{ width: '85px' }}>Cons Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rawMaterials.map((rm, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 700, color: "#e11d48" }}>{rm.supplierName}</td>
                                                <td><span className="map-prev__code">{rm.rmName}</span></td>
                                                <td className="map-prev__td--desc">{rm.rmDescription}</td>
                                                <td>{rm.grnNo} <span style={{ opacity: .75, fontSize: '.75rem' }}>({rm.grnDate})</span></td>
                                                <td>{rm.supplierDcNo} <span style={{ opacity: .75, fontSize: '.75rem' }}>({rm.dcDate})</span></td>
                                                <td className="map-prev__td--center">{rm.uom}</td>
                                                <td className="map-prev__td--num">{rm.grnQty}</td>
                                                <td className="map-prev__td--num">{rm.routeCardQty}</td>
                                                <td className="map-prev__td--num map-prev__td--amt">{rm.rmConsQty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* TAB 3: Heat Traceability Breakdown */}
                    {activeTab === "heat_no" && (
                        <div className="map-prev__table-wrap map-prev__table-wrap--compact">
                            <table className="map-prev__table map-prev__table--heat">
                                <thead>
                                    <tr>
                                        <th className="map-prev__td--center" style={{ width: '70px' }}>S.No</th>
                                        <th style={{ width: '220px' }}>Heat No</th>
                                        <th className="map-prev__td--num" style={{ width: '90px' }}>Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatNumbers.map((hn, i) => (
                                        <tr key={i}>
                                            <td className="map-prev__td--center">{hn.sNo}</td>
                                            <td><span className="map-prev__code" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>{hn.heatNo}</span></td>
                                            <td className="map-prev__td--num" style={{ fontWeight: 700 }}>{hn.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 4: Commercial Rates & Taxes */}
                    {activeTab === "comm_rates" && (
                        <div className="map-comm-rates-tab">
                            {/* Specifications & Modification Flags Card */}
                            <div className="map-comm-spec-card">
                                <div className="map-comm-spec-grid">
                                    <div className="map-comm-spec-item">
                                        <span className="map-comm-label">CM No.</span>
                                        <span className="map-comm-val map-comm-val--code">{card.poNo}</span>
                                    </div>
                                    <div className="map-comm-spec-item">
                                        <span className="map-comm-label">BTYPE</span>
                                        <span className="map-comm-val">{card.subType || "—"}</span>
                                    </div>
                                    <div className="map-comm-spec-item">
                                        <span className="map-comm-label">HSN / SAC Code</span>
                                        <span className="map-comm-val map-comm-val--code">{card.hsnCode || "73259910"}</span>
                                    </div>
                                    <div className="map-comm-spec-item">
                                        <span className="map-comm-label">HSN / SAC Heading</span>
                                        <span className="map-comm-val">{card.hsnHeading || "—"}</span>
                                    </div>
                                </div>

                                <div className="map-comm-flags">
                                    <span className="map-comm-flag-badge map-comm-flag-badge--inactive">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        HSN Code Modified
                                    </span>
                                    <span className="map-comm-flag-badge map-comm-flag-badge--inactive">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        Base Rate Modified
                                    </span>
                                    <span className="map-comm-flag-badge map-comm-flag-badge--active">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        Tax Details Modified
                                    </span>
                                    <span className="map-comm-flag-badge map-comm-flag-badge--inactive">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                        Supplier Rate Modified
                                    </span>
                                </div>
                            </div>

                            <div className="map-comm-tables-grid">
                                <div className="map-comm-table-wrap">
                                    <div className="map-comm-table-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                                        Exchange Rates & Pricing Breakdown
                                    </div>
                                    <div className="map-prev__table-wrap">
                                        <table className="map-comm-table">
                                            <thead>
                                                <tr>
                                                    <th>INR Selling</th>
                                                    <th className="map-prev__td--center">Currency</th>
                                                    <th className="map-prev__td--num">Ex. Rate</th>
                                                    <th className="map-prev__td--num">INR Net Rate</th>
                                                    <th className="map-prev__td--center">Eff. Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(card.baseRates || []).map((br, index) => (
                                                    <tr key={index}>
                                                        <td style={{ fontWeight: 700 }}>₹ {Number(br.baseRate).toLocaleString("en-IN", { minimumFractionDigits: 3 })}</td>
                                                        <td className="map-prev__td--center"><span className="map-prev__code">{br.currPref}</span></td>
                                                        <td className="map-prev__td--num">{Number(br.brCurrRate).toFixed(3)}</td>
                                                        <td className="map-prev__td--num" style={{ fontWeight: 700, color: "#e11d48" }}>₹ {Number(br.netRate).toLocaleString("en-IN", { minimumFractionDigits: 3 })}</td>
                                                        <td className="map-prev__td--center">{br.brEffDt}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="map-comm-table-wrap">
                                    <div className="map-comm-table-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                                        Taxation Structure & Additional Charges
                                    </div>
                                    <div className="map-prev__table-wrap">
                                        <table className="map-comm-table">
                                            <thead>
                                                <tr>
                                                    <th>Tax Type</th>
                                                    <th className="map-prev__td--num">Tax %</th>
                                                    <th>Surcharge Type</th>
                                                    <th className="map-prev__td--num">Sur %</th>
                                                    <th className="map-prev__td--num">Addl Chg</th>
                                                    <th className="map-prev__td--center">Eff. Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(card.taxes || []).map((t, index) => (
                                                    <tr key={index}>
                                                        <td>{t.taxType}</td>
                                                        <td className="map-prev__td--num">{Number(t.taxPer).toFixed(2)}%</td>
                                                        <td>{t.surType || "—"}</td>
                                                        <td className="map-prev__td--num">{Number(t.surPer).toFixed(2)}%</td>
                                                        <td className="map-prev__td--num">₹ {Number(t.addlChg).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                        <td className="map-prev__td--center">{t.txEffDt}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Operations & Contacts / Supplier Details */}
                    {activeTab === "comm_ops" && (
                        <div className="map-comm-ops-tab">
                            {["Raw Material", "Stores Material"].includes(card.subType) ? (
                                <div className="map-comm-table-wrap" style={{ width: "100%" }}>
                                    <div className="map-comm-table-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        Supplier Details
                                    </div>
                                    <div className="map-prev__table-wrap">
                                        <table className="map-comm-table">
                                            <thead>
                                                <tr>
                                                    <th>Supplier</th>
                                                    <th className="map-prev__td--num">Base Rate (₹)</th>
                                                    <th className="map-prev__td--center">Base Rate Eff Date</th>
                                                    <th className="map-prev__td--num">Net Rate (₹)</th>
                                                    <th className="map-prev__td--center">Net Rate Eff Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(card.suppliers || []).map((s, index) => (
                                                    <tr key={index}>
                                                        <td style={{ fontWeight: 600 }}>{s.supplierName}</td>
                                                        <td className="map-prev__td--num" style={{ fontWeight: 700 }}>₹ {Number(s.baseRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                        <td className="map-prev__td--center">{s.baseRateEffDate}</td>
                                                        <td className="map-prev__td--num" style={{ fontWeight: 700, color: "#e11d48" }}>₹ {Number(s.netRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                        <td className="map-prev__td--center">{s.netRateEffDate}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="map-comm-tables-grid">
                                    <div className="map-comm-table-wrap">
                                        <div className="map-comm-table-title">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                            Process Pricing Breakdown
                                        </div>
                                        <div className="map-prev__table-wrap">
                                            <table className="map-comm-table">
                                                <thead>
                                                    <tr>
                                                        <th>Process Operation</th>
                                                        <th className="map-prev__td--num">Process Rate (₹)</th>
                                                        <th className="map-prev__td--num">Sale Rate (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(card.processes || []).map((p, index) => (
                                                        <tr key={index}>
                                                            <td style={{ fontWeight: 600 }}>{p.processName}</td>
                                                            <td className="map-prev__td--num">₹ {Number(p.rate).toLocaleString("en-IN", { minimumFractionDigits: 3 })}</td>
                                                            <td className="map-prev__td--num" style={{ fontWeight: 700 }}>₹ {Number(p.saleRate).toLocaleString("en-IN", { minimumFractionDigits: 3 })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="map-comm-table-wrap">
                                        <div className="map-comm-table-title">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            Key Accounts & Buyer Contacts
                                        </div>
                                        <div className="map-prev__table-wrap">
                                            <table className="map-comm-table">
                                                <thead>
                                                    <tr>
                                                        <th>Buyer Name</th>
                                                        <th>Email ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(card.buyers || []).map((b, index) => (
                                                        <tr key={index}>
                                                            <td style={{ fontWeight: 600 }}>{b.contact}</td>
                                                            <td>{b.email ? <a href={`mailto:${b.email}`} style={{ color: "#e11d48", textDecoration: "none" }}>{b.email}</a> : "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="map-prev__footer">
                    <button type="button" className="map-prev-btn map-prev-btn--ghost" onClick={onClose}>Close</button>
                    {card.status === "Approved" ? (
                        <button
                            type="button"
                            className="map-prev-btn map-prev-btn--modify"
                            disabled={!!actionLoading}
                            onClick={() => onModify(card)}
                        >
                            {actionLoading?.pono === docNo && actionLoading?.type === "modify"
                                ? <><BtnSpinner /> Modifying…</>
                                : "Modify Open"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="map-prev-btn map-prev-btn--approve"
                            disabled={!!actionLoading || (card.type === "Customer PO" && !Object.values(approvedPoRows).some(val => val === true))}
                            onClick={() => {
                                if (card.type === "Customer PO") {
                                    const selectedSerials = (card.items || [])
                                        .filter((_, idx) => approvedPoRows[idx])
                                        .map(item => item.poSlNo);
                                    onApprove(card, selectedSerials);
                                } else {
                                    onApprove(card);
                                }
                            }}
                        >
                            {actionLoading?.pono === docNo && actionLoading?.type === "approve"
                                ? <><BtnSpinner /> Approving…</>
                                : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12" /></svg> {labels.approveLabel}</>}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

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
        <div className="map-group">
            <div className="map-group__hd" onClick={onToggle}>
                <div className="map-group__hd-left">
                    <span className="map-group__hd-icon">{TYPE_ICONS[type] ?? TYPE_ICONS["Material - General"]}</span>
                    <span className="map-group__hd-title">{type}</span>

                    <button
                        type="button"
                        className={`map-group__pill map-group__pill--all ${filterStatus === "All" ? "map-group__pill--all-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "All")}
                    >
                        {cards.length} All
                    </button>
                    <button
                        type="button"
                        className={`map-group__pill map-group__pill--pending ${filterStatus === "Pending" ? "map-group__pill--pending-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "Pending")}
                    >
                        {pendingCount} Pending
                    </button>
                    <button
                        type="button"
                        className={`map-group__pill map-group__pill--approved ${filterStatus === "Approved" ? "map-group__pill--approved-active" : ""}`}
                        onClick={(e) => handlePillClick(e, "Approved")}
                    >
                        {approvedCount} Approved
                    </button>
                </div>
                <button type="button" className="map-group__collapse-btn">
                    <span>{collapsed ? "Expand" : "Collapse"}</span>
                </button>
            </div>

            <div className={`map-group__body${collapsed ? " map-group__body--collapsed" : ""}`}>
                <div className="map-grid map-grid--group">
                    {displayedCards.map((card, i) => {
                        const status = resolvedStatus(card);
                        const labels = docLabels(card);
                        return (
                            <div
                                key={card.id}
                                className="map-card"
                                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                                onClick={() => onPreview({ ...card, status })}
                            >
                                <div className="map-card__hd">
                                    <span className="map-card__type">{card.type}</span>
                                    <span className={`map-card__status map-card__status--${status.toLowerCase()}`}>{status}</span>
                                </div>
                                {card.type === "Commercial Master" ? (
                                    <div className="map-card__vendor">{card.subType || "Customer Product"}</div>
                                ) : card.type === "Purchase Indent Approval" ? null : (
                                    <div className="map-card__vendor">{card.vendor}</div>
                                )}
                                <div className="map-card__info">
                                    {card.type === "Vendor Rate Master" ? (
                                        <div className="map-info-row map-info-row--part">
                                            <span className="map-info-label">PART NO</span>
                                            <span className="map-info-val map-info-val--part">{card.partNo}</span>
                                        </div>
                                    ) : card.type === "Commercial Master" ? (
                                        <>
                                            <div className="map-info-row">
                                                <span className="map-info-label">TRANS NO</span>
                                                <span className="map-info-val">{card.poNo}</span>
                                            </div>
                                            <div className="map-info-row">
                                                <span className="map-info-label">TRANS DATE</span>
                                                <span className="map-info-val">{card.poDate}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="map-info-row">
                                                <span className="map-info-label">{labels.docNoLabel}</span>
                                                <span className="map-info-val">{card.poNo}</span>
                                            </div>
                                            <div className="map-info-row">
                                                <span className="map-info-label">{labels.docDateLabel}</span>
                                                <span className="map-info-val">{card.poDate}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="map-card__count">
                                    <div className="map-count-row">
                                        <span className="map-count-label">{card.type === "Product Route Card" ? "Batch Qty:" : (card.countLabel ? `${card.countLabel}:` : "Amount:")}</span>
                                        <span className="map-count-val">
                                            {card.type === "Product Route Card"
                                                ? `${card.countVal} Nos`
                                                : ["Customer PO", "Vendor Master", "Purchase Indent Approval"].includes(card.type)
                                                    ? card.countVal
                                                    : `₹ ${Number(card.countVal).toLocaleString("en-IN")}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="map-card__actions">
                                    <button type="button" className="map-action-btn"
                                        onClick={e => { e.stopPropagation(); onPreview({ ...card, status }); }}>
                                        Preview
                                    </button>
                                    {status === "Approved" ? (
                                        <button type="button" className="map-action-btn map-action-btn--modify"
                                            disabled={!!actionLoading}
                                            onClick={e => { e.stopPropagation(); onModify(card); }}>
                                            {actionLoading?.pono === card.poNo && actionLoading?.type === "modify"
                                                ? <><BtnSpinner /> Modifying…</>
                                                : "Modify Open"}
                                        </button>
                                    ) : (
                                        <button type="button" className="map-action-btn map-action-btn--primary"
                                            disabled={!!actionLoading}
                                            onClick={e => { e.stopPropagation(); onApprove(card); }}>
                                            {actionLoading?.pono === card.poNo && actionLoading?.type === "approve"
                                                ? <><BtnSpinner /> Approving…</>
                                                : "Approve"}
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

/* ── sessionStorage filter helpers ── */
function readFilterSession(key, defaults) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        if (parsed.from) parsed.from = new Date(parsed.from);
        if (parsed.to) parsed.to = new Date(parsed.to);
        return { ...defaults, ...parsed };
    } catch { return defaults; }
}
function writeFilterSession(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { }
}

export default function MApproval() {
    const today = new Date();
    const _saved = readFilterSession("ba_filter_mapproval", { from: today, to: today, search: "" });
    const [search, setSearch] = useState(_saved.search || "");
    const [cards, setCards] = useState([]);
    const [selected, setSelected] = useState(null);

    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [typeFilter, setTypeFilter] = useState(null);
    const [typeDropOpen, setTypeDropOpen] = useState(false);
    const [typePanelStyle, setTypePanelStyle] = useState({});
    const typeDropRef = useRef(null);
    const typeTriggerRef = useRef(null);
    const detailCache = useRef({});

    const stats = useMemo(() => {
        if (isLoading && cards.length === 0) {
            return [
                { label: "Total Documents", value: "—", change: "Fetching documents..." },
                { label: "Approved", value: "—", change: "Fetching stats..." },
                { label: "Pending", value: "—", change: "Fetching stats..." },
            ];
        }
        const total = cards.length;
        const approvedCount = cards.filter(c => c.status === "Approved").length;
        const pendingCount = total - approvedCount;
        const approvalRate = total > 0 ? (approvedCount / total * 100).toFixed(1) : "0.0";
        const remainingRate = total > 0 ? (100 - parseFloat(approvalRate)).toFixed(1) : "0.0";
        const totalValue = cards.reduce((sum, c) => sum + (Number(c.countVal) || 0), 0);

        return [
            {
                label: "Total Documents",
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
                change: total > 0 ? `↓ ${remainingRate}% remaining` : "No documents in range",
            },
        ];
    }, [cards, isLoading]);

    useEffect(() => {
        writeFilterSession("ba_filter_mapproval", { from: dateRange.from, to: dateRange.to, search });
    }, [dateRange.from, dateRange.to, search]);

    const addToast = useCallback((msg, type = "success-approve") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
    }, []);

    useEffect(() => {
        if (!typeDropOpen) return;
        const h = e => {
            if (typeDropRef.current && typeDropRef.current.contains(e.target)) return;
            if (e.target.closest(".map-type-dd__panel-portal")) return;
            setTypeDropOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [typeDropOpen]);

    useEffect(() => {
        if (!typeDropOpen || !typeTriggerRef.current) return;
        const reposition = () => {
            const rect = typeTriggerRef.current.getBoundingClientRect();
            setTypePanelStyle({ position: "fixed", top: rect.bottom + 6, left: rect.left, zIndex: 999999 });
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

    const resolvedStatus = card => card.status;

    const refreshBoard = useCallback(async () => {
        const from = toYMD(dateRange.from);
        const to = toYMD(dateRange.to || dateRange.from);
        if (!from) return;
        detailCache.current = {};
        setIsLoading(true);
        try {
            const qsList = new URLSearchParams({ from, to, from_date: from, to_date: to, page: "1", page_size: "2000" });
            const resList = await fetch(`${API}/mapproval/list/?${qsList}`, { credentials: "include" });
            let fetchedCards = [];
            if (resList.ok) {
                const dataList = await resList.json();
                if (dataList && dataList.cards) {
                    fetchedCards = dataList.cards;
                }
            }

            setCards(fetchedCards);
        } catch (e) {
            console.error(e);
            setCards([]);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange.from, dateRange.to]);

    useEffect(() => { refreshBoard(); }, [refreshBoard]);

    const handleResetFilters = useCallback(() => {
        const today = new Date();
        setDateRange({ from: today, to: today });
        setSearch("");
        setTypeFilter(null);
        writeFilterSession("ba_filter_mapproval", { from: today, to: today, search: "" });
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return cards.filter(c => {
            if (typeFilter && c.type !== typeFilter) return false;
            if (!q) return true;
            return (
                (c.vendor || "").toLowerCase().includes(q) ||
                (c.poNo || "").toLowerCase().includes(q) ||
                (c.type || "").toLowerCase().includes(q)
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

    const availableTypes = useMemo(() => {
        const seen = new Set();
        cards.forEach(c => { if (c.type) seen.add(c.type); });
        const ordered = TYPE_ORDER.filter(t => seen.has(t));
        const extras = [...seen].filter(t => !TYPE_ORDER.includes(t));
        return [...ordered, ...extras];
    }, [cards]);

    const openPreview = useCallback(async (listCard) => {
        const invno = listCard.docKind === "customer_po" ? listCard.id.replace("customer_po:", "") : listCard.poNo;
        const docKind = (listCard.docKind || "invoice").toLowerCase();
        const cacheKey = listCard.id || `${docKind}:${invno}`;

        if (docKind === "vendor_master") {
            setSelected({ ...listCard });
            setPreviewLoading(false);
            return;
        }

        if (listCard.items && listCard.items.length > 0) {
            detailCache.current[cacheKey] = { ...listCard };
            setSelected({ ...listCard });
            setPreviewLoading(false);
            return;
        }

        if (detailCache.current[cacheKey]) {
            setSelected({ ...detailCache.current[cacheKey] });
            setPreviewLoading(false);
            return;
        }

        const qs = new URLSearchParams({
            invno,
            doc_kind: docKind,
            from: toYMD(dateRange.from),
            to: toYMD(dateRange.to || dateRange.from),
        });
        setPreviewLoading(true);
        setSelected({ ...listCard, items: listCard.items || [], financial: listCard.financial || null, _loading: true });
        try {
            const res = await fetch(`${API}/mapproval/detail/?${qs}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.success && data.card) {
                const merged = { ...data.card, id: listCard.id };
                detailCache.current[cacheKey] = merged;
                setSelected(merged);
            } else {
                console.error(data.error || res.statusText);
                setSelected({ ...listCard, items: listCard.items || [], financial: listCard.financial || null });
            }
        } catch (e) {
            console.error(e);
            setSelected({ ...listCard, items: listCard.items || [], financial: listCard.financial || null });
        } finally {
            setPreviewLoading(false);
        }
    }, [dateRange.from, dateRange.to]);

    const handleApprove = useCallback(async (card, lineApprovals = null) => {
        const invno = card.docKind === "customer_po" ? card.apoNo : card.poNo;
        const docKind = (card.docKind || "invoice").toLowerCase();
        const cacheKey = card.id || `${docKind}:${invno}`;
        const docLabel = docKind === "dc" ? "DC" : docKind === "ret_dc" ? "Returnable DC" : docKind === "vendor_rate" ? "Vendor Rate" : docKind === "commercial" ? "Commercial Master" : docKind === "customer_po" ? "Customer PO" : "Document";
        if (!invno || actionLoading) return;
        setActionLoading({ pono: card.poNo, type: "approve" });

        try {
            const bodyObj = { invno, doc_kind: docKind };
            if (lineApprovals !== null) {
                bodyObj.line_approvals = lineApprovals;
            }

            const res = await fetch(`${API}/mapproval/approve/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyObj),
            });
            const data = await res.json();
            if (!res.ok) { addToast(data.error || "Approve failed", "error"); return; }
            delete detailCache.current[cacheKey];


            const updatedBy = data.approvedBy || "Manager";
            const updatedDt = data.approvedDateTime || "Just now";

            const approvedSerials = lineApprovals !== null ? lineApprovals : (card.items || []).map(item => item.poSlNo);

            setCards(prev => prev.map(c =>
                (c.poNo === card.poNo || c.id === card.id)
                    ? { 
                        ...c, 
                        status: "Approved", 
                        approvedBy: updatedBy, 
                        approvedDateTime: updatedDt,
                        items: (c.items || []).map(item => ({ ...item, approved: approvedSerials.includes(item.poSlNo) }))
                      }
                    : c
            ));

            setSelected(prev => (prev && (prev.poNo === card.poNo || prev.id === card.id))
                ? { 
                    ...prev, 
                    status: "Approved", 
                    approvedBy: updatedBy, 
                    approvedDateTime: updatedDt,
                    items: (prev.items || []).map(item => ({ ...item, approved: approvedSerials.includes(item.poSlNo) }))
                  }
                : prev
            );

            const displayNo = card.poNo.includes("|") ? card.poNo.split("|")[2] : card.poNo;
            addToast(`${docLabel} ${displayNo} approved`, "success-approve");
            if (docKind === "customer_po") {
                await refreshBoard();
                setSelected(null);
            }
        } catch (e) {
            addToast("Network error — please try again", "error");
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast, refreshBoard, setSelected]);

    const handleModify = useCallback(async (card) => {
        const invno = card.docKind === "customer_po" ? card.apoNo : card.poNo;
        const docKind = (card.docKind || "invoice").toLowerCase();
        const cacheKey = card.id || `${docKind}:${invno}`;
        const docLabel = docKind === "dc" ? "DC" : docKind === "ret_dc" ? "Returnable DC" : docKind === "vendor_rate" ? "Vendor Rate" : docKind === "commercial" ? "Commercial Master" : docKind === "customer_po" ? "Customer PO" : "Document";
        if (!invno || actionLoading) return;
        setActionLoading({ pono: card.poNo, type: "modify" });

        try {
            const res = await fetch(`${API}/mapproval/modify/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invno, doc_kind: docKind }),
            });
            const data = await res.json();
            if (!res.ok) { addToast(data.error || "Modify Open failed", "error"); return; }
            delete detailCache.current[cacheKey];


            setCards(prev => prev.map(c =>
                (c.poNo === card.poNo || c.id === card.id)
                    ? { 
                        ...c, 
                        status: "Pending", 
                        approvedBy: null, 
                        approvedDateTime: null,
                        items: (c.items || []).map(item => ({ ...item, approved: false }))
                      }
                    : c
            ));

            setSelected(prev => (prev && (prev.poNo === card.poNo || prev.id === card.id))
                ? { 
                    ...prev, 
                    status: "Pending", 
                    approvedBy: null, 
                    approvedDateTime: null,
                    items: (prev.items || []).map(item => ({ ...item, approved: false }))
                  }
                : prev
            );

            const displayNo = card.poNo.includes("|") ? card.poNo.split("|")[2] : card.poNo;
            addToast(`${docLabel} ${displayNo} moved to Pending`, "success-modify");
            if (docKind === "customer_po") {
                await refreshBoard();
                setSelected(null);
            }
        } catch (e) {
            addToast("Network error — please try again", "error");
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast, refreshBoard, setSelected]);


    return (
        <div className="map-root">
            <div className="map-stats">
                {stats.map(s => (
                    <div className="map-stat" key={s.label}>
                        <div className="map-stat__label">{s.label}</div>
                        <div className="map-stat__value">{s.value}</div>
                        <div className="map-stat__change">{s.change}</div>
                    </div>
                ))}
            </div>

            <div className="map-filter">
                <DateRangePicker
                    from={dateRange.from}
                    to={dateRange.to}
                    onChange={r => { setDateRange(r); setTypeFilter(null); }}
                    theme="rose"
                    disabled={isLoading}
                />
                <div className="map-filter__search-wrap">
                    <svg className="map-filter__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="map-filter__search"
                        type="text"
                        placeholder="Search material documents…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={isLoading}
                    />
                    {search && !isLoading && (
                        <button
                            type="button"
                            className="map-filter__clear-btn"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>

                <div className="map-type-dd" ref={typeDropRef}>
                    <button
                        ref={typeTriggerRef}
                        type="button"
                        className={`map-type-dd__trigger ${typeFilter ? "map-type-dd__trigger--active" : ""} ${typeDropOpen ? "map-type-dd__trigger--open" : ""}`}
                        onClick={() => !isLoading && setTypeDropOpen(o => !o)}
                        disabled={isLoading}
                    >
                        <span className="map-type-dd__trigger-icon">
                            {typeFilter ? TYPE_ICONS[typeFilter] : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                                </svg>
                            )}
                        </span>
                        <span className="map-type-dd__trigger-label">{typeFilter || "All Types"}</span>
                        {typeFilter && (
                            <span className="map-type-dd__trigger-count">
                                {cards.filter(c => c.type === typeFilter).length}
                            </span>
                        )}
                        <svg className={`map-type-dd__caret ${typeDropOpen ? "map-type-dd__caret--up" : ""}`}
                            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6,9 12,15 18,9" />
                        </svg>
                    </button>

                    {typeDropOpen && createPortal(
                        <div className="map-type-dd__panel-portal" style={typePanelStyle}>
                            <div className="map-type-dd__panel">
                                <div className="map-type-dd__header">Filter by Type</div>
                                <button
                                    type="button"
                                    className={`map-type-dd__item ${typeFilter === null ? "map-type-dd__item--active" : ""}`}
                                    onClick={() => { setTypeFilter(null); setTypeDropOpen(false); }}
                                >
                                    <span className="map-type-dd__item-icon">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                                        </svg>
                                    </span>
                                    <span className="map-type-dd__item-label">All Types</span>
                                    <span className="map-type-dd__item-badge">{cards.length}</span>
                                    {typeFilter === null && (
                                        <svg className="map-type-dd__item-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    )}
                                </button>
                                <div className="map-type-dd__divider" />
                                {availableTypes.map(t => {
                                    const cnt = cards.filter(c => c.type === t).length;
                                    const isActive = typeFilter === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`map-type-dd__item ${isActive ? "map-type-dd__item--active" : ""}`}
                                            onClick={() => { setTypeFilter(isActive ? null : t); setTypeDropOpen(false); }}
                                        >
                                            <span className="map-type-dd__item-icon">{TYPE_ICONS[t]}</span>
                                            <span className="map-type-dd__item-label">{t}</span>
                                            <span className="map-type-dd__item-badge">{cnt}</span>
                                            {isActive && (
                                                <svg className="map-type-dd__item-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20,6 9,17 4,12" />
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

                <div className="map-filter__actions-wrap">
                    <button type="button" className="map-filter__btn" onClick={() => !isLoading && refreshBoard()} disabled={isLoading}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Search
                    </button>
                    <button type="button" className="map-filter__reset-btn" onClick={() => !isLoading && handleResetFilters()} disabled={isLoading}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                        </svg>
                        Reset
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="map-loader">
                    <div className="map-loader__bar">
                        <div className="map-loader__bar-track">
                            <div className="map-loader__bar-fill" />
                        </div>
                        <div className="map-loader__bar-label">
                            <span className="map-loader__spinner" />
                            Fetching documents…
                        </div>
                    </div>
                    <div className="map-skeleton-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="map-skeleton-card" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="map-sk map-sk--hd">
                                    <div className="map-sk map-sk--badge" />
                                    <div className="map-sk map-sk--status" />
                                </div>
                                <div className="map-sk map-sk--vendor" />
                                <div className="map-sk map-sk--line" />
                                <div className="map-sk map-sk--line map-sk--line-short" />
                                <div className="map-sk map-sk--amount" />
                                <div className="map-sk map-sk--actions">
                                    <div className="map-sk map-sk--btn" />
                                    <div className="map-sk map-sk--btn" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="map-groups">
                    {grouped.length === 0 ? (
                        <div className="map-empty">
                            <div className="map-empty__icon">📄</div>
                            <div className="map-empty__txt">No documents match your search</div>
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

            <DetailModal
                card={selected}
                isLoading={previewLoading}
                actionLoading={actionLoading}
                onClose={() => { setSelected(null); setPreviewLoading(false); }}
                onApprove={handleApprove}
                onModify={handleModify}
            />
            <Toast toasts={toasts} />
        </div>
    );
}
