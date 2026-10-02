import { useState, useMemo, useEffect, useRef } from "react";
import "./TourPromptModal.css";
import { getVersionData, CURRENT_APP_VERSION } from "./versionToursData";
import {
    FiX,
    FiCheck,
    FiPlay,
    FiInfo,
    FiTrendingUp,
    FiShoppingCart,
    FiShield,
    FiCpu,
    FiCompass,
    FiSearch,
    FiSliders,
    FiUserCheck,
    FiLayers,
    FiCalendar,
    FiZap,
    FiBarChart2
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

const MODULE_THEMES = {
    Sales: {
        label: "Sales",
        tagClass: "tpm-tag--sales",
        iconClass: "tpm-icon--sales"
    },
    Purchase: {
        label: "Purchase",
        tagClass: "tpm-tag--purchase",
        iconClass: "tpm-icon--purchase"
    },
    Quality: {
        label: "Quality",
        tagClass: "tpm-tag--quality",
        iconClass: "tpm-icon--quality"
    },
    Production: {
        label: "Production",
        tagClass: "tpm-tag--production",
        iconClass: "tpm-icon--production"
    },
    Platform: {
        label: "Platform",
        tagClass: "tpm-tag--platform",
        iconClass: "tpm-icon--platform"
    }
};

function renderFeatureIcon(item) {
    const size = 16;
    switch (item.iconName) {
        case "Calendar":
            return <FiCalendar size={size} />;
        case "Zap":
            return <FiZap size={size} />;
        case "TrendingUp":
            return <FiTrendingUp size={size} />;
        case "Shield":
            return <FiShield size={size} />;
        case "Sparkles":
            return <HiSparkles size={size} />;
        case "SlidersHorizontal":
            return <FiSliders size={size} />;
        case "UserCheck":
            return <FiUserCheck size={size} />;
        case "Cpu":
            return <FiCpu size={size} />;
        case "Layers":
            return <FiLayers size={size} />;
        case "Compass":
            return <FiCompass size={size} />;
        case "FileSpreadsheet":
            return <FiBarChart2 size={size} />;
        default:
            if (item.module === "Sales") return <FiTrendingUp size={size} />;
            if (item.module === "Purchase") return <FiShoppingCart size={size} />;
            if (item.module === "Quality") return <FiShield size={size} />;
            if (item.module === "Production") return <FiCpu size={size} />;
            if (item.module === "Platform") return <FiCompass size={size} />;
            return <FiCheck size={size} />;
    }
}

export default function TourPromptModal({
    version = CURRENT_APP_VERSION,
    userName = "there",
    onStartTour,
    onDismiss
}) {
    const versionData = getVersionData(version);
    const [activeTab, setActiveTab] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef(null);

    // Close on escape key, Enter to start tour (when not typing in search)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && onDismiss) {
                onDismiss();
            } else if (e.key === "Enter" && !e.shiftKey && document.activeElement !== searchInputRef.current) {
                if (onStartTour) {
                    onStartTour();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onDismiss, onStartTour]);

    // Structured items parsed from tourSteps with clean module classification
    const items = useMemo(() => {
        if (versionData?.tourSteps && versionData.tourSteps.length > 0) {
            return versionData.tourSteps.map((step, idx) => {
                let module = "Platform";
                if (step.navSubItem === "Sales Analysis") module = "Sales";
                else if (step.navSubItem === "Purchase Analysis") module = "Purchase";
                else if (step.navSubItem === "Quality Analysis") module = "Quality";
                else if (step.navSubItem === "Production Analysis") module = "Production";
                else if (step.navSubItem === "Users Setting" || step.navItem === "Utility" || step.id?.includes("us-tour")) module = "Platform";
                else if (step.navItem === "Spotlight" || step.id?.includes("spotlight")) module = "Platform";

                const cleanBadge = step.badge
                    ? step.badge.replace(/^Step\s+\d+\s+of\s+\d+\s*•\s*/i, "").trim()
                    : "";

                return {
                    id: step.id || `step-${idx}`,
                    title: step.title,
                    highlight: versionData.highlights?.[idx] || step.title,
                    description: step.description || "",
                    category: step.category || module,
                    module: module,
                    badge: cleanBadge,
                    iconName: step.iconName
                };
            });
        }

        // Fallback for releases without detailed tourSteps
        return (versionData?.highlights || []).map((highlight, idx) => ({
            id: `hl-${idx}`,
            title: highlight,
            highlight: highlight,
            description: "",
            category: "General",
            module: "Platform",
            badge: "New",
            iconName: "Check"
        }));
    }, [versionData]);

    // Tab categories with item counts
    const tabs = useMemo(() => {
        const counts = { All: items.length };
        items.forEach((item) => {
            counts[item.module] = (counts[item.module] || 0) + 1;
        });

        const preferredOrder = ["All", "Sales", "Purchase", "Quality", "Production", "Platform"];
        const result = [];
        preferredOrder.forEach((key) => {
            if (counts[key] !== undefined) {
                result.push({
                    key,
                    label: key,
                    count: counts[key]
                });
            }
        });

        // Add any remaining modules not in preferred order
        Object.keys(counts).forEach((key) => {
            if (!preferredOrder.includes(key)) {
                result.push({
                    key,
                    label: key,
                    count: counts[key]
                });
            }
        });

        return result;
    }, [items]);

    // Filter items based on active tab and search query
    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
            const matchesTab = activeTab === "All" || item.module === activeTab;
            if (!matchesTab) return false;
            if (!query) return true;
            return (
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.highlight.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.module.toLowerCase().includes(query) ||
                item.badge.toLowerCase().includes(query)
            );
        });
    }, [items, activeTab, searchQuery]);

    // Count of unique modules
    const moduleCount = useMemo(() => {
        const set = new Set(items.map((i) => i.module));
        return set.size;
    }, [items]);

    return (
        <div className="tpm-overlay" role="dialog" aria-modal="true" aria-labelledby="tpm-title">
            <div className="tpm-card">
                {/* Luminous background ambiance */}
                <div className="tpm-card__glow-1" />
                <div className="tpm-card__glow-2" />

                {/* Dismiss Button */}
                <button
                    type="button"
                    className="tpm-close-btn"
                    onClick={onDismiss}
                    aria-label="Close modal"
                    title="Dismiss (Esc)"
                >
                    <FiX size={18} />
                </button>

                {/* Pinned Modal Header */}
                <div className="tpm-header">
                    <div className="tpm-badge-row">
                        <span className="tpm-version-chip">
                            <HiSparkles size={14} className="tpm-sparkle-icon" />
                            {versionData.version} UPDATE
                        </span>
                        <span className="tpm-meta-pill">
                            {versionData.releaseDate || "Latest Release"}
                        </span>
                        <span className="tpm-stats-pill">
                            {items.length} Enhancements • {moduleCount} Modules
                        </span>
                    </div>

                    <h2 id="tpm-title" className="tpm-title">
                        Welcome to <span>Anims Business Analytics</span>
                    </h2>
                    <p className="tpm-desc">
                        Hi <strong>{userName}</strong>! We’ve introduced powerful new dashboard metrics, approval workflows, and productivity tools. Would you like a quick 1-minute interactive tour?
                    </p>

                    {/* Filter Tabs & Quick Search */}
                    <div className="tpm-filter-bar">
                        <div className="tpm-tabs" role="tablist">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`tpm-tab-btn ${isActive ? "tpm-tab-btn--active" : ""}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        <span>{tab.label}</span>
                                        <span className="tpm-tab-count">{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="tpm-search-wrap">
                            <FiSearch size={14} className="tpm-search-icon" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="tpm-search-input"
                                placeholder="Search features..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="tpm-search-clear"
                                    onClick={() => setSearchQuery("")}
                                    title="Clear search"
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Body */}
                <div className="tpm-body">
                    {filteredItems.length === 0 ? (
                        <div className="tpm-empty">
                            <FiInfo size={28} className="tpm-empty-icon" />
                            <h4>No matching features found</h4>
                            <p>No highlights match your search "{searchQuery}".</p>
                            <button
                                type="button"
                                className="tpm-btn-secondary tpm-btn-secondary--sm"
                                onClick={() => {
                                    setSearchQuery("");
                                    setActiveTab("All");
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="tpm-highlights-grid">
                            {filteredItems.map((item) => {
                                const theme = MODULE_THEMES[item.module] || MODULE_THEMES.Platform;
                                return (
                                    <div key={item.id} className="tpm-feature-card">
                                        <div className={`tpm-feature-icon-box ${theme.iconClass}`}>
                                            {renderFeatureIcon(item)}
                                        </div>

                                        <div className="tpm-feature-content">
                                            <div className="tpm-feature-meta">
                                                <span className={`tpm-module-tag ${theme.tagClass}`}>
                                                    {theme.label}
                                                </span>
                                                {item.category && item.category !== theme.label && (
                                                    <span className="tpm-category-tag">
                                                        {item.category}
                                                    </span>
                                                )}
                                                {item.badge && (
                                                    <span className="tpm-badge-tag">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="tpm-feature-title">
                                                {item.title}
                                            </h3>

                                            {item.description ? (
                                                <p className="tpm-feature-desc">
                                                    {item.description}
                                                </p>
                                            ) : (
                                                <p className="tpm-feature-desc">
                                                    {item.highlight}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pinned Action Footer */}
                <div className="tpm-footer">
                    <div className="tpm-footer__info">
                        <div className="tpm-tour-indicator">
                            <span className="tpm-tour-pulse" />
                            <span className="tpm-tour-time">⚡ 1-Minute Quick Tour</span>
                        </div>
                        <span className="tpm-footer-hint">
                            Replay anytime from <strong>Settings &gt; Tips</strong>
                        </span>
                    </div>

                    <div className="tpm-actions">
                        <button
                            type="button"
                            className="tpm-btn-secondary"
                            onClick={onDismiss}
                        >
                            <span>Explore on My Own</span>
                        </button>

                        <button
                            type="button"
                            className="tpm-btn-primary"
                            onClick={onStartTour}
                            autoFocus
                        >
                            <FiPlay size={15} />
                            <span>Start Interactive Tour</span>
                            <span className="tpm-kbd-hint">↵</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
