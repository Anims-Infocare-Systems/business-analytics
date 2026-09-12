import { useState, useEffect, useRef, useMemo } from "react";
import "./SpotlightGuide.css";
import {
    SPOTLIGHT_REGISTRY,
    SPOTLIGHT_CATEGORIES,
    searchSpotlightRegistry
} from "./spotlightRegistry";
import {
    Search,
    X,
    Sparkles,
    Command,
    TrendingUp,
    ClipboardList,
    FileEdit,
    Activity,
    Trophy,
    Workflow,
    FolderOpen,
    ShieldAlert,
    Target,
    ShoppingCart,
    Package,
    CheckCircle2,
    Settings,
    LayoutDashboard,
    Factory,
    Clock,
    ArrowRight,
    CornerDownLeft,
    Compass,
    BarChart2,
    FileText,
    Sliders,
    UserCheck,
    Scale,
    Calendar,
    DollarSign,
    AlertTriangle,
    Layers,
    Zap
} from "lucide-react";

// Icon mapping helper
const ICON_MAP = {
    TrendingUp,
    ClipboardList,
    FileEdit,
    Activity,
    Sparkles,
    Trophy,
    Workflow,
    FolderOpen,
    ShieldAlert,
    Target,
    ShoppingCart,
    Package,
    CheckCircle2,
    Settings,
    LayoutDashboard,
    Factory,
    Clock,
    Compass,
    BarChart2,
    FileText,
    Sliders,
    UserCheck,
    Scale,
    Calendar,
    DollarSign,
    AlertTriangle,
    Layers,
    Zap
};

export default function SpotlightGuide({
    isOpen,
    onClose,
    onSelectSection
}) {
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Search results memoized
    const results = useMemo(() => {
        return searchSpotlightRegistry(query, activeCategory);
    }, [query, activeCategory]);

    // Focus input on modal open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setActiveCategory("all");
            setSelectedIndex(0);
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 50);
        }
    }, [isOpen]);

    // Keep selected index within bounds
    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    // Scroll active item into view
    useEffect(() => {
        if (!listRef.current) return;
        const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        if (activeEl) {
            activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[selectedIndex]) {
                    handleSelectItem(results[selectedIndex]);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const handleSelectItem = (item) => {
        onClose();
        if (typeof onSelectSection === "function") {
            onSelectSection(item);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="sg-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="sg-modal" onClick={e => e.stopPropagation()}>
                {/* ── Top Ambient Gradient Glow ── */}
                <div className="sg-glow-banner" />

                {/* ── Header Search Bar ── */}
                <div className="sg-search-wrap">
                    <div className="sg-search-icon-box">
                        <Search size={18} className="sg-search-icon" />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="sg-search-input"
                        placeholder="Search any module, table, chart, or KPI... (e.g. Traceability, ROL, PO Details)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck="false"
                    />
                    {query && (
                        <button
                            type="button"
                            className="sg-clear-btn"
                            onClick={() => setQuery("")}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <div className="sg-kbd-badge" title="Press Escape to close">
                        <span>ESC</span>
                    </div>
                </div>

                {/* ── Category Filter Pills ── */}
                <div className="sg-categories-bar">
                    {SPOTLIGHT_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            className={`sg-cat-pill ${activeCategory === cat.id ? "active" : ""}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                    <div className="sg-results-count">
                        {results.length} feature{results.length === 1 ? "" : "s"}
                    </div>
                </div>

                {/* ── Search Results List ── */}
                <div className="sg-results-list" ref={listRef}>
                    {results.length === 0 ? (
                        <div className="sg-no-results">
                            <Compass size={42} className="sg-no-results-icon" />
                            <h4>No matching features found</h4>
                            <p>Try searching for keywords like <b>Traceability</b>, <b>Price Trend</b>, <b>PO Details</b>, <b>E-Approval</b>, or <b>Idle Time</b>.</p>
                            <div className="sg-suggest-chips">
                                <span>Suggested:</span>
                                {["Traceability Table", "Purchase Order Details", "Price Trend Analysis", "E-Approval Workflow", "Sales PO Ledger"].map(term => (
                                    <button
                                        key={term}
                                        type="button"
                                        className="sg-suggest-chip"
                                        onClick={() => setQuery(term)}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        results.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            const IconComponent = ICON_MAP[item.iconName] || Compass;

                            return (
                                <div
                                    key={item.id}
                                    data-index={idx}
                                    className={`sg-item ${isSelected ? "is-selected" : ""}`}
                                    onClick={() => handleSelectItem(item)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    {/* Icon with soft accent glow */}
                                    <div
                                        className="sg-item-icon-box"
                                        style={{
                                            background: `${item.color}15`,
                                            color: item.color,
                                            border: `1.5px solid ${item.color}35`
                                        }}
                                    >
                                        <IconComponent size={18} />
                                    </div>

                                    {/* Item Meta & Content */}
                                    <div className="sg-item-content">
                                        <div className="sg-item-top">
                                            <div className="sg-item-breadcrumbs">
                                                <span className="sg-crumb-parent">{item.parentMenu}</span>
                                                <span className="sg-crumb-sep">›</span>
                                                <span className="sg-crumb-module">{item.module}</span>
                                            </div>
                                            <span
                                                className="sg-item-badge"
                                                style={{
                                                    background: `${item.color}12`,
                                                    color: item.color,
                                                    border: `1px solid ${item.color}25`
                                                }}
                                            >
                                                {item.badge}
                                            </span>
                                        </div>

                                        <h3 className="sg-item-title">{item.title}</h3>
                                        <p className="sg-item-desc">{item.description}</p>

                                        {/* Action chips preview */}
                                        {item.keyActions && item.keyActions.length > 0 && (
                                            <div className="sg-item-actions-preview">
                                                {item.keyActions.slice(0, 3).map((act, ai) => (
                                                    <span key={ai} className="sg-act-chip">
                                                        ✦ {act}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection Enter Indicator */}
                                    <div className="sg-item-enter-hint">
                                        <span className="sg-enter-text">Jump & Tour</span>
                                        <div className="sg-enter-btn">
                                            <CornerDownLeft size={13} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Footer Keyboard Tips ── */}
                <div className="sg-footer">
                    <div className="sg-footer-left">
                        <div className="sg-footer-chip">
                            <span className="sg-footer-kbd">↑</span>
                            <span className="sg-footer-kbd">↓</span>
                            <span className="sg-footer-label">Navigate</span>
                        </div>
                        <div className="sg-footer-chip">
                            <span className="sg-footer-kbd">↵</span>
                            <span className="sg-footer-label">Jump to Section</span>
                        </div>
                        <div className="sg-footer-chip">
                            <span className="sg-footer-kbd">ESC</span>
                            <span className="sg-footer-label">Close</span>
                        </div>
                    </div>

                    <div className="sg-footer-right">
                        <span className="sg-brand-pill">
                            <Sparkles size={12} className="sg-brand-icon" />
                            Spotlight Guide
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
