import { useState, useMemo, useCallback } from "react";
import "./SpotlightSettingsTab.css";
import {
    SPOTLIGHT_REGISTRY,
    SPOTLIGHT_CATEGORIES,
    searchSpotlightRegistry
} from "./spotlightRegistry";
import {
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
    Settings as SettingsIcon,
    LayoutDashboard,
    Factory,
    Clock,
    Compass,
    Search,
    X,
    ArrowRight,
    Copy,
    Check,
    Zap,
    Navigation,
    Layers,
    Command,
    ExternalLink,
    BarChart2,
    FileText,
    Sliders,
    UserCheck,
    Scale,
    Calendar,
    DollarSign,
    AlertTriangle
} from "lucide-react";

// Icon resolution map
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
    Settings: SettingsIcon,
    LayoutDashboard,
    Factory,
    Clock,
    Compass,
    Layers,
    Zap,
    BarChart2,
    FileText,
    Sliders,
    UserCheck,
    Scale,
    Calendar,
    DollarSign,
    AlertTriangle
};

function renderSpotlightIcon(iconName, color) {
    const IconComp = ICON_MAP[iconName] || Compass;
    return <IconComp size={18} style={{ color: color || "#2d6de8" }} />;
}

export default function SpotlightSettingsTab({ onSelectSection, onOpenSpotlight }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [copiedId, setCopiedId] = useState(null);

    // Compute live item counts per category
    const categoryCounts = useMemo(() => {
        const counts = { all: SPOTLIGHT_REGISTRY.length };
        SPOTLIGHT_REGISTRY.forEach(item => {
            const cat = item.categoryType || "reports";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, []);

    // Filter items based on active category and search query
    const filteredItems = useMemo(() => {
        return searchSpotlightRegistry(searchQuery, selectedCategory);
    }, [searchQuery, selectedCategory]);

    // Handle deep link copy
    const handleCopyLink = useCallback((e, item) => {
        e.stopPropagation();
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("spotlight", item.id);
            navigator.clipboard.writeText(url.toString());
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    }, []);

    // Handle jumping to section
    const handleJump = useCallback((item) => {
        if (typeof onSelectSection === "function") {
            onSelectSection(item);
        }
    }, [onSelectSection]);

    return (
        <div className="sst-root">
            {/* ── Top Header Section ── */}
            <div className="sst-header">
                <div className="sst-header__title-row">
                    <div className="sst-header__left">
                        <div className="sst-header__badge-pill">
                            <span className="sst-header__badge-dot" />
                            <Sparkles size={13} className="sst-header__sparkle-icon" />
                            <span>FEATURE COMPASS & TOUR RADAR</span>
                        </div>
                        <h2 className="sst-header__title">
                            <span className="sst-header__icon-box">
                                <Compass size={22} />
                            </span>
                            Spotlight Navigator
                        </h2>
                        <p className="sst-header__desc">
                            Explore all platform modules, audit tables, KPI cockpits, and analytical charts. Click any feature card to jump directly to that section with an interactive guided spotlight focus.
                        </p>
                    </div>

                    {/* Quick Stats Meta Pills */}
                    <div className="sst-header__stats">
                        <div className="sst-stat-card">
                            <span className="sst-stat-card__val">{SPOTLIGHT_REGISTRY.length}</span>
                            <span className="sst-stat-card__lbl">Target Features</span>
                        </div>
                        <div className="sst-stat-card sst-stat-card--accent">
                            <span className="sst-stat-card__val">100%</span>
                            <span className="sst-stat-card__lbl">Live Anchors</span>
                        </div>
                    </div>
                </div>

                <div className="sst-header__meta-bar">
                    <span className="sst-meta-chip">
                        <Navigation size={13} style={{ color: "#38bdf8" }} />
                        <span>Interactive DOM Radar Beacon</span>
                    </span>
                    <span className="sst-meta-chip">
                        <Layers size={13} style={{ color: "#a855f7" }} />
                        <span>Cross-Module Auto Routing</span>
                    </span>
                    <span className="sst-meta-chip sst-meta-chip--hotkey">
                        <Command size={13} />
                        <span>Global Shortcut: <kbd className="sst-kbd">Ctrl</kbd> + <kbd className="sst-kbd">K</kbd></span>
                    </span>
                </div>
            </div>

            {/* ── Luminous Tour Hero Banner ── */}
            <div className="sst-hero-banner">
                <div className="sst-hero-banner__mesh" />
                <div className="sst-hero-banner__mesh sst-hero-banner__mesh--alt" />
                <div className="sst-hero-banner__grid-pattern" />

                <div className="sst-hero-banner__content">
                    <div className="sst-hero-banner__left">
                        <div className="sst-hero-banner__tag-row">
                            <span className="sst-hero-banner__tag">
                                <span className="sst-hero-banner__pulse-dot" />
                                <Sparkles size={12} />
                                PRECISION NAVIGATION RADAR
                            </span>
                            <span className="sst-hero-banner__subtag">
                                <Clock size={12} /> Instant Contextual Jump
                            </span>
                        </div>

                        <h3 className="sst-hero-banner__title">
                            Never Get Lost in Deep ERP Analytics
                        </h3>

                        <p className="sst-hero-banner__desc">
                            Looking for an audit ledger, CSV exporter, or futuristic stock forecast? Selecting any feature card switches the view, smoothly scrolls to the target element, and lights up a luminous spotlight beacon with instant tips.
                        </p>

                        <div className="sst-hero-banner__features">
                            <span className="sst-hero-feature-chip">
                                <CheckCircle2 size={13} className="sst-hero-feature-icon" /> Live DOM Highlighting
                            </span>
                            <span className="sst-hero-feature-chip">
                                <CheckCircle2 size={13} className="sst-hero-feature-icon" /> Deep Link URL Sharing
                            </span>
                            <span className="sst-hero-feature-chip">
                                <CheckCircle2 size={13} className="sst-hero-feature-icon" /> Keyboard Shortcut Navigation
                            </span>
                        </div>
                    </div>

                    <div className="sst-hero-banner__right">
                        <button
                            type="button"
                            className="sst-hero-banner__cta-btn"
                            onClick={() => {
                                if (typeof onOpenSpotlight === "function") {
                                    onOpenSpotlight();
                                }
                            }}
                            title="Open Command Palette (Ctrl+K)"
                        >
                            <span className="sst-hero-banner__cta-icon">
                                <Sparkles size={16} />
                            </span>
                            <div className="sst-hero-banner__cta-text-group">
                                <span className="sst-hero-banner__cta-main">Quick Command Palette</span>
                                <span className="sst-hero-banner__cta-sub">Press Ctrl + K anywhere</span>
                            </div>
                            <span className="sst-hero-banner__cta-shine" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Category Pills & Search Filter Bar ── */}
            <div className="sst-filter-bar">
                <div className="sst-categories">
                    {SPOTLIGHT_CATEGORIES.map(cat => {
                        const count = categoryCounts[cat.id] || 0;
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                className={`sst-cat-pill ${isActive ? "sst-cat-pill--active" : ""}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <span className="sst-cat-pill__name">{cat.label}</span>
                                <span className="sst-cat-pill__count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="sst-search-wrap">
                    <span className="sst-search-icon">
                        <Search size={15} />
                    </span>
                    <input
                        type="text"
                        className="sst-search-input"
                        placeholder="Search features, tables, KPIs, CSV export, tags…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="sst-search-clear"
                            onClick={() => setSearchQuery("")}
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Count Bar */}
            <div className="sst-results-meta">
                <span className="sst-results-count">
                    Showing <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? "feature" : "features"}
                    {selectedCategory !== "all" && ` in ${SPOTLIGHT_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
                    {searchQuery && ` matching "${searchQuery}"`}
                </span>
                {searchQuery && (
                    <button
                        type="button"
                        className="sst-reset-btn"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                        }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* ── Bento Grid of Spotlight Feature Cards ── */}
            {filteredItems.length > 0 ? (
                <div className="sst-grid">
                    {filteredItems.map((item, idx) => {
                        const isCopied = copiedId === item.id;
                        return (
                            <div
                                key={item.id}
                                className="sst-card"
                                style={{
                                    "--accent-color": item.color || "#2d6de8",
                                    "--card-index": idx
                                }}
                            >
                                <div className="sst-card__top">
                                    <div className="sst-card__badge-row">
                                        <div
                                            className="sst-card__icon-box"
                                            style={{
                                                backgroundColor: `${item.color || "#2d6de8"}16`,
                                                borderColor: `${item.color || "#2d6de8"}32`
                                            }}
                                        >
                                            {renderSpotlightIcon(item.iconName, item.color)}
                                        </div>
                                        <span
                                            className="sst-card__badge"
                                            style={{
                                                backgroundColor: `${item.color || "#2d6de8"}14`,
                                                color: item.color || "#2d6de8",
                                                borderColor: `${item.color || "#2d6de8"}2e`
                                            }}
                                        >
                                            <span
                                                className="sst-card__badge-dot"
                                                style={{ backgroundColor: item.color || "#2d6de8" }}
                                            />
                                            {item.badge || item.categoryLabel}
                                        </span>
                                    </div>

                                    {/* Parent Navigation Breadcrumb */}
                                    <span className="sst-card__breadcrumb">
                                        <FolderOpen size={11} className="sst-card__breadcrumb-icon" />
                                        <span>{item.parentMenu}</span>
                                        <span className="sst-card__breadcrumb-sep">/</span>
                                        <span className="sst-card__breadcrumb-curr">{item.module}</span>
                                    </span>
                                </div>

                                <div className="sst-card__body">
                                    <h4 className="sst-card__title">{item.title}</h4>
                                    <p className="sst-card__desc">{item.description}</p>

                                    {/* Key Capabilities / Action Points */}
                                    {item.keyActions && item.keyActions.length > 0 && (
                                        <div className="sst-card__actions-box">
                                            <span className="sst-card__actions-label">
                                                <Zap size={11} /> KEY CAPABILITIES
                                            </span>
                                            <div className="sst-card__actions-list">
                                                {item.keyActions.map((action, aIdx) => (
                                                    <div key={aIdx} className="sst-card__action-item">
                                                        <span
                                                            className="sst-card__action-bullet"
                                                            style={{ backgroundColor: item.color || "#2d6de8" }}
                                                        />
                                                        <span className="sst-card__action-text">{action}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags Chips */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="sst-card__tags-wrap">
                                            {item.tags.slice(0, 5).map((tag, tIdx) => (
                                                <span key={tIdx} className="sst-card__tag">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer Actions */}
                                <div className="sst-card__footer">
                                    <button
                                        type="button"
                                        className={`sst-card__copy-btn ${isCopied ? "sst-card__copy-btn--copied" : ""}`}
                                        onClick={(e) => handleCopyLink(e, item)}
                                        title="Copy direct shareable spotlight link"
                                    >
                                        {isCopied ? (
                                            <>
                                                <Check size={13} className="sst-card__copy-icon" />
                                                <span>Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={13} className="sst-card__copy-icon" />
                                                <span>Copy Link</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="sst-card__jump-btn"
                                        onClick={() => handleJump(item)}
                                    >
                                        <span>Jump & Spotlight</span>
                                        <ArrowRight size={14} className="sst-card__jump-arrow" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Empty State */
                <div className="sst-empty-state">
                    <div className="sst-empty-state__icon-ring">
                        <Search size={28} className="sst-empty-state__icon" />
                    </div>
                    <h3 className="sst-empty-state__title">No Spotlight Targets Found</h3>
                    <p className="sst-empty-state__desc">
                        No features match &ldquo;<strong>{searchQuery}</strong>&rdquo;
                        {selectedCategory !== "all" && ` under ${SPOTLIGHT_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}.
                        Try clearing keywords or switching categories.
                    </p>
                    <button
                        type="button"
                        className="sst-empty-state__reset-btn"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                        }}
                    >
                        Reset All Filters
                    </button>
                </div>
            )}
        </div>
    );
}
