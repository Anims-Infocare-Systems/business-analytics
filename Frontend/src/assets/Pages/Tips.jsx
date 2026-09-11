import { useState, useMemo } from "react";
import "./Tips.css";
import {
    VERSION_REGISTRY,
    CURRENT_APP_VERSION,
    getVersionData,
    getTourStepsForVersion,
} from "./versionToursData";

// ── React Icons (Feather Icons & Heroicons) ──
import {
    FiCompass,
    FiCalendar,
    FiLayers,
    FiTarget,
    FiClock,
    FiCheck,
    FiPlay,
    FiSearch,
    FiX,
    FiArrowRight,
    FiCheckCircle,
    FiMaximize2,
    FiTrendingUp,
    FiShield,
    FiKey,
    FiCommand,
    FiFileText,
    FiActivity,
    FiZap,
    FiAward,
    FiSliders,
    FiHelpCircle,
    FiPlayCircle,
    FiPrinter,
    FiRefreshCw
} from "react-icons/fi";

import {
    HiSparkles,
    HiOutlineLightBulb,
    HiOutlineRocketLaunch,
    HiOutlineDocumentCheck
} from "react-icons/hi2";

/** Dynamic icon mapper using React Icons */
function renderTipIcon(iconName, category) {
    const iconKey = (iconName || "").toLowerCase();
    const cat = (category || "").toLowerCase();

    if (iconKey === "calendar" || cat.includes("report")) {
        return <FiCalendar className="tips-icon-svg" />;
    }
    if (iconKey === "checkcircle" || iconKey === "check" || cat.includes("approval")) {
        return <FiCheckCircle className="tips-icon-svg" />;
    }
    if (iconKey === "maximize2" || cat.includes("product") || cat.includes("shortcut")) {
        return <FiMaximize2 className="tips-icon-svg" />;
    }
    if (iconKey === "trendingup" || cat.includes("dash") || cat.includes("mis")) {
        return <FiTrendingUp className="tips-icon-svg" />;
    }
    if (iconKey === "shieldalert" || iconKey === "shield" || cat.includes("sec") || cat.includes("util")) {
        return <FiShield className="tips-icon-svg" />;
    }
    if (iconKey === "key") {
        return <FiKey className="tips-icon-svg" />;
    }
    if (iconKey === "zap") {
        return <FiZap className="tips-icon-svg" />;
    }
    return <HiSparkles className="tips-icon-svg" />;
}

export default function Tips({ onStartTour, onNavigateModule }) {
    const [selectedVersion, setSelectedVersion] = useState(CURRENT_APP_VERSION);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const currentVersionData = useMemo(() => {
        return getVersionData(selectedVersion);
    }, [selectedVersion]);

    const tourSteps = useMemo(() => {
        return getTourStepsForVersion(selectedVersion);
    }, [selectedVersion]);

    // Categories list with item counts
    const categoriesWithCount = useMemo(() => {
        const tips = currentVersionData?.tips || [];
        const counts = { All: tips.length };
        tips.forEach(t => {
            if (t.category) {
                counts[t.category] = (counts[t.category] || 0) + 1;
            }
        });
        const list = ["All", ...Object.keys(counts).filter(k => k !== "All")];
        return list.map(cat => ({
            name: cat,
            count: counts[cat] || 0
        }));
    }, [currentVersionData]);

    const filteredTips = useMemo(() => {
        const tips = currentVersionData?.tips || [];
        return tips.filter(tip => {
            const matchesCat = selectedCategory === "All" || tip.category === selectedCategory;
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query ||
                tip.title.toLowerCase().includes(query) ||
                tip.summary.toLowerCase().includes(query) ||
                (tip.steps || []).some(s => s.toLowerCase().includes(query));
            return matchesCat && matchesSearch;
        });
    }, [currentVersionData, selectedCategory, searchQuery]);

    const getBadgeStyle = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes("pro")) return { className: "tips-card__badge--pro", label: "Pro Tip", dotColor: "#38bdf8" };
        if (t.includes("new")) return { className: "tips-card__badge--new", label: "New Feature", dotColor: "#34d399" };
        if (t.includes("shortcut")) return { className: "tips-card__badge--shortcut", label: "Shortcut", dotColor: "#fbbf24" };
        if (t.includes("practice")) return { className: "tips-card__badge--practice", label: "Best Practice", dotColor: "#c084fc" };
        if (t.includes("security")) return { className: "tips-card__badge--security", label: "Security", dotColor: "#f87171" };
        return { className: "tips-card__badge--pro", label: type || "Tip", dotColor: "#38bdf8" };
    };

    const handleLaunchTour = () => {
        if (typeof onStartTour === "function") {
            onStartTour(selectedVersion);
        }
    };

    return (
        <div className="tips-root">
            {/* ── Top Header Section ── */}
            <div className="tips-header">
                <div className="tips-header__title-row">
                    <div className="tips-header__left">
                        <h2 className="tips-header__title">
                            <span className="tips-header__title-icon">
                                <FiCompass size={22} />
                            </span>
                            Tips & Interactive Tours
                        </h2>
                        <p className="tips-header__desc">
                            {currentVersionData.tagline}
                        </p>
                    </div>

                    {/* Version Selector */}
                    <div className="tips-version-selector">
                        {VERSION_REGISTRY.map(v => (
                            <button
                                key={v.version}
                                type="button"
                                className={`tips-version-btn ${selectedVersion === v.version ? "tips-version-btn--active" : ""}`}
                                onClick={() => {
                                    setSelectedVersion(v.version);
                                    setSelectedCategory("All");
                                }}
                            >
                                <span className={`tips-version-dot ${v.isCurrent ? "tips-version-dot--pulse" : ""}`} />
                                <span className="tips-version-label">{v.label}</span>
                                {v.isCurrent && <span className="tips-version-tag">ACTIVE</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="tips-header__meta-bar">
                    <span className="tips-meta-pill">
                        <FiCalendar size={14} /> Released {currentVersionData.releaseDate}
                    </span>
                    <span className="tips-meta-pill">
                        <HiSparkles size={14} style={{ color: "#eab308" }} /> {currentVersionData.tips?.length || 0} Curated Tips
                    </span>
                    {tourSteps.length > 0 && (
                        <span className="tips-meta-pill tips-meta-pill--highlight">
                            <FiTarget size={14} /> {tourSteps.length}-Step Interactive Spotlight
                        </span>
                    )}
                </div>
            </div>

            {/* ── Interactive Tour Hero Banner ── */}
            {tourSteps.length > 0 && (
                <div className="tips-tour-hero">
                    <div className="tips-tour-hero__mesh" />
                    <div className="tips-tour-hero__mesh tips-tour-hero__mesh--secondary" />
                    <div className="tips-tour-hero__grid-pattern" />

                    <div className="tips-tour-hero__left">
                        <div className="tips-tour-hero__badge-row">
                            <span className="tips-tour-hero__badge">
                                <span className="tips-tour-hero__pulse-dot" />
                                <HiSparkles size={13} /> {selectedVersion} INTERACTIVE SPOTLIGHT
                            </span>
                            <span className="tips-tour-hero__pill-stat">
                                <FiTarget size={13} /> {tourSteps.length} Live Steps
                            </span>
                            <span className="tips-tour-hero__pill-stat">
                                <FiClock size={13} /> ~2 Mins Walkthrough
                            </span>
                        </div>

                        <h3 className="tips-tour-hero__title">
                            Take a Guided Tour of {selectedVersion}
                        </h3>

                        <p className="tips-tour-hero__desc">
                            Walk through the core dashboards, approvals, reports, and time sync tools with our real-time interactive spotlight guide.
                        </p>

                        <div className="tips-tour-hero__chips">
                            <span className="tips-hero-chip">
                                <FiCheck size={13} /> Live DOM Highlighting
                            </span>
                            <span className="tips-hero-chip">
                                <FiCheck size={13} /> Step-by-step Navigation
                            </span>
                            <span className="tips-hero-chip">
                                <FiCheck size={13} /> Keyboard Shortcut Support
                            </span>
                        </div>
                    </div>

                    <div className="tips-tour-hero__right">
                        <button
                            type="button"
                            className="tips-tour-hero__btn"
                            onClick={handleLaunchTour}
                        >
                            <span className="tips-tour-hero__btn-icon">
                                <FiPlay size={15} style={{ marginLeft: "2px" }} />
                            </span>
                            <span className="tips-tour-hero__btn-text">Start Interactive Tour</span>
                            <span className="tips-tour-hero__btn-shine" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Smart Filter Bar & Search ── */}
            <div className="tips-filter-bar">
                <div className="tips-categories">
                    {categoriesWithCount.map(cat => (
                        <button
                            key={cat.name}
                            type="button"
                            className={`tips-cat-chip ${selectedCategory === cat.name ? "tips-cat-chip--active" : ""}`}
                            onClick={() => setSelectedCategory(cat.name)}
                        >
                            <span className="tips-cat-name">{cat.name}</span>
                            <span className="tips-cat-count">{cat.count}</span>
                        </button>
                    ))}
                </div>

                <div className="tips-search-wrap">
                    <span className="tips-search-icon">
                        <FiSearch size={15} />
                    </span>
                    <input
                        type="text"
                        className="tips-search-input"
                        placeholder="Search tips, guides, shortcuts…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="tips-search-clear"
                            onClick={() => setSearchQuery("")}
                            title="Clear search"
                        >
                            <FiX size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tips Bento Grid ── */}
            {filteredTips.length > 0 ? (
                <div className="tips-grid">
                    {filteredTips.map((tip, idx) => {
                        const badge = getBadgeStyle(tip.type);
                        return (
                            <div
                                key={tip.id}
                                className="tips-card"
                                style={{ "--card-index": idx }}
                            >
                                <div className="tips-card__header-bar">
                                    <div className="tips-card__type-wrap">
                                        <div className="tips-card__icon-box">
                                            {renderTipIcon(tip.icon, tip.category)}
                                        </div>
                                        <span className={`tips-card__badge ${badge.className}`}>
                                            <span className="tips-card__badge-dot" style={{ backgroundColor: badge.dotColor }} />
                                            {badge.label}
                                        </span>
                                    </div>
                                    <span className="tips-card__category-tag">{tip.category}</span>
                                </div>

                                <h4 className="tips-card__title">{tip.title}</h4>
                                <p className="tips-card__summary">{tip.summary}</p>

                                {tip.steps && tip.steps.length > 0 && (
                                    <div className="tips-card__steps-container">
                                        <span className="tips-card__steps-label">ACTION STEPS</span>
                                        <div className="tips-card__steps-list">
                                            {tip.steps.map((stepText, sIdx) => (
                                                <div key={sIdx} className="tips-card__step-item">
                                                    <span className="tips-card__step-num">
                                                        {String(sIdx + 1).padStart(2, "0")}
                                                    </span>
                                                    <span className="tips-card__step-text">{stepText}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="tips-card__action">
                                    {tip.actionLabel ? (
                                        <button
                                            type="button"
                                            className="tips-card__action-btn"
                                            onClick={() => {
                                                if (tip.actionTarget && typeof onNavigateModule === "function") {
                                                    onNavigateModule(tip.actionTarget);
                                                } else {
                                                    handleLaunchTour();
                                                }
                                            }}
                                        >
                                            <span>{tip.actionLabel}</span>
                                            <span className="tips-card__action-arrow">
                                                <FiArrowRight size={15} />
                                            </span>
                                        </button>
                                    ) : (
                                        <span className="tips-card__info-tag">
                                            <HiOutlineLightBulb size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px", color: "#f59e0b" }} />
                                            Pro Insight
                                        </span>
                                    )}

                                    {tourSteps.length > 0 && (
                                        <button
                                            type="button"
                                            className="tips-card__quick-tour-link"
                                            onClick={handleLaunchTour}
                                            title="View in Interactive Tour"
                                        >
                                            <FiPlayCircle size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                                            Tour Spotlight
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="tips-empty">
                    <div className="tips-empty__icon-wrap">
                        <FiSearch size={22} />
                    </div>
                    <h4 className="tips-empty__title">No matching tips found</h4>
                    <p className="tips-empty__desc">
                        No results matched "{searchQuery}". Try selecting another category or clear your search term.
                    </p>
                    <button
                        type="button"
                        className="tips-empty__clear-btn"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("All");
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            )}

            {/* ── Productivity & Keyboard Cheat Sheet ── */}
            <div className="tips-cheat-sheet">
                <div className="tips-cheat-sheet__head">
                    <span className="tips-cheat-sheet__head-icon">
                        <FiCommand size={20} />
                    </span>
                    <div>
                        <h4 className="tips-cheat-sheet__title">
                            Productivity & Navigation Quick Reference
                        </h4>
                        <p className="tips-cheat-sheet__subtitle">
                            Essential shortcuts and rapid access bindings across the Business Analytics platform
                        </p>
                    </div>
                </div>

                <div className="tips-cheat-grid">
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Next Tour Step</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd">→</kbd>
                            <span className="tips-kbd-sep">or</span>
                            <kbd className="tips-kbd">Space</kbd>
                        </div>
                    </div>
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Previous Tour Step</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd">←</kbd>
                        </div>
                    </div>
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Exit Tour or Modal</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd">Esc</kbd>
                        </div>
                    </div>
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Toggle Sidebar Collapse</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd">Bottom Toggle</kbd>
                        </div>
                    </div>
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Instant PDF Voucher Export</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd">
                                <FiPrinter size={11} style={{ marginRight: "3px", verticalAlign: "middle" }} />
                                PDF / Print
                            </kbd>
                        </div>
                    </div>
                    <div className="tips-cheat-item">
                        <span className="tips-cheat-desc">Real-Time ERP Data Sync</span>
                        <div className="tips-kbd-wrap">
                            <kbd className="tips-kbd tips-kbd--accent">
                                <FiRefreshCw size={10} style={{ marginRight: "3px", verticalAlign: "middle" }} />
                                Auto (2 Min)
                            </kbd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
