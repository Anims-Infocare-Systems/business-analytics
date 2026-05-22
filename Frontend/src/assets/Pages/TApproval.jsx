/**
 * TApproval.jsx  —  T-Approval Dashboard (Invoices + DC approvals)
 * Prefix: tap-   |   Theme: Teal / Emerald
 * Data from Django /api/tapproval/* (Bill_Mas invoices + DC_Mas delivery challans)
 */
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import "./TApproval.css";
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
    { label: "Pending", value: "—", change: "" },
];

const TYPE_ORDER = [
    "Invoice - General",
    "Invoice - General Labour",
    "Invoice - Scrap",
    "Invoice - Debit Note",
    "DC - General",
    "DC - General Labour",
    "DC - Customer Rework",
    "Returnable DC - Material Issue",
];

const TYPE_ICONS = {
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
    "Invoice - Scrap": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1,4 1,10 7,10" />
            <polyline points="23,20 23,14 17,14" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
    ),
    "Invoice - Debit Note": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
    ),
    "DC - General": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    "DC - General Labour": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    "DC - Customer Rework": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1,4 1,10 7,10" />
            <polyline points="23,20 23,14 17,14" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
    ),
    "Returnable DC - Material Issue": (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
};

const BtnSpinner = () => (
    <svg className="tap-btn-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

function Toast({ toasts }) {
    return createPortal(
        <div className="tap-toast-stack">
            {toasts.map(t => (
                <div key={t.id} className={`tap-toast tap-toast--${t.type}`}>
                    <span className="tap-toast__msg">{t.msg}</span>
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
    if (k === "ret_dc") {
        return {
            docNoLabel: "Ret. Issue No",
            docDateLabel: "Issue Date",
            docTitle: "Returnable DC",
            approveLabel: "Approve Returnable DC",
        };
    }
    if (k === "dc") {
        return {
            docNoLabel: "DC No",
            docDateLabel: "DC Date",
            docTitle: "DC",
            approveLabel: "Approve DC",
        };
    }
    return {
        docNoLabel: "Invoice No",
        docDateLabel: "Invoice Date",
        docTitle: "Invoice",
        approveLabel: "Approve Invoice",
    };
}

function DetailModal({ card, isLoading, actionLoading, onClose, onApprove, onModify }) {
    if (!card && !isLoading) return null;

    if (isLoading) {
        return createPortal(
            <div className="tap-modal tap-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="tap-preview-box">
                    <div className="tap-prev__hd">
                        <div className="tap-prev__hd-left">
                            <div className="tap-prev__hd-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                </svg>
                            </div>
                            <div>
                                <div className="tap-prev__hd-title">Loading document…</div>
                                <div className="tap-prev__hd-sub">Fetching invoice / DC details</div>
                            </div>
                        </div>
                        <div className="tap-prev__hd-right">
                            <button type="button" className="tap-prev__close" onClick={onClose} aria-label="Close">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="tap-prev__body tap-prev-loading">
                        <div className="tap-pvl__center">
                            <div className="tap-pvl__arc-wrap">
                                <svg className="tap-pvl__arc" viewBox="0 0 64 64" fill="none">
                                    <circle cx="32" cy="32" r="26" stroke="rgba(13,148,136,.12)" strokeWidth="5" />
                                    <circle
                                        className="tap-pvl__arc-ring"
                                        cx="32"
                                        cy="32"
                                        r="26"
                                        stroke="url(#tap-pvl-grad)"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray="60 103"
                                    />
                                    <defs>
                                        <linearGradient id="tap-pvl-grad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#14b8a6" />
                                            <stop offset="100%" stopColor="#0ea5e9" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="tap-pvl__dots">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                            <p className="tap-pvl__label">Fetching document…</p>
                        </div>
                        <div className="tap-pvl__skel-rows">
                            {[100, 75, 90, 60, 85, 70].map((w, i) => (
                                <div key={i} className="tap-pvl__skel-row" style={{ animationDelay: `${i * 0.07}s` }}>
                                    <div className="tap-pvl__sk" style={{ width: `${w * 0.35}%` }} />
                                    <div className="tap-pvl__sk tap-pvl__sk--val" style={{ width: `${w * 0.2}%` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="tap-prev__footer">
                        <button type="button" className="tap-prev-btn tap-prev-btn--ghost" onClick={onClose}>
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
    const summaryRows = formatSummaryRows(fin, fmt);
    const docNo = card.poNo;
    const labels = docLabels(card);

    return createPortal(
        <div className="tap-modal tap-modal--preview" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="tap-preview-box">
                <div className="tap-prev__hd">
                    <div className="tap-prev__hd-left">
                        <div className="tap-prev__hd-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                        </div>
                        <div>
                            <div className="tap-prev__hd-title">T-Approval Detail Preview</div>
                            <div className="tap-prev__hd-sub">{labels.docTitle} — {docNo}</div>
                        </div>
                    </div>
                    <div className="tap-prev__hd-right">
                        <span className={`tap-prev__badge tap-prev__badge--${card.status.toLowerCase()}`}>
                            {card.status === "Approved" ? "Approved" : "Pending"}
                        </span>
                        <button type="button" className="tap-prev__close" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="tap-prev__meta">
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">{labels.docDateLabel}</span>
                        <span className="tap-prev__meta-val">{card.poDate}</span>
                    </div>
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">Customer</span>
                        <span className="tap-prev__meta-val tap-prev__meta-val--vendor">{card.vendor}</span>
                    </div>
                    <div className="tap-prev__meta-item">
                        <span className="tap-prev__meta-label">Type</span>
                        <span className="tap-prev__meta-val">{card.type}</span>
                    </div>
                </div>

                <div className="tap-prev__body">
                    <div className="tap-prev__section-label">Line Items</div>
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
                                {items.map((row, i) => (
                                    <tr key={i}>
                                        <td className="tap-prev__td--center">{row.sNo}</td>
                                        <td><span className="tap-prev__code">{row.codeNo}</span></td>
                                        <td className="tap-prev__td--desc">{row.description}</td>
                                        <td className="tap-prev__td--center">{row.uom}</td>
                                        <td className="tap-prev__td--num">{Number(row.qty || 0).toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num">{Number(row.qtyOthers || 0).toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num">{Number(row.rate || 0).toLocaleString("en-IN")}</td>
                                        <td className="tap-prev__td--num tap-prev__td--amt">{fmt(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="tap-prev__summary-wrap">
                        <div className="tap-prev__section-label">Financial Summary</div>
                        <div className="tap-prev__summary">
                            {summaryRows.map(r => (
                                <div
                                    key={r.label}
                                    className={`tap-prev__sum-row${r.sub ? " tap-prev__sum-row--sub" : ""}${r.grand ? " tap-prev__sum-row--grand" : ""}`}
                                >
                                    <span className="tap-prev__sum-label">{r.label}</span>
                                    <span className="tap-prev__sum-val">{r.grand ? r.val : r.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="tap-prev__footer">
                    <button type="button" className="tap-prev-btn tap-prev-btn--ghost" onClick={onClose}>Close</button>
                    {card.status === "Approved" ? (
                        <button
                            type="button"
                            className="tap-prev-btn tap-prev-btn--modify"
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
                            className="tap-prev-btn tap-prev-btn--approve"
                            disabled={!!actionLoading}
                            onClick={() => onApprove(card)}
                        >
                            {actionLoading?.pono === docNo && actionLoading?.type === "approve"
                                ? <><BtnSpinner /> Approving…</>
                                : labels.approveLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function TypeGroup({ type, cards, collapsed, onToggle, onPreview, onApprove, onModify, actionLoading, resolvedStatus }) {
    const pendingCount = cards.filter(c => resolvedStatus(c) === "Pending").length;
    const approvedCount = cards.filter(c => resolvedStatus(c) === "Approved").length;

    return (
        <div className="tap-group">
            <div className="tap-group__hd" onClick={onToggle}>
                <div className="tap-group__hd-left">
                    <span className="tap-group__hd-icon">{TYPE_ICONS[type] ?? TYPE_ICONS["Invoice - General"]}</span>
                    <span className="tap-group__hd-title">{type}</span>
                    <span className="tap-group__hd-count">{cards.length} document{cards.length !== 1 ? "s" : ""}</span>
                    {pendingCount > 0 && <span className="tap-group__pill tap-group__pill--pending">{pendingCount} Pending</span>}
                    {approvedCount > 0 && <span className="tap-group__pill tap-group__pill--approved">{approvedCount} Approved</span>}
                </div>
                <button type="button" className="tap-group__collapse-btn">
                    <span>{collapsed ? "Expand" : "Collapse"}</span>
                </button>
            </div>

            <div className={`tap-group__body${collapsed ? " tap-group__body--collapsed" : ""}`}>
                <div className="tap-grid tap-grid--group">
                    {cards.map((card, i) => {
                        const status = resolvedStatus(card);
                        const labels = docLabels(card);
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
                                        <span className="tap-info-label">{labels.docNoLabel}</span>
                                        <span className="tap-info-val">{card.poNo}</span>
                                    </div>
                                    <div className="tap-info-row">
                                        <span className="tap-info-label">{labels.docDateLabel}</span>
                                        <span className="tap-info-val">{card.poDate}</span>
                                    </div>
                                </div>
                                <div className="tap-card__count">
                                    <div className="tap-count-row">
                                        <span className="tap-count-label">Amount:</span>
                                        <span className="tap-count-val">₹ {Number(card.countVal).toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                                <div className="tap-card__actions">
                                    <button type="button" className="tap-action-btn"
                                        onClick={e => { e.stopPropagation(); onPreview({ ...card, status }); }}>
                                        Preview
                                    </button>
                                    {status === "Approved" ? (
                                        <button type="button" className="tap-action-btn tap-action-btn--modify"
                                            disabled={!!actionLoading}
                                            onClick={e => { e.stopPropagation(); onModify(card); }}>
                                            {actionLoading?.pono === card.poNo && actionLoading?.type === "modify"
                                                ? <><BtnSpinner /> Modifying…</>
                                                : "Modify Open"}
                                        </button>
                                    ) : (
                                        <button type="button" className="tap-action-btn tap-action-btn--primary"
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

export default function TApproval() {
    const [search, setSearch] = useState("");
    const [cards, setCards] = useState([]);
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [selected, setSelected] = useState(null);
    const [approved, setApproved] = useState([]);
    const today = new Date();
    const [dateRange, setDateRange] = useState({ from: today, to: today });
    const [collapsedGroups, setCollapsedGroups] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // { pono, type } — same shape as E-Approval
    const [toasts, setToasts] = useState([]);
    // Detail cache — key: list card id (docKind:docNo); cleared on date change / approve / modify
    const detailCache = useRef({});

    const addToast = useCallback((msg, type = "success-approve") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
    }, []);

    const toggleGroup = type =>
        setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));

    const resolvedStatus = card => (approved.includes(card.id) ? "Approved" : card.status);

    const refreshBoard = useCallback(async () => {
        const from = toYMD(dateRange.from);
        const to = toYMD(dateRange.to || dateRange.from);
        if (!from) return;
        detailCache.current = {};
        setIsLoading(true);
        try {
            const qsList = new URLSearchParams({ from, to, page: "1", page_size: "2000" });
            const qsStats = new URLSearchParams({ from, to });
            const [resList, resStats] = await Promise.all([
                fetch(`${API}/tapproval/list/?${qsList}`, { credentials: "include" }),
                fetch(`${API}/tapproval/stats/?${qsStats}`, { credentials: "include" }),
            ]);
            const dataList = await resList.json();
            const dataStats = await resStats.json();
            if (resList.ok) setCards(dataList.cards || []);
            else { console.error(dataList.error); setCards([]); }
            if (resStats.ok && dataStats.success && Array.isArray(dataStats.stats))
                setStats(dataStats.stats);
            else setStats(DEFAULT_STATS);
        } catch (e) {
            console.error(e);
            setCards([]);
            setStats(DEFAULT_STATS);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange.from, dateRange.to]);

    useEffect(() => { refreshBoard(); }, [refreshBoard]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return cards;
        return cards.filter(c =>
            (c.vendor || "").toLowerCase().includes(q) ||
            (c.poNo || "").toLowerCase().includes(q) ||
            (c.type || "").toLowerCase().includes(q)
        );
    }, [cards, search]);

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

    const openPreview = useCallback(async (listCard) => {
        const invno = listCard.poNo;
        const docKind = (listCard.docKind || "invoice").toLowerCase();
        const cacheKey = listCard.id || `${docKind}:${invno}`;
        if (detailCache.current[cacheKey]) {
            const cached = { ...detailCache.current[cacheKey] };
            cached.status = approved.includes(listCard.id) ? "Approved" : cached.status;
            setSelected(cached);
            return;
        }
        const qs = new URLSearchParams({
            invno,
            doc_kind: docKind,
            from: toYMD(dateRange.from),
            to: toYMD(dateRange.to || dateRange.from),
        });
        setPreviewLoading(true);
        setSelected({ ...listCard, items: [], financial: null, _loading: true });
        try {
            const res = await fetch(`${API}/tapproval/detail/?${qs}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok && data.success && data.card) {
                const merged = { ...data.card, id: listCard.id };
                merged.status = approved.includes(listCard.id) ? "Approved" : merged.status;
                detailCache.current[cacheKey] = merged;
                setSelected(merged);
            } else {
                console.error(data.error || res.statusText);
                setSelected({ ...listCard, items: listCard.items || [], financial: null });
            }
        } catch (e) {
            console.error(e);
            setSelected({ ...listCard, items: listCard.items || [] });
        } finally {
            setPreviewLoading(false);
        }
    }, [dateRange.from, dateRange.to, approved]);

    const handleApprove = useCallback(async (card) => {
        const invno = card.poNo;
        const docKind = (card.docKind || "invoice").toLowerCase();
        const cacheKey = card.id || `${docKind}:${invno}`;
        const docLabel = docKind === "dc" ? "DC" : docKind === "ret_dc" ? "Returnable DC" : "Invoice";
        if (!invno || actionLoading) return;
        setActionLoading({ pono: card.poNo, type: "approve" });
        try {
            const res = await fetch(`${API}/tapproval/approve/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invno, doc_kind: docKind }),
            });
            const data = await res.json();
            if (!res.ok) { addToast(data.error || "Approve failed", "error"); return; }
            delete detailCache.current[cacheKey];
            setApproved(prev => (prev.includes(card.id) ? prev : [...prev, card.id]));
            setCards(prev => prev.map(c =>
                (c.poNo === invno || c.id === card.id) ? { ...c, status: "Approved" } : c
            ));
            setSelected(null);
            addToast(`${docLabel} ${invno} approved`, "success-approve");
        } catch (e) {
            addToast("Network error — please try again", "error");
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast]);

    const handleModify = useCallback(async (card) => {
        const invno = card.poNo;
        const docKind = (card.docKind || "invoice").toLowerCase();
        const cacheKey = card.id || `${docKind}:${invno}`;
        const docLabel = docKind === "dc" ? "DC" : docKind === "ret_dc" ? "Returnable DC" : "Invoice";
        if (!invno || actionLoading) return;
        setActionLoading({ pono: card.poNo, type: "modify" });
        try {
            const res = await fetch(`${API}/tapproval/modify/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invno, doc_kind: docKind }),
            });
            const data = await res.json();
            if (!res.ok) { addToast(data.error || "Modify failed", "error"); return; }
            delete detailCache.current[cacheKey];
            setApproved(prev => prev.filter(id => id !== card.id));
            setCards(prev => prev.map(c =>
                (c.poNo === invno || c.id === card.id) ? { ...c, status: "Pending" } : c
            ));
            setSelected(null);
            addToast(`${docLabel} ${invno} moved to Pending`, "success-modify");
        } catch (e) {
            addToast("Network error — please try again", "error");
        } finally {
            setActionLoading(null);
        }
    }, [actionLoading, addToast]);

    return (
        <div className="tap-root">
            <div className="tap-stats">
                {stats.map(s => (
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
                    placeholder="Search invoices & DCs…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button type="button" className="tap-filter__btn" onClick={() => refreshBoard()}>🔍 Search</button>
            </div>

            {isLoading ? (
                <div className="tap-loader">
                    <div className="tap-loader__bar">
                        <div className="tap-loader__bar-track">
                            <div className="tap-loader__bar-fill" />
                        </div>
                        <div className="tap-loader__bar-label">
                            <span className="tap-loader__spinner" />
                            Fetching documents…
                        </div>
                    </div>
                    <div className="tap-skeleton-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="tap-skeleton-card" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="tap-sk tap-sk--hd">
                                    <div className="tap-sk tap-sk--badge" />
                                    <div className="tap-sk tap-sk--status" />
                                </div>
                                <div className="tap-sk tap-sk--vendor" />
                                <div className="tap-sk tap-sk--line" />
                                <div className="tap-sk tap-sk--line tap-sk--line-short" />
                                <div className="tap-sk tap-sk--amount" />
                                <div className="tap-sk tap-sk--actions">
                                    <div className="tap-sk tap-sk--btn" />
                                    <div className="tap-sk tap-sk--btn" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="tap-groups">
                    {grouped.length === 0 ? (
                        <div className="tap-empty">
                            <div className="tap-empty__icon">📄</div>
                            <div className="tap-empty__txt">No documents match your search</div>
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
