/**
 * EfficiencyReport.jsx  —  MIS › Efficiency Report
 * Theme: Anims ERP — matches DashboardLayout blue palette
 * Prefix: er-
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { User, Settings, Search, ChevronDown, BarChart2, X, Trophy, AlertTriangle, Filter, Inbox } from "lucide-react";
import { resolveApiBase } from "../../apiBase";
import "./EfficiencyReport.css";
import EfficiencyReportDatePicker from "./EfficiencyReportDatePicker";

const API_BASE = resolveApiBase();

function toIsoDate(d) {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/* ═══════════════════════════════════════════════════════
   COLUMN DEFINITIONS
═══════════════════════════════════════════════════════ */
const COLS_OPERATOR = [
    { key: "rank", label: "RANK", idx: 8, num: false, cls: "er-rank-col" },
    { key: "op", label: "OPERATOR", idx: 0, num: false },
    { key: "dept", label: "DEPARTMENT", idx: 1, num: false },
    { key: "mac", label: "MAC NO", idx: 2, num: false },
    { key: "oaeff", label: "OA EFF %", idx: 3, num: true },
    { key: "opreff", label: "OPR EFF%", idx: 4, num: true },
    { key: "qfeff", label: "QF EFF%", idx: 5, num: true },
    { key: "idle", label: "IDLE TIME", idx: 6, num: true },
    { key: "rej", label: "REJ %", idx: 7, num: true },
];
const COLS_MACHINE = [
    { key: "rank", label: "RANK", idx: 8, num: false, cls: "er-rank-col" },
    { key: "dept", label: "DEPARTMENT", idx: 1, num: false },
    { key: "mac", label: "MAC NO", idx: 2, num: false },
    { key: "oaeff", label: "OA EFF %", idx: 3, num: true },
    { key: "opreff", label: "OPR EFF%", idx: 4, num: true },
    { key: "qfeff", label: "QF EFF%", idx: 5, num: true },
    { key: "idle", label: "IDLE TIME", idx: 6, num: true },
    { key: "rej", label: "REJ %", idx: 7, num: true },
];

const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════ */
function effColor(v) {
    if (v >= 90) return "#059669";
    if (v >= 75) return "#2d6de8";
    if (v >= 50) return "#d97706";
    return "#dc2626";
}

function EffCell({ v }) {
    const c = effColor(v);
    const w = Math.max(0, Math.min(100, v));
    return (
        <div className="er-eff-cell">
            <div className="er-eff-bar-wrap">
                <div className="er-eff-bar" style={{ width: `${w}%`, background: c }} />
            </div>
            <span className="er-eff-val" style={{ color: c }}>{v.toFixed(2)}</span>
        </div>
    );
}

function RankBadge({ r }) {
    const cls =
        r === 1 ? "er-rank--gold" :
            r === 2 ? "er-rank--silver" :
                r === 3 ? "er-rank--bronze" : "er-rank--normal";
    const pfx = r === 1 ? "🥇 " : r === 2 ? "🥈 " : r === 3 ? "🥉 " : "";
    return <span className={`er-rank-badge ${cls}`}>{pfx}{r}</span>;
}

function IdlePill({ v }) {
    const cls = v === 0 ? "er-pill--ok" : v <= 1.5 ? "er-pill--warn" : "er-pill--high";
    return <span className={`er-pill ${cls}`}>{v.toFixed(2)}h</span>;
}

function RejPill({ v }) {
    const cls = v === 0 ? "er-pill--ok" : v <= 3 ? "er-pill--warn" : "er-pill--high";
    return <span className={`er-pill ${cls}`}>{v.toFixed(2)}%</span>;
}

function ErEmptyState({ message = "No Data found on this period", subtitle = "Please check other date ranges or filter conditions." }) {
    return (
        <div className="er-empty-state-card">
            <div className="er-esc-glow" />
            <div className="er-esc-content">
                <div className="er-esc-icon-wrap">
                    <Inbox size={24} className="er-esc-icon" />
                    <div className="er-esc-icon-ring" />
                </div>
                <h3 className="er-esc-title">{message}</h3>
                <p className="er-esc-sub">{subtitle}</p>
            </div>
        </div>
    );
}
/* ═══════════════════════════════════════════════════════
   MULTI SELECT COMPONENT
═══════════════════════════════════════════════════════ */
function MultiSelectDropdown({ options, selectedValues, onChange, placeholder, isOp }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchVal.toLowerCase())
    );

    const toggleOption = (opt) => {
        if (selectedValues.includes(opt)) {
            onChange(selectedValues.filter(v => v !== opt));
        } else {
            onChange([...selectedValues, opt]);
        }
    };

    const toggleAll = () => {
        if (selectedValues.length === options.length) {
            onChange([]);
        } else {
            onChange(options);
        }
    };

    const displayText = selectedValues.length === 0
        ? placeholder
        : selectedValues.length === options.length
            ? `All ${isOp ? 'Operators' : 'Machines'}`
            : `${selectedValues.length} Selected`;

    return (
        <div className="er-ms-container" ref={containerRef}>
            <button
                type="button"
                className={`er-ms-trigger ${isOp ? 'er-ms-trigger--op' : 'er-ms-trigger--mac'} ${isOpen ? 'er-ms-trigger--open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="er-ms-trigger-text">{displayText}</span>
                <ChevronDown className="er-ms-arrow" size={11} />
            </button>

            {isOpen && (
                <div className="er-ms-dropdown">
                    <div className="er-ms-search-wrap">
                        <Search className="er-ms-search-icon" size={11} />
                        <input
                            type="text"
                            className="er-ms-search-input"
                            placeholder="Search..."
                            value={searchVal}
                            onChange={e => setSearchVal(e.target.value)}
                        />
                        {searchVal && (
                            <button
                                type="button"
                                className="er-ms-clear-btn"
                                onClick={() => setSearchVal("")}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                    <div className="er-ms-options-list">
                        <label className="er-ms-option er-ms-option--all">
                            <input
                                type="checkbox"
                                checked={selectedValues.length === options.length && options.length > 0}
                                onChange={toggleAll}
                            />
                            <span className="er-ms-option-text">Select All</span>
                        </label>
                        {filteredOptions.map(opt => {
                            const isChecked = selectedValues.includes(opt);
                            return (
                                <label key={opt} className={`er-ms-option ${isChecked ? 'er-ms-option--checked' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleOption(opt)}
                                    />
                                    <span className="er-ms-option-text">{opt}</span>
                                </label>
                            );
                        })}
                        {filteredOptions.length === 0 && (
                            <div className="er-ms-empty">No match found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SKELETON LOADERS (LAZY LOADING EFFECT)
═══════════════════════════════════════════════════════ */
function ChartSkeleton() {
    return (
        <div className="er-skeleton-chart-card">
            <div className="er-skeleton-line er-skeleton-header er-skeleton-shimmer" />
            <div className="er-skeleton-svg-wrap">
                {[85, 70, 75, 60, 50, 65].map((w, i) => (
                    <div key={i} className="er-skeleton-chart-bar er-skeleton-shimmer" style={{ width: `${w}%` }} />
                ))}
            </div>
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="er-skeleton-table">
            <div className="er-skeleton-table-header" />
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="er-skeleton-table-row">
                    <div className="er-skeleton-cell cell-sm er-skeleton-shimmer" />
                    <div className="er-skeleton-cell cell-lg er-skeleton-shimmer" />
                    <div className="er-skeleton-cell er-skeleton-shimmer" />
                    <div className="er-skeleton-cell er-skeleton-shimmer" />
                    <div className="er-skeleton-cell er-skeleton-shimmer" />
                </div>
            ))}
        </div>
    );
}

function PerformerSkeleton() {
    return (
        <div className="er-perf-card">
            <div className="er-skeleton-line er-skeleton-header er-skeleton-shimmer" style={{ width: '130px', height: '14px' }} />
            <div className="er-perf-list">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="er-perf-row er-skeleton-shimmer" style={{ height: '36px', border: 'none', background: '#f8fafc', opacity: 0.6 }} />
                ))}
            </div>
        </div>
    );
}

function OprHeaderFilter({ operator, setOperator, val, setVal, setPage }) {
    const [isOpen, setIsOpen] = useState(false);
    const [tempOp, setTempOp] = useState(operator);
    const [tempVal, setTempVal] = useState(val);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleApply = (e) => {
        e.stopPropagation();
        setOperator(tempOp);
        setVal(tempVal);
        setPage(1);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setTempOp(">");
        setTempVal("");
        setOperator(">");
        setVal("");
        setPage(1);
        setIsOpen(false);
    };

    const isActive = val !== "";

    return (
        <span className="er-col-filter-wrap" ref={containerRef} onClick={e => e.stopPropagation()}>
            <button
                type="button"
                className={`er-col-filter-btn ${isActive ? 'er-col-filter-btn--active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Filter Operator Eff %"
            >
                <Filter size={10} />
            </button>

            {isOpen && (
                <div className="er-col-filter-popover">
                    <div className="er-cf-title">Filter Operator Eff %</div>
                    <div className="er-cf-row">
                        <select
                            className="er-cf-select"
                            value={tempOp}
                            onChange={e => setTempOp(e.target.value)}
                        >
                            <option value=">">&gt; Greater</option>
                            <option value="<">&lt; Less</option>
                            <option value="=">= Equal</option>
                        </select>
                        <input
                            type="number"
                            className="er-cf-input"
                            placeholder="Val %"
                            min="0"
                            max="100"
                            value={tempVal}
                            onChange={e => setTempVal(e.target.value)}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <div className="er-cf-actions">
                        <button type="button" className="er-cf-btn er-cf-btn--clear" onClick={handleClear}>
                            Clear
                        </button>
                        <button type="button" className="er-cf-btn er-cf-btn--apply" onClick={handleApply}>
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </span>
    );
}

/* ═══════════════════════════════════════════════════════
   CHART COMPONENT
═══════════════════════════════════════════════════════ */

/**
 * EffLineChart — Premium SVG line chart
 * 3 series: OA Eff% · OPR Eff% · QF Eff%
 * Features: bezier curves, area fill, animated reveal,
 *           staggered dots, column hover, dark tooltip
 */
function EffLineChart({ data, labelKey, title, badge, animKey, filterValue, onFilterChange, filterOptions = [], filterPlaceholder = "" }) {
    const [animated, setAnimated] = useState(false);
    const [hoverIdx, setHoverIdx] = useState(null);

    useEffect(() => {
        setAnimated(false);
        setHoverIdx(null);
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
        return () => cancelAnimationFrame(id);
    }, [animKey]);

    const items = data.slice(0, 12);
    if (!items.length) {
        return <ErEmptyState message="No data available for charts" subtitle="Adjust filters or check other date ranges." />;
    }

    /* ── Canvas dimensions ── */
    const W = 540, H = 230;
    const PAD = { top: 18, right: 24, bottom: 46, left: 44 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    /* ── Scales ── */
    const n = items.length;
    const xStep = n > 1 ? cW / (n - 1) : cW;
    const toX = i => PAD.left + (n > 1 ? i * xStep : cW / 2);
    const toY = v => PAD.top + cH - (Math.max(0, Math.min(100, v)) / 100) * cH;

    /* ── Series ── */
    const SERIES = [
        { idx: 3, color: '#2d6de8', fill: '#2d6de8', label: 'OA Eff%'  },
        { idx: 4, color: '#059669', fill: '#059669', label: 'OPR Eff%' },
        { idx: 5, color: '#f59e0b', fill: '#f59e0b', label: 'QF Eff%'  },
    ];

    /* ── Smooth bezier path builder ── */
    function smoothPath(sIdx) {
        if (n === 1) return `M ${toX(0)} ${toY(items[0][sIdx] || 0)}`;
        const pts = items.map((d, i) => [toX(i), toY(d[sIdx] || 0)]);
        let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const cp1x = (pts[i][0] + pts[i + 1][0]) / 2;
            const cp1y = pts[i][1];
            const cp2x = cp1x;
            const cp2y = pts[i + 1][1];
            d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
        }
        return d;
    }

    /* ── Area path (bezier + close) ── */
    function areaPath(sIdx) {
        const linePart = smoothPath(sIdx);
        return `${linePart} L ${toX(n - 1).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`;
    }

    const yTicks = [0, 25, 50, 75, 100];
    const isOp = badge.includes('op');
    const accentColor = isOp ? '#2d6de8' : '#059669';
    const uniqueId = isOp ? 'op' : 'mac';

    /* ── Tooltip content ── */
    const tipItem = hoverIdx !== null ? items[hoverIdx] : null;
    const tipX = hoverIdx !== null ? toX(hoverIdx) : 0;
    const tipW = 118, tipH = 82, tipPad = 10;
    const tipY = PAD.top + 2;
    const tipLeft = tipX + 12 + tipW > W - 4 ? tipX - tipW - 12 : tipX + 12;

    return (
        <div className="er-lc-root">
            {/* ── Card Header ── */}
            <div className="er-lc-header">
                <div className="er-lc-header-left">
                    <span className={`er-lc-badge ${isOp ? 'er-lc-badge--op' : 'er-lc-badge--mac'}`}>
                        {isOp ? <User size={13} style={{ color: "var(--er-primary)" }} /> : <Settings size={13} style={{ color: "var(--er-green)" }} />}
                    </span>
                    <span className="er-lc-title">{title}</span>
                    {onFilterChange && (
                        <MultiSelectDropdown
                            options={filterOptions}
                            selectedValues={filterValue || []}
                            onChange={onFilterChange}
                            placeholder={filterPlaceholder}
                            isOp={isOp}
                        />
                    )}
                </div>
                <div className="er-lc-legend">
                    {SERIES.map(s => (
                        <span key={s.label} className="er-lc-leg-item">
                            <span className="er-lc-leg-line" style={{ background: s.color }} />
                            <span className="er-lc-leg-label">{s.label}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Chart ── */}
            <div className="er-chart-scroll">
                <svg
                    width="100%"
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ display: 'block', minWidth: 300 }}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    <defs>
                        {/* Vertical gradient fills */}
                        {SERIES.map((s, si) => (
                            <linearGradient key={si} id={`${uniqueId}-ag-${si}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={s.fill} stopOpacity="0.22" />
                                <stop offset="100%" stopColor={s.fill} stopOpacity="0.0"  />
                            </linearGradient>
                        ))}
                        {/* Animated clip-path reveal */}
                        <clipPath id={`${uniqueId}-clip`}>
                            <rect
                                x={PAD.left - 1} y={0}
                                width={animated ? cW + 2 : 0}
                                height={H}
                                style={{ transition: 'width 1.05s cubic-bezier(0.4,0,0.2,1)' }}
                            />
                        </clipPath>
                        {/* Column hover highlight gradient */}
                        <linearGradient id={`${uniqueId}-col-hl`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={accentColor} stopOpacity="0.10" />
                            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {/* ── Y gridlines & labels ── */}
                    {yTicks.map(v => (
                        <g key={v}>
                            <line
                                x1={PAD.left} y1={toY(v)}
                                x2={PAD.left + cW} y2={toY(v)}
                                stroke={v === 0 ? '#c0cef0' : '#e8edf8'}
                                strokeWidth={v === 0 ? 1.4 : 0.75}
                                strokeDasharray={v === 0 ? '' : '5 4'}
                            />
                            <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end" className="er-lc-y-tick">
                                {v}%
                            </text>
                        </g>
                    ))}

                    {/* ── Column hover highlight ── */}
                    {hoverIdx !== null && (
                        <rect
                            x={toX(hoverIdx) - xStep / 2}
                            y={PAD.top}
                            width={xStep}
                            height={cH}
                            fill={`url(#${uniqueId}-col-hl)`}
                            rx={4}
                        />
                    )}

                    {/* ── Area fills (behind lines) ── */}
                    <g clipPath={`url(#${uniqueId}-clip)`}>
                        {SERIES.map((s, si) => (
                            <path
                                key={si}
                                d={areaPath(s.idx)}
                                fill={`url(#${uniqueId}-ag-${si})`}
                            />
                        ))}
                    </g>

                    {/* ── Smooth bezier lines ── */}
                    <g clipPath={`url(#${uniqueId}-clip)`}>
                        {SERIES.map((s, si) => (
                            <path
                                key={si}
                                d={smoothPath(s.idx)}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={2.4}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        ))}
                    </g>

                    {/* ── Hover column targets ── */}
                    {items.map((d, i) => (
                        <rect
                            key={i}
                            x={toX(i) - xStep / 2}
                            y={PAD.top}
                            width={xStep}
                            height={cH}
                            fill="transparent"
                            style={{ cursor: 'crosshair' }}
                            onMouseEnter={() => setHoverIdx(i)}
                        />
                    ))}

                    {/* ── Data dots (staggered appear) ── */}
                    {animated && items.map((d, i) =>
                        SERIES.map((s, si) => {
                            const isHov = hoverIdx === i;
                            return (
                                <circle
                                    key={`${i}-${si}`}
                                    cx={toX(i)}
                                    cy={toY(d[s.idx] || 0)}
                                    r={isHov ? 5.5 : 3.5}
                                    fill={s.color}
                                    stroke="#fff"
                                    strokeWidth={isHov ? 2 : 1.6}
                                    style={{
                                        transition: `r 0.15s ease, stroke-width 0.15s ease, opacity 0.5s ${(i * 3 + si) * 40}ms`,
                                        opacity: 1,
                                        filter: isHov ? `drop-shadow(0 0 4px ${s.color}88)` : 'none',
                                    }}
                                />
                            );
                        })
                    )}

                    {/* ── Tooltip ── */}
                    {tipItem && (
                        <g>
                            {/* Vertical line */}
                            <line
                                x1={tipX} y1={PAD.top}
                                x2={tipX} y2={PAD.top + cH}
                                stroke={accentColor}
                                strokeWidth={1.2}
                                strokeDasharray="4 3"
                                opacity={0.6}
                            />
                            {/* Popup box */}
                            <rect
                                x={tipLeft} y={tipY}
                                width={tipW} height={tipH}
                                rx={7}
                                fill="#1a2a5e"
                                opacity={0.95}
                                filter="url(#tip-shadow)"
                            />
                            {/* Header label */}
                            <text x={tipLeft + tipPad} y={tipY + 15} className="er-lc-tip-name">
                                {String(tipItem[labelKey] || '—').slice(0, 14)}
                            </text>
                            {/* Divider */}
                            <line
                                x1={tipLeft + tipPad} y1={tipY + 20}
                                x2={tipLeft + tipW - tipPad} y2={tipY + 20}
                                stroke="rgba(255,255,255,0.12)" strokeWidth={0.8}
                            />
                            {/* Values */}
                            {SERIES.map((s, vi) => (
                                <g key={vi}>
                                    <circle
                                        cx={tipLeft + tipPad + 4}
                                        cy={tipY + 30 + vi * 17}
                                        r={3.5} fill={s.color}
                                    />
                                    <text
                                        x={tipLeft + tipPad + 13}
                                        y={tipY + 34 + vi * 17}
                                        className="er-lc-tip-row"
                                    >
                                        <tspan fill="rgba(255,255,255,0.6)">{s.label}: </tspan>
                                        <tspan fill={s.color} fontWeight="700">
                                            {(tipItem[s.idx] || 0).toFixed(1)}%
                                        </tspan>
                                    </text>
                                </g>
                            ))}
                        </g>
                    )}

                    {/* ── X-axis labels ── */}
                    {items.map((d, i) => {
                        const raw = String(d[labelKey] || '');
                        const lbl = raw.length > 10 ? raw.slice(0, 9) + '…' : raw;
                        const isH = hoverIdx === i;
                        return (
                            <text
                                key={i}
                                x={toX(i)}
                                y={PAD.top + cH + 15}
                                textAnchor="middle"
                                className="er-lc-x-tick"
                                style={{
                                    fontSize: n > 9 ? '7px' : '8px',
                                    fill: isH ? accentColor : '#6b7fa8',
                                    fontWeight: isH ? '700' : '500',
                                    transition: 'fill 0.15s, font-weight 0.15s',
                                }}
                            >{lbl}</text>
                        );
                    })}

                    {/* ── Left axis line ── */}
                    <line
                        x1={PAD.left} y1={PAD.top}
                        x2={PAD.left} y2={PAD.top + cH}
                        stroke="#d0daf5" strokeWidth={1.2}
                    />
                </svg>
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
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

export default function EfficiencyReport() {
    /* ── Filter state ── */
    const _dflt = { from: new Date(2026, 1, 1), to: new Date(2026, 1, 27) };
    const _saved = readFilterSession("ba_filter_efficiency", _dflt);
    const [dateRange, setDateRange] = useState({ from: _saved.from, to: _saved.to });
    const [loading, setLoading] = useState(false);
    const fromDate = dateRange.from ? dateRange.from.toISOString().slice(0, 10) : "";
    const toDate   = dateRange.to   ? dateRange.to.toISOString().slice(0, 10)   : "";
    const [chkCNC, setChkCNC] = useState(true);
    const [chkConv, setChkConv] = useState(true);
    const [effType, setEffType] = useState("operator");
    const [teamName, setTeamName] = useState("");
    const [deptName, setDeptName] = useState("");
    const [opFilter, setOpFilter] = useState([]);
    const [macFilter, setMacFilter] = useState([]);
    const [reportType, setReportType] = useState("rank");
    const [search, setSearch] = useState("");
    const [oprFilterOp, setOprFilterOp] = useState(">");
    const [oprFilterVal, setOprFilterVal] = useState("");

    /* ── Tab / sort / page ── */
    const [tab, setTab] = useState("operator");
    const [sortCol, setSortCol] = useState(8);
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(1);
    const [tableData, setTableData] = useState([]);
    const [isOprFilterOpen, setIsOprFilterOpen] = useState(false);
    const oprFilterRef = useRef(null);

    /* ── Load operator / machine table from API ── */
    useEffect(() => {
        if (!dateRange.from || !dateRange.to) return;
        // ✅ Persist date range to sessionStorage on every change
        writeFilterSession("ba_filter_efficiency", { from: dateRange.from, to: dateRange.to });
        const params = new URLSearchParams({
            from: toIsoDate(dateRange.from),
            to: toIsoDate(dateRange.to),
            cnc: chkCNC ? "1" : "0",
            conv: chkConv ? "1" : "0",
            tab,
        });
        setLoading(true);
        fetch(`${API_BASE}/efficiency-report/?${params}`, { credentials: "include" })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data?.error || "efficiency-report failed");
                return data;
            })
            .then(data => {
                setTableData(Array.isArray(data?.rows) ? data.rows : []);
                setPage(1);
                setLoading(false);
            })
            .catch(() => {
                setTableData([]);
                setLoading(false);
            });
    }, [dateRange.from, dateRange.to, chkCNC, chkConv, tab]);

    /* ── Live clock ── */
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        function handleOprClickOutside(e) {
            if (oprFilterRef.current && !oprFilterRef.current.contains(e.target)) {
                setIsOprFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOprClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleOprClickOutside);
        };
    }, []);
    const timeStr = time.toLocaleTimeString("en-IN", { hour12: false });
    const dateStr = time.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    }).replace(/ /g, "-");

    /* ── Unique operators & machines from base tableData ── */
    const uniqueOperators = useMemo(() => {
        const ops = tableData.map(r => r[0]).filter(Boolean);
        return Array.from(new Set(ops)).sort();
    }, [tableData]);

    const uniqueMachines = useMemo(() => {
        const macs = tableData.map(r => r[2]).filter(Boolean);
        return Array.from(new Set(macs)).sort();
    }, [tableData]);



    /* ── Filtered + sorted data ── */
    const filtered = useMemo(() => {
        let d = tableData.filter(r => {
            if (opFilter && opFilter.length > 0 && !opFilter.includes(r[0])) return false;
            if (macFilter && macFilter.length > 0 && !macFilter.includes(r[2])) return false;
            if (deptName && !(r[1] || "").toLowerCase().includes(deptName.toLowerCase())) return false;
            
            if (oprFilterVal !== "") {
                const val = parseFloat(oprFilterVal);
                const oprVal = r[4] || 0;
                if (oprFilterOp === ">" && !(oprVal > val)) return false;
                if (oprFilterOp === "<" && !(oprVal < val)) return false;
                if (oprFilterOp === "=" && !(Math.abs(oprVal - val) < 0.01)) return false;
            }

            if (search) {
                const hay = (r[0] + r[1] + r[2]).toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            return true;
        });

        if (reportType === "rank") d.sort((a, b) => a[8] - b[8]);
        else if (reportType === "operator") d.sort((a, b) => a[0].localeCompare(b[0]));
        else if (reportType === "dept") d.sort((a, b) => (a[1] || "").localeCompare(b[1] || ""));
        else if (reportType === "mac") d.sort((a, b) => a[2].localeCompare(b[2]));
        else if (reportType === "oee_desc") d.sort((a, b) => b[3] - a[3]);
        else if (reportType === "oee_asc") d.sort((a, b) => a[3] - b[3]);

        d = [...d].sort((a, b) => {
            const va = a[sortCol], vb = b[sortCol];
            if (typeof va === "number") return (va - vb) * sortDir;
            return (va || "").localeCompare(vb || "") * sortDir;
        });

        return d;
    }, [tableData, opFilter, macFilter, deptName, search, reportType, sortCol, sortDir, oprFilterOp, oprFilterVal]);

    /* ── Top & Bottom performers logic (based on Active Tab sorting) ── */
    const topPerformers = useMemo(() => {
        const valid = filtered.filter(r => r[tab === "operator" ? 0 : 2]);
        return [...valid].sort((a, b) => (b[3] || 0) - (a[3] || 0)).slice(0, 5);
    }, [filtered, tab]);

    const bottomPerformers = useMemo(() => {
        const valid = filtered.filter(r => r[tab === "operator" ? 0 : 2]);
        return [...valid].sort((a, b) => (a[3] || 0) - (b[3] || 0)).slice(0, 5);
    }, [filtered, tab]);

    /* ── KPIs ── */
    const kpi = useMemo(() => {
        const n = filtered.length;
        if (!n) return { n: 0, oee: "—", opr: "—", idle: "—", rej: "—" };
        const avg = idx => filtered.reduce((s, r) => s + r[idx], 0) / n;
        return {
            n,
            oee: avg(3).toFixed(1) + "%",
            opr: avg(4).toFixed(1) + "%",
            idle: avg(6).toFixed(2) + "h",
            rej: avg(7).toFixed(2) + "%",
        };
    }, [filtered]);

    /* ── Pagination ── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safeP = Math.min(page, totalPages);
    const slice = filtered.slice((safeP - 1) * PAGE_SIZE, safeP * PAGE_SIZE);

    /* ── Column set ── */
    const cols = tab === "machine" ? COLS_MACHINE : COLS_OPERATOR;

    /* ── Handlers ── */
    function doSort(idx) {
        if (sortCol === idx) setSortDir(d => -d);
        else { setSortCol(idx); setSortDir(1); }
        setPage(1);
    }

    function handleTab(t) {
        setTab(t);
        if (t === "machine") setEffType("machine");
        else if (t === "operator") setEffType("operator");
        setPage(1);
    }

    function handleEffType(v) {
        setEffType(v);
        if (v === "machine" || v === "machine_month") setTab("machine");
        else if (v === "component") setTab("component");
        else setTab("operator");
        setPage(1);
    }

    function exportCSV() {
        const headers = ["OPERATOR", "DEPARTMENT", "MAC NO", "OA EFF%", "OPR EFF%", "QF EFF%", "IDLE TIME%", "REJ%", "RANK"];
        const rows = filtered.map(r => r.join(","));
        const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "efficiency_report.csv"; a.click();
        URL.revokeObjectURL(url);
    }

    function pageButtons() {
        const btns = [];
        let lo = Math.max(1, safeP - 3);
        let hi = Math.min(totalPages, lo + 6);
        if (hi - lo < 6) lo = Math.max(1, hi - 6);
        if (lo > 1) { btns.push(1); btns.push("…"); }
        for (let p = lo; p <= hi; p++) btns.push(p);
        if (hi < totalPages) { btns.push("…"); btns.push(totalPages); }
        return btns;
    }

    /* ── Cell renderer ── */
    function renderCell(row, col) {
        const v = row[col.idx];
        switch (col.key) {
            case "rank": return <td key={col.key} className="er-td-rank"><RankBadge r={v} /></td>;
            case "op": return <td key={col.key} className="er-td-op">{v || "—"}</td>;
            case "dept": return <td key={col.key}>{v ? <span className="er-td-dept">{v}</span> : "—"}</td>;
            case "mac": return <td key={col.key}>{v ? <span className="er-td-mac">{v}</span> : "—"}</td>;
            case "oaeff":
            case "opreff":
            case "qfeff": return <td key={col.key} className="er-td-num"><EffCell v={v} /></td>;
            case "idle": return <td key={col.key} className="er-td-num"><IdlePill v={v} /></td>;
            case "rej": return <td key={col.key} className="er-td-num"><RejPill v={v} /></td>;
            default: return <td key={col.key} className="er-td-num">{v}</td>;
        }
    }

    /* ═══════════ RENDER ═══════════ */
    return (
        <div className="er-root">

            {/* ══ FILTER PANEL ══ */}
            <div className="er-filter-panel">

                {/* Row 1 — dates, machine type, efficiency type, clock */}
                <div className="er-filter-row">
                    <div className="er-fgroup er-fgroup--daterange">
                        <span className="er-flabel">Date Range</span>
                        <EfficiencyReportDatePicker
                            from={dateRange.from}
                            to={dateRange.to}
                            onChange={setDateRange}
                        />
                    </div>

                    <div className="er-fcheck-group">
                        <label className={`er-fcheck-item ${chkCNC ? "er-fcheck-item--active" : ""}`}>
                            <input type="checkbox" checked={chkCNC}
                                onChange={e => setChkCNC(e.target.checked)} />
                            <span>CNC</span>
                        </label>
                        <label className={`er-fcheck-item ${chkConv ? "er-fcheck-item--active" : ""}`}>
                            <input type="checkbox" checked={chkConv}
                                onChange={e => setChkConv(e.target.checked)} />
                            <span>CONVENTIONAL</span>
                        </label>
                    </div>

                    <div className="er-filter-sep" />

                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Efficiency Type</span>
                        <select className="er-fselect" value={effType}
                            onChange={e => handleEffType(e.target.value)}>
                            <option value="operator">Operator Efficiency</option>
                            <option value="operator_date">Operator Eff. Date Wise</option>
                            <option value="operator_date_all">Operator Eff. All Machine</option>
                            <option value="component">Component Efficiency</option>
                            <option value="machine">Machine Efficiency</option>
                            <option value="operator_month">Operator Eff. Month Wise</option>
                            <option value="machine_month">Machine Eff. Month Wise</option>
                        </select>
                    </div> */}

                    {/* Live clock */}
                    {/* <div className="er-clock">
                        <span className="er-clock__dot" />
                        <span className="er-clock__time">{timeStr}</span>
                        <span className="er-clock__date">{dateStr}</span>
                    </div> */}
                </div>

                {/* Row 2 — team, dept, operator, machine, report type, actions */}
                <div className="er-filter-row">
                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Team</span>
                        <input className="er-finput" type="text" placeholder="All Teams"
                            value={teamName} onChange={e => setTeamName(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Dept</span>
                        <input className="er-finput" type="text" placeholder="All Depts"
                            value={deptName} onChange={e => setDeptName(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Operator</span>
                        <input className="er-finput" type="text" placeholder="All Operators"
                            value={opFilter} onChange={e => setOpFilter(e.target.value)} />
                    </div>
                    <div className="er-fgroup">
                        <span className="er-flabel">Mac No</span>
                        <input className="er-finput er-finput--sm" type="text" placeholder="All"
                            value={macFilter} onChange={e => setMacFilter(e.target.value)} />
                    </div> */}
                    {/* <div className="er-fgroup">
                        <span className="er-flabel">Report Type</span>
                        <select className="er-fselect" value={reportType}
                            onChange={e => { setReportType(e.target.value); setPage(1); }}>
                            <option value="rank">Order By Rank</option>
                            <option value="operator">Order By Operator</option>
                            <option value="dept">Order By Department</option>
                            <option value="mac">Order By Machine</option>
                            <option value="oee_desc">OA EFF% High → Low</option>
                            <option value="oee_asc">OA EFF% Low → High</option>
                        </select>
                    </div> */}

                    <div className="er-filter-sep" />
                    {/* <button className="er-btn-gen" onClick={() => setPage(1)}>⚡ Generate</button>
                    <button className="er-btn-outline" onClick={() => window.print()}>🖨 Print</button>
                    <button className="er-btn-outline" onClick={exportCSV}>📥 Export</button> */}
                </div>
            </div>

            {/* ══ TAB BAR ══ */}
            <div className="er-tabbar">
                {[
                    ["operator", "Operator Efficiency"],
                    ["machine", "Machine Efficiency"],
                ].map(([key, lbl]) => (
                    <button
                        key={key}
                        className={`er-tab ${tab === key ? "er-tab--active" : ""}`}
                        onClick={() => handleTab(key)}
                    >
                        {lbl}
                    </button>
                ))}
            </div>

            {/* ══ KPI STRIP ══ */}
            <div className="er-kpi-strip">
                {[
                    { id: "n", label: "Total Records", val: kpi.n, color: "cyan" },
                    { id: "oee", label: "Avg OA Eff %", val: kpi.oee, color: "green" },
                    { id: "opr", label: "Avg Opr Eff %", val: kpi.opr, color: "blue" },
                    { id: "idle", label: "Avg Idle Time", val: kpi.idle, color: "amber" },
                    { id: "rej", label: "Avg Rej %", val: kpi.rej, color: "red" },
                ].map(k => (
                    <div key={k.id} className={`er-kpi er-kpi--${k.color}`}>
                        <div className={`er-kpi__val er-kpi__val--${k.color}`}>{k.val}</div>
                        <div className="er-kpi__lbl">{k.label}</div>
                    </div>
                ))}

                {/* Colour Legend */}
                <div className="er-legend">
                    {[
                        ["#059669", "≥ 90%"],
                        ["#2d6de8", "75–90%"],
                        ["#d97706", "50–75%"],
                        ["#dc2626", "< 50%"],
                    ].map(([c, l]) => (
                        <div key={l} className="er-leg-item">
                            <span className="er-leg-dot" style={{ background: c }} />
                            <span>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══ CHARTS SECTION ══ */}
            {loading ? (
                <div className="er-charts-section">
                    <div className="er-charts-header">
                        <span className="er-charts-title">
                            <BarChart2 size={15} style={{ color: "var(--er-primary)", marginRight: 5 }} />
                            Efficiency Analytics
                        </span>
                    </div>
                    <div className="er-charts-grid">
                        <ChartSkeleton />
                        <ChartSkeleton />
                    </div>
                </div>
            ) : filtered.length > 0 && (
                <div className="er-charts-section">
                    <div className="er-charts-header">
                        <span className="er-charts-title">
                            <BarChart2 size={15} style={{ color: "var(--er-primary)", marginRight: 5 }} />
                            Efficiency Analytics
                        </span>
                        <span className="er-charts-sub">OA / OPR / QF Efficiency % — {Math.min(12, filtered.length)} Records</span>
                    </div>
                    <div className="er-charts-grid">
                        {/* Operator Efficiency Line Chart */}
                        <div className="er-chart-card">
                            <EffLineChart
                                data={filtered}
                                labelKey={0}
                                title="Operator Efficiency"
                                badge="er-chart-card-badge--op"
                                accentGrad="blue"
                                animKey={`op-${tab}-${filtered.length}`}
                                filterValue={opFilter}
                                onFilterChange={setOpFilter}
                                filterOptions={uniqueOperators}
                                filterPlaceholder="All Operators"
                            />
                        </div>
                        {/* Machine Efficiency Line Chart */}
                        <div className="er-chart-card">
                            <EffLineChart
                                data={[...filtered].sort((a, b) => (a[2] || '').localeCompare(b[2] || ''))}
                                labelKey={2}
                                title="Machine Efficiency"
                                badge="er-chart-card-badge--mac"
                                accentGrad="green"
                                animKey={`mac-${tab}-${filtered.length}`}
                                filterValue={macFilter}
                                onFilterChange={setMacFilter}
                                filterOptions={uniqueMachines}
                                filterPlaceholder="All Machines"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TOP & BOTTOM PERFORMERS ══ */}
            {loading ? (
                <div className="er-performers-section">
                    <div className="er-performers-grid">
                        <PerformerSkeleton />
                        <PerformerSkeleton />
                    </div>
                </div>
            ) : filtered.length > 0 ? (
                <div className="er-performers-section">
                    <div className="er-performers-grid">
                        {/* Top Performers Card */}
                        <div className="er-perf-card er-perf-card--top">
                            <div className="er-perf-card-header">
                                <span className="er-perf-card-title">
                                    <Trophy size={15} className="er-perf-ico-top" />
                                    Top 5 {tab === "operator" ? "Operators" : "Machines"}
                                </span>
                                <span className="er-perf-card-badge er-perf-card-badge--top">Leaders</span>
                            </div>
                            <div className="er-perf-list">
                                {topPerformers.map((row, i) => (
                                    <div key={i} className="er-perf-row" style={{ animationDelay: `${i * 40}ms` }}>
                                        <span className="er-perf-rank er-perf-rank--top">#{i + 1}</span>
                                        <div className="er-perf-info">
                                            <span className="er-perf-name">{row[tab === "operator" ? 0 : 2]}</span>
                                            <span className="er-perf-dept">{row[1]}</span>
                                        </div>
                                        <div className="er-perf-val-wrap">
                                            <span className="er-perf-val" style={{ color: effColor(row[3]) }}>{row[3].toFixed(1)}%</span>
                                            <div className="er-perf-progress-bg">
                                                <div className="er-perf-progress-fill" style={{ width: `${row[3]}%`, background: effColor(row[3]) }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Performers Card */}
                        <div className="er-perf-card er-perf-card--bottom">
                            <div className="er-perf-card-header">
                                <span className="er-perf-card-title">
                                    <AlertTriangle size={15} className="er-perf-ico-bottom" />
                                    Bottom 5 {tab === "operator" ? "Operators" : "Machines"}
                                </span>
                                <span className="er-perf-card-badge er-perf-card-badge--bottom">Attention Required</span>
                            </div>
                            <div className="er-perf-list">
                                {bottomPerformers.map((row, i) => (
                                    <div key={i} className="er-perf-row" style={{ animationDelay: `${i * 40}ms` }}>
                                        <span className="er-perf-rank er-perf-rank--bottom">#{i + 1}</span>
                                        <div className="er-perf-info">
                                            <span className="er-perf-name">{row[tab === "operator" ? 0 : 2]}</span>
                                            <span className="er-perf-dept">{row[1]}</span>
                                        </div>
                                        <div className="er-perf-val-wrap">
                                            <span className="er-perf-val" style={{ color: effColor(row[3]) }}>{row[3].toFixed(1)}%</span>
                                            <div className="er-perf-progress-bg">
                                                <div className="er-perf-progress-fill" style={{ width: `${row[3]}%`, background: effColor(row[3]) }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="er-performers-section">
                    <ErEmptyState message="No performers found in this period" subtitle="Change filter values or period settings." />
                </div>
            )}

            {/* ══ TABLE AREA ══ */}
            <div className="er-table-area">

                {/* Toolbar */}
                <div className="er-toolbar">
                    <div className="er-toolbar-left">
                        <div className="er-search-wrap">
                            <Search className="er-search-ico" size={13} />
                            <input
                                className="er-search"
                                type="text"
                                placeholder="Search operator / machine…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="er-search-clear-btn"
                                    onClick={() => { setSearch(""); setPage(1); }}
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </div>

                        {/* Toolbar OPR EFF% Filter Widget */}
                        <div className="er-tool-filter-wrap" ref={oprFilterRef}>
                            <button
                                type="button"
                                className={`er-tool-filter-btn ${oprFilterVal !== "" ? "er-tool-filter-btn--active" : ""}`}
                                onClick={() => setIsOprFilterOpen(!isOprFilterOpen)}
                            >
                                <Filter size={11} style={{ marginRight: 5 }} />
                                <span className="er-tool-filter-btn-label">
                                    {oprFilterVal !== "" ? `OPR Eff ${oprFilterOp} ${oprFilterVal}%` : "Filter OPR Eff %"}
                                </span>
                                {oprFilterVal !== "" ? (
                                    <span
                                        className="er-tool-filter-btn-clear-ico"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOprFilterVal("");
                                            setPage(1);
                                        }}
                                    >
                                        <X size={10} />
                                    </span>
                                ) : (
                                    <ChevronDown size={11} style={{ marginLeft: 5, transform: isOprFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                )}
                            </button>
                            {isOprFilterOpen && (
                                <div className="er-tool-filter-popover">
                                    <div className="er-tf-title">
                                        <Filter size={12} style={{ color: "var(--er-primary)", marginRight: 4 }} />
                                        Filter Operator Eff %
                                    </div>
                                    <div className="er-tf-segmented">
                                        <button
                                            type="button"
                                            className={`er-tf-seg-btn ${oprFilterOp === ">" ? "active" : ""}`}
                                            onClick={() => setOprFilterOp(">")}
                                        >
                                            &gt; Greater
                                        </button>
                                        <button
                                            type="button"
                                            className={`er-tf-seg-btn ${oprFilterOp === "<" ? "active" : ""}`}
                                            onClick={() => setOprFilterOp("<")}
                                        >
                                            &lt; Less
                                        </button>
                                        <button
                                            type="button"
                                            className={`er-tf-seg-btn ${oprFilterOp === "=" ? "active" : ""}`}
                                            onClick={() => setOprFilterOp("=")}
                                        >
                                            = Equal
                                        </button>
                                    </div>
                                    <div className="er-tf-row-slider">
                                        <input
                                            type="range"
                                            className="er-tf-slider"
                                            min="0"
                                            max="100"
                                            value={oprFilterVal === "" ? 0 : oprFilterVal}
                                            onChange={e => {
                                                setOprFilterVal(e.target.value);
                                                setPage(1);
                                            }}
                                        />
                                        <div className="er-tf-input-wrapper" style={{ width: '65px', flex: 'none' }}>
                                            <input
                                                type="number"
                                                className="er-tf-input"
                                                placeholder="Val"
                                                min="0"
                                                max="100"
                                                value={oprFilterVal}
                                                onChange={e => {
                                                    let val = e.target.value;
                                                    if (val !== "") {
                                                        const num = parseFloat(val);
                                                        if (num < 0) val = "0";
                                                        if (num > 100) val = "100";
                                                    }
                                                    setOprFilterVal(val);
                                                    setPage(1);
                                                }}
                                            />
                                            <span className="er-tf-input-suffix">%</span>
                                        </div>
                                    </div>
                                    {oprFilterVal !== "" && (
                                        <button
                                            type="button"
                                            className="er-tf-clear"
                                            onClick={() => {
                                                setOprFilterVal("");
                                                setPage(1);
                                                setIsOprFilterOpen(false);
                                            }}
                                        >
                                            <X size={11} /> Clear Filter
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="er-toolbar-right">
                        <span className="er-rec-badge">{kpi.n} records</span>
                        <span className="er-page-info">
                            Page {safeP} of {totalPages} · {filtered.length} records
                        </span>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <TableSkeleton />
                ) : (
                    <>
                        <div className="er-tbl-scroll">
                            <table className="er-table">
                                <thead>
                                    <tr>
                                        {cols.map(c => (
                                            <th
                                                key={c.key}
                                                className={[
                                                    c.num ? "er-th-num" : "",
                                                    c.cls ? c.cls : "",
                                                    sortCol === c.idx ? "er-th--sorted" : "",
                                                ].filter(Boolean).join(" ")}
                                                onClick={() => doSort(c.idx)}
                                            >
                                                {c.label}
                                                <span className="er-sort-ico">
                                                    {sortCol === c.idx ? (sortDir === 1 ? " ▲" : " ▼") : " ⇅"}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {slice.length === 0 ? (
                                        <tr>
                                            <td colSpan={cols.length} style={{ padding: '24px 12px' }}>
                                                <ErEmptyState message="No Data found on this period" subtitle="Please check other date ranges or filter conditions." />
                                            </td>
                                        </tr>
                                    ) : (
                                        slice.map((row, i) => (
                                            <tr
                                                key={i}
                                                className={i % 2 === 1 ? "er-tr--even" : ""}
                                                style={{ animationDelay: `${i * 18}ms` }}
                                            >
                                                {cols.map(c => renderCell(row, c))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="er-pagination">
                            <button
                                className="er-pg-btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safeP === 1}
                            >‹</button>

                            {pageButtons().map((b, i) =>
                                b === "…"
                                    ? <span key={`ellipsis-${i}`} className="er-pg-ellipsis">…</span>
                                    : <button
                                        key={b}
                                        className={`er-pg-btn ${b === safeP ? "er-pg-btn--active" : ""}`}
                                        onClick={() => setPage(b)}
                                    >{b}</button>
                            )}

                            <button
                                className="er-pg-btn"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safeP === totalPages}
                            >›</button>

                            <span className="er-pg-info">
                                Showing {(safeP - 1) * PAGE_SIZE + 1}–{Math.min(safeP * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </span>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}