import { useState, useEffect, useRef, useCallback } from "react";
import "./SpotlightBeacon.css";
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
    Compass
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

export default function SpotlightBeacon({
    activeTarget,
    onDismiss,
    onOpenSearch
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
        const cardWidth = Math.min(vw - 32, 420);
        const cardHeight = 250;
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

    // Keyboard ESC to dismiss
    useEffect(() => {
        if (!activeTarget) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onDismiss();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTarget, onDismiss]);

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
                        <span className="sbeacon-card-crumb">{activeTarget.parentMenu}</span>
                        <span className="sbeacon-card-crumb-sep">›</span>
                        <span className="sbeacon-card-crumb-active" style={{ color: activeTarget.color || "#2563eb" }}>
                            {activeTarget.module}
                        </span>
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
                                {activeTarget.badge && (
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

                <div className="sbeacon-card-footer">
                    <button
                        type="button"
                        className={`sbeacon-btn-link ${copied ? "sbeacon-btn-link--copied" : ""}`}
                        onClick={handleCopyLink}
                        title="Copy shareable direct link to this section"
                    >
                        {copied ? (
                            <>
                                <Check size={13} />
                                <span>Copied Link</span>
                            </>
                        ) : (
                            <>
                                <Copy size={13} />
                                <span>Copy Direct Link</span>
                            </>
                        )}
                    </button>

                    <div className="sbeacon-footer-right">
                        {typeof onOpenSearch === "function" && (
                            <button
                                type="button"
                                className="sbeacon-btn-ghost"
                                onClick={() => {
                                    onDismiss();
                                    onOpenSearch();
                                }}
                            >
                                <Sparkles size={13} style={{ marginRight: "4px" }} />
                                Search More
                            </button>
                        )}
                        <button
                            type="button"
                            className="sbeacon-btn-primary"
                            onClick={onDismiss}
                            style={{ background: activeTarget.color || "#2563eb" }}
                        >
                            <span>Got It</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
