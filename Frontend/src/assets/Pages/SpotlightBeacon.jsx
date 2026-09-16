import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./SpotlightBeacon.css";
import { SPOTLIGHT_REGISTRY } from "./spotlightRegistry";
import {
    X,
    Check,
    Copy,
    Sparkles,
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
    Compass,
    ArrowRight,
    ChevronRight,
    ChevronLeft,
    RotateCcw
} from "lucide-react";

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
    Compass
};

function getDarkerColor(hex) {
    if (!hex || !hex.startsWith("#") || hex.length < 7) return "#1d4ed8";
    try {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.max(0, Math.floor(r * 0.72));
        g = Math.max(0, Math.floor(g * 0.72));
        b = Math.max(0, Math.floor(b * 0.72));
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    } catch {
        return "#1d4ed8";
    }
}

export default function SpotlightBeacon({
    activeTarget,
    onDismiss,
    onOpenSearch,
    onNavigateSection
}) {
    const [targetRect, setTargetRect] = useState(null);
    const [beaconPos, setBeaconPos] = useState({ top: 0, left: 0, placement: "bottom" });
    const [copied, setCopied] = useState(false);
    const targetElementRef = useRef(null);
    const rafIdRef = useRef(null);
    const hasInitialScrolledRef = useRef(false);

    // Dynamic measurement and positioning for all screen resolutions
    const updatePosition = useCallback(() => {
        let el = targetElementRef.current;
        if (!el && activeTarget?.targetSelector) {
            try { el = document.querySelector(activeTarget.targetSelector); } catch {}
            if (el) targetElementRef.current = el;
        }
        if (!el && activeTarget?.fallbackSelector) {
            try { el = document.querySelector(activeTarget.fallbackSelector); } catch {}
            if (el) targetElementRef.current = el;
        }
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < 768;

        // Bounding padding: tighter on mobile so it doesn't clip screen edges
        const padding = isMobile ? 6 : 10;
        const calculatedRect = {
            top: Math.max(0, rect.top - padding),
            left: Math.max(isMobile ? 4 : 8, rect.left - padding),
            width: Math.min(vw - (isMobile ? 8 : 16), rect.width + (padding * 2)),
            height: rect.height + (padding * 2)
        };
        setTargetRect(calculatedRect);

        // ── Card Dimensions & Multi-Resolution Placement ──
        if (isMobile) {
            // Mobile (< 768px): Dock cleanly at the bottom
            setBeaconPos({
                top: 0,
                left: 10,
                placement: "docked"
            });
            return;
        }

        // Tablet & Desktop: Smart adaptive positioning
        const cardWidth = Math.min(vw - 32, 450);
        const cardHeight = 260;
        const margin = 14;

        let placement = "bottom";
        let top = 0;

        // Horizontally center with the target card, clamped cleanly inside screen
        let left = Math.max(16, Math.min(vw - cardWidth - 16, calculatedRect.left + (calculatedRect.width / 2) - (cardWidth / 2)));

        // Dual-column layout handling: if target is in the right column, align to right side
        if (calculatedRect.left > vw * 0.45 && (calculatedRect.left + calculatedRect.width) <= vw - 16) {
            left = Math.max(16, Math.min(vw - cardWidth - 20, calculatedRect.left + calculatedRect.width - cardWidth));
        }

        // Vertical positioning
        if (calculatedRect.height > 380) {
            // Very tall card (e.g. data table)
            if (calculatedRect.top >= cardHeight + margin + 60) {
                // Space above table
                placement = "top";
                top = calculatedRect.top - cardHeight - margin;
            } else {
                // Dock near top of card
                placement = "bottom";
                top = Math.max(74, Math.min(vh - cardHeight - 20, calculatedRect.top + 24));
                left = Math.max(16, Math.min(vw - cardWidth - 24, calculatedRect.left + calculatedRect.width - cardWidth - 20));
            }
        } else {
            // Standard size card: prefer bottom, fallback to top
            if (calculatedRect.top + calculatedRect.height + cardHeight + margin <= vh) {
                placement = "bottom";
                top = calculatedRect.top + calculatedRect.height + margin;
            } else if (calculatedRect.top - cardHeight - margin >= 70) {
                placement = "top";
                top = calculatedRect.top - cardHeight - margin;
            } else {
                placement = "bottom";
                top = Math.max(74, Math.min(vh - cardHeight - 16, calculatedRect.top + calculatedRect.height + margin));
            }
        }

        // Viewport safety clamp
        top = Math.max(70, Math.min(vh - cardHeight - 16, top));
        left = Math.max(16, Math.min(vw - cardWidth - 16, left));

        setBeaconPos({ top, left, placement });
    }, [activeTarget]);

    // Smooth scroll directly to target element
    const scrollToElement = useCallback((el, isCorrection = false) => {
        if (!el) return;
        const scrollContainer = document.querySelector(".dl-content");
        const isMobile = window.innerWidth < 768;
        const topOffset = isMobile ? 12 : 24;

        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const relativeTop = elRect.top - containerRect.top;
            const targetScrollTop = scrollContainer.scrollTop + relativeTop - topOffset;

            scrollContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: "smooth"
            });
        } else {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // Continuous RAF stabilization loop (runs smoothly during smooth scrolling and data expansion)
    const runStabilizationLoop = useCallback((durationMs = 1200) => {
        const startTime = performance.now();
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

        const loop = (currentTime) => {
            updatePosition();
            if (currentTime - startTime < durationMs) {
                rafIdRef.current = requestAnimationFrame(loop);
            }
        };
        rafIdRef.current = requestAnimationFrame(loop);
    }, [updatePosition]);

    // Search and focus target element with adaptive re-centering
    useEffect(() => {
        setTargetRect(null);
        targetElementRef.current = null;
        hasInitialScrolledRef.current = false;
        if (!activeTarget) return;

        let retryCount = 0;
        let isCancelled = false;
        let pollTimer = null;

        const findAndFocus = () => {
            if (isCancelled) return;
            let el = null;
            if (activeTarget.targetSelector) {
                try { el = document.querySelector(activeTarget.targetSelector); } catch {}
            }
            if (!el && activeTarget.fallbackSelector) {
                try { el = document.querySelector(activeTarget.fallbackSelector); } catch {}
            }

            if (el) {
                targetElementRef.current = el;
                updatePosition();

                if (!hasInitialScrolledRef.current) {
                    hasInitialScrolledRef.current = true;
                    scrollToElement(el, false);
                    runStabilizationLoop(1400);
                }
            } else if (retryCount < 45) {
                // Poll every 50ms up to 2.25 seconds to account for page transitions and data renders
                retryCount += 1;
                pollTimer = setTimeout(findAndFocus, 50);
            }
        };

        // Start search after small delay to let page mount initiation trigger
        pollTimer = setTimeout(findAndFocus, 60);

        return () => {
            isCancelled = true;
            clearTimeout(pollTimer);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        };
    }, [activeTarget, updatePosition, runStabilizationLoop, scrollToElement]);

    // Active listeners on window resize, container scroll, and layout changes
    useEffect(() => {
        if (!activeTarget) return;

        let resizeDebounce = null;
        const handleResize = () => {
            updatePosition();
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(() => {
                if (targetElementRef.current) {
                    scrollToElement(targetElementRef.current, true);
                    runStabilizationLoop(600);
                }
            }, 140);
        };

        const handleScroll = () => {
            updatePosition();
        };

        const scrollContainer = document.querySelector(".dl-content");

        window.addEventListener("resize", handleResize, { passive: true });
        window.addEventListener("scroll", handleScroll, true);
        if (scrollContainer) {
            scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
        }

        // Detect dynamic content expansion (e.g. API tables above loading async data)
        // If content above grows and pushes the target element down, gently re-align scroll!
        const checkExpansion = () => {
            const el = targetElementRef.current;
            const scroll = document.querySelector(".dl-content");
            if (el && scroll) {
                const containerRect = scroll.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const relativeTop = elRect.top - containerRect.top;
                const isMobile = window.innerWidth < 768;
                const desiredOffset = isMobile ? 12 : 24;

                // If element has drifted > 50px away from the top viewing position due to async content above loading
                if (Math.abs(relativeTop - desiredOffset) > 50 && !scroll.matches(":active")) {
                    const targetScrollTop = scroll.scrollTop + relativeTop - desiredOffset;
                    scroll.scrollTo({
                        top: Math.max(0, targetScrollTop),
                        behavior: "smooth"
                    });
                    runStabilizationLoop(800);
                }
            }
        };

        // Check for content drift at 400ms, 850ms, 1400ms after selection
        const t1 = setTimeout(checkExpansion, 400);
        const t2 = setTimeout(checkExpansion, 850);
        const t3 = setTimeout(checkExpansion, 1400);

        // ResizeObserver on scrollContainer to adapt instantly if layout reflows
        let resizeObserver = null;
        try {
            resizeObserver = new ResizeObserver(() => {
                updatePosition();
            });
            if (scrollContainer) resizeObserver.observe(scrollContainer);
            if (targetElementRef.current) resizeObserver.observe(targetElementRef.current);
        } catch {}

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleScroll, true);
            if (scrollContainer) {
                scrollContainer.removeEventListener("scroll", handleScroll);
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(resizeDebounce);
        };
    }, [activeTarget, updatePosition, runStabilizationLoop, scrollToElement]);

    // Guided Search / Module Tour Context (smart fallback ensures every section has a related tour)
    const tourContext = useMemo(() => {
        if (activeTarget?.tourContext && Array.isArray(activeTarget.tourContext.results) && activeTarget.tourContext.results.length > 1) {
            return activeTarget.tourContext;
        }
        if (!activeTarget) return null;
        // Smart fallback: automatically construct module/category tour
        const moduleResults = SPOTLIGHT_REGISTRY.filter(
            item => (item.module && item.module === activeTarget.module) ||
                    (item.parentMenu && item.parentMenu === activeTarget.parentMenu)
        );
        if (moduleResults.length > 1) {
            const currIdx = moduleResults.findIndex(r => r.id === activeTarget.id);
            return {
                query: activeTarget.module || activeTarget.categoryLabel || "Related Features",
                results: moduleResults,
                currentIndex: currIdx >= 0 ? currIdx : 0
            };
        }
        return null;
    }, [activeTarget]);

    const isTourActive = !!(tourContext && Array.isArray(tourContext.results) && tourContext.results.length > 1);
    const tourResults = isTourActive ? tourContext.results : [];
    const tourTotal = tourResults.length;
    const tourIndex = isTourActive ? (tourContext.currentIndex ?? 0) : 0;
    const hasPrev = isTourActive && tourIndex > 0;
    const isLastTourStep = isTourActive && tourIndex === tourTotal - 1;
    const nextItem = isTourActive ? tourResults[(tourIndex + 1) % tourTotal] : null;
    const prevItem = isTourActive ? tourResults[(tourIndex - 1 + tourTotal) % tourTotal] : null;

    const handleNext = useCallback(() => {
        if (!isTourActive || !nextItem || typeof onNavigateSection !== "function") return;
        const nextIndex = (tourIndex + 1) % tourTotal;
        const updatedTourContext = {
            ...tourContext,
            currentIndex: nextIndex
        };
        onNavigateSection(nextItem, updatedTourContext);
    }, [isTourActive, nextItem, tourIndex, tourTotal, tourContext, onNavigateSection]);

    const handlePrev = useCallback(() => {
        if (!isTourActive || !prevItem || typeof onNavigateSection !== "function") return;
        const prevIndex = (tourIndex - 1 + tourTotal) % tourTotal;
        const updatedTourContext = {
            ...tourContext,
            currentIndex: prevIndex
        };
        onNavigateSection(prevItem, updatedTourContext);
    }, [isTourActive, prevItem, tourIndex, tourTotal, tourContext, onNavigateSection]);

    // Keyboard navigation: ESC to dismiss, ArrowRight for next, ArrowLeft for prev
    useEffect(() => {
        if (!activeTarget) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onDismiss();
            } else if (isTourActive && e.key === "ArrowRight") {
                if (!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
                    e.preventDefault();
                    handleNext();
                }
            } else if (isTourActive && e.key === "ArrowLeft") {
                if (!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
                    e.preventDefault();
                    handlePrev();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTarget, isTourActive, handleNext, handlePrev, onDismiss]);

    const handleCopyLink = () => {
        if (!activeTarget) return;
        const url = `${window.location.origin}${window.location.pathname}?spotlight=${activeTarget.id}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!activeTarget || !targetRect) return null;

    const IconComponent = ICON_MAP[activeTarget.iconName] || Compass;

    return (
        <div className="sbeacon-layer" role="complementary" aria-label="Spotlight Guide Tour Beacon">
            {/* Transparent click-catcher to dismiss when clicking anywhere outside */}
            <div className="sbeacon-dimmer" onClick={onDismiss} />

            {/* Target Luminous Focus Ring & Glow Frame with Crystal-Clear Cutout */}
            <div
                className="sbeacon-focus-frame"
                style={{
                    top: `${targetRect.top}px`,
                    left: `${targetRect.left}px`,
                    width: `${targetRect.width}px`,
                    height: `${targetRect.height}px`,
                    borderColor: activeTarget.color || "#2563eb",
                    boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.48), 0 0 0 4px rgba(37, 99, 235, 0.25), 0 0 35px ${activeTarget.color || "#2563eb"}40`
                }}
            >
                <div className="sbeacon-pulse-beacon" style={{ background: activeTarget.color || "#2563eb" }}>
                    <span className="sbeacon-pulse-ring" style={{ borderColor: activeTarget.color || "#2563eb" }} />
                </div>
            </div>

            {/* Floating / Docked Glassmorphic Guide Beacon Card */}
            <div
                className={`sbeacon-card sbeacon-card--${beaconPos.placement}`}
                style={beaconPos.placement === "docked" ? {
                    borderColor: `${activeTarget.color || "#2563eb"}40`
                } : {
                    top: `${beaconPos.top}px`,
                    left: `${beaconPos.left}px`,
                    borderColor: `${activeTarget.color || "#2563eb"}40`
                }}
            >
                <div className="sbeacon-card-topbar" style={{ background: `${activeTarget.color || "#2563eb"}10` }}>
                    <div className="sbeacon-card-breadcrumbs">
                        {isTourActive ? (
                            <div className="sbeacon-tour-badge" style={{ borderColor: `${activeTarget.color || "#2563eb"}35` }}>
                                <span className="sbeacon-tour-icon">🔍</span>
                                <span className="sbeacon-tour-query">"{tourContext.query}"</span>
                                <span className="sbeacon-tour-sep">•</span>
                                <span className="sbeacon-tour-step" style={{ color: activeTarget.color || "#2563eb" }}>
                                    {tourIndex + 1} of {tourTotal}
                                </span>
                            </div>
                        ) : (
                            <>
                                <span className="sbeacon-card-crumb">{activeTarget.parentMenu}</span>
                                <span className="sbeacon-card-crumb-sep">›</span>
                                <span className="sbeacon-card-crumb-active" style={{ color: activeTarget.color || "#2563eb" }}>
                                    {activeTarget.module}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="sbeacon-card-top-actions">
                        <span className="sbeacon-card-tag" style={{ color: activeTarget.color || "#2563eb", background: `${activeTarget.color || "#2563eb"}15` }}>
                            {activeTarget.categoryLabel}
                        </span>
                        <button
                            type="button"
                            className="sbeacon-card-close-btn"
                            onClick={onDismiss}
                            title="Dismiss Spotlight (Esc)"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <div className="sbeacon-card-body">
                    <div className="sbeacon-card-header">
                        <div
                            className="sbeacon-card-icon"
                            style={{
                                background: `${activeTarget.color || "#2563eb"}15`,
                                color: activeTarget.color || "#2563eb"
                            }}
                        >
                            <IconComponent size={18} />
                        </div>
                        <div className="sbeacon-card-title-group">
                            <div className="sbeacon-card-title-row">
                                <h3 className="sbeacon-card-title">{activeTarget.title}</h3>
                                {activeTarget.badge && activeTarget.badge.toLowerCase() !== (activeTarget.categoryLabel || "").toLowerCase() && (
                                    <span className="sbeacon-badge-chip" style={{ color: activeTarget.color || "#2563eb", borderColor: `${activeTarget.color || "#2563eb"}30` }}>
                                        {activeTarget.badge}
                                    </span>
                                )}
                            </div>
                            <p className="sbeacon-card-desc">{activeTarget.description}</p>
                        </div>
                    </div>

                    {/* Key Actions Highlights */}
                    {activeTarget.keyActions && activeTarget.keyActions.length > 0 && (
                        <div className="sbeacon-card-actions">
                            <span className="sbeacon-card-actions-label">QUICK CAPABILITIES</span>
                            <div className="sbeacon-card-chips">
                                {activeTarget.keyActions.map((action, idx) => (
                                    <span key={idx} className="sbeacon-chip">
                                        <span className="sbeacon-chip-dot" style={{ background: activeTarget.color || "#2563eb" }} />
                                        {action}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* ── Tour Navigation Command Bar (Modern Responsive UI) ── */}
                {isTourActive ? (
                    <div className="sbeacon-tour-controller">
                        {/* Progress Header & Track */}
                        <div className="sbeacon-tour-progress-row">
                            <div className="sbeacon-tour-step-info">
                                <span className="sbeacon-tour-step-pill" style={{ color: activeTarget.color || "#2563eb", background: `${activeTarget.color || "#2563eb"}15` }}>
                                    Step {tourIndex + 1} of {tourTotal}
                                </span>
                                {nextItem && (
                                    <span className="sbeacon-tour-next-hint" title={`Next: ${nextItem.title}`}>
                                        Next: <strong className="sbeacon-tour-next-name">{nextItem.title}</strong>
                                    </span>
                                )}
                            </div>
                            <div className="sbeacon-tour-track">
                                <div
                                    className="sbeacon-tour-fill"
                                    style={{
                                        width: `${((tourIndex + 1) / tourTotal) * 100}%`,
                                        background: activeTarget.color || "#2563eb"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Navigation Actions Row: Prev and Next Related */}
                        <div className="sbeacon-tour-actions-row">
                            <button
                                type="button"
                                className="sbeacon-btn-tour sbeacon-btn-tour--prev"
                                onClick={handlePrev}
                                disabled={!hasPrev}
                                title={hasPrev ? `Previous related section (${tourIndex} of ${tourTotal})` : "At first matching section"}
                            >
                                <ChevronLeft size={16} className="sbeacon-arrow-icon sbeacon-arrow-icon--prev" />
                                <span>Previous</span>
                            </button>

                            <button
                                type="button"
                                className="sbeacon-btn-tour sbeacon-btn-tour--next"
                                onClick={handleNext}
                                style={{
                                    background: `linear-gradient(135deg, ${activeTarget.color || "#2563eb"} 0%, ${getDarkerColor(activeTarget.color)} 100%)`,
                                    boxShadow: `0 4px 16px ${activeTarget.color || "#2563eb"}45`
                                }}
                                title={isLastTourStep ? "Restart tour from first result" : `Jump to next: ${nextItem?.title || "section"}`}
                            >
                                <span className="sbeacon-tour-glow-shimmer" />
                                <span className="sbeacon-tour-next-text">
                                    {isLastTourStep ? "Restart Tour" : "Next Related"}
                                </span>
                                {isLastTourStep ? (
                                    <RotateCcw size={15} className="sbeacon-arrow-icon sbeacon-arrow-icon--rotate" />
                                ) : (
                                    <ArrowRight size={15} className="sbeacon-arrow-icon sbeacon-arrow-icon--next" />
                                )}
                            </button>
                        </div>

                        {/* Sub-utility Bar */}
                        <div className="sbeacon-tour-sub-bar">
                            <div className="sbeacon-tour-sub-left">
                                <button
                                    type="button"
                                    className={`sbeacon-sub-link ${copied ? "sbeacon-sub-link--copied" : ""}`}
                                    onClick={handleCopyLink}
                                    title="Copy shareable direct link to this section"
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                    <span>{copied ? "Copied" : "Copy Link"}</span>
                                </button>

                                {typeof onOpenSearch === "function" && (
                                    <button
                                        type="button"
                                        className="sbeacon-sub-link"
                                        onClick={() => {
                                            onDismiss();
                                            onOpenSearch(tourContext.query);
                                        }}
                                        title={`View all ${tourTotal} results for "${tourContext.query}"`}
                                    >
                                        <Sparkles size={12} />
                                        <span>All ({tourTotal})</span>
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="sbeacon-sub-link sbeacon-sub-link--exit"
                                onClick={onDismiss}
                                title="Close spotlight guide and remain on this section"
                            >
                                <span>Got It (Esc)</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="sbeacon-tour-controller">
                        <div className="sbeacon-tour-actions-row">
                            <button
                                type="button"
                                className="sbeacon-btn-tour sbeacon-btn-tour--next"
                                onClick={onDismiss}
                                style={{
                                    background: `linear-gradient(135deg, ${activeTarget.color || "#2563eb"} 0%, ${getDarkerColor(activeTarget.color)} 100%)`,
                                    boxShadow: `0 4px 16px ${activeTarget.color || "#2563eb"}45`,
                                    width: "100%"
                                }}
                                title="Close spotlight guide and remain on this section"
                            >
                                <span className="sbeacon-tour-glow-shimmer" />
                                <span className="sbeacon-tour-next-text">Got It (Esc)</span>
                                <Check size={15} className="sbeacon-arrow-icon" />
                            </button>
                        </div>
                        <div className="sbeacon-tour-sub-bar">
                            <button
                                type="button"
                                className={`sbeacon-sub-link ${copied ? "sbeacon-sub-link--copied" : ""}`}
                                onClick={handleCopyLink}
                                title="Copy shareable direct link to this section"
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copied ? "Copied" : "Copy Link"}</span>
                            </button>

                            {typeof onOpenSearch === "function" && (
                                <button
                                    type="button"
                                    className="sbeacon-sub-link"
                                    onClick={() => {
                                        onDismiss();
                                        onOpenSearch();
                                    }}
                                    title="Open spotlight guide"
                                >
                                    <Sparkles size={12} />
                                    <span>Explore More</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
