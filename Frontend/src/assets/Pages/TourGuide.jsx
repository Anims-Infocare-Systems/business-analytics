import { useState, useEffect, useRef, useCallback } from "react";
import "./TourGuide.css";
import { getTourStepsForVersion, CURRENT_APP_VERSION } from "./versionToursData";
import {
    FiChevronRight,
    FiChevronLeft,
    FiCheck,
    FiArrowRight,
    FiShield,
    FiClock,
    FiZap,
    FiCheckCircle,
    FiSettings,
    FiTrendingUp,
    FiLayout,
    FiFileText,
    FiBarChart2,
    FiAlertCircle,
    FiCalendar,
    FiPackage,
    FiSliders,
    FiUserCheck,
    FiCpu,
    FiLayers
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

function renderStepIcon(iconName) {
    const key = (iconName || "").toLowerCase();
    if (key === "sparkles") return <HiSparkles className="tg-step-icon-svg tg-step-icon-svg--sparkles" />;
    if (key === "shield") return <FiShield className="tg-step-icon-svg" />;
    if (key === "clock") return <FiClock className="tg-step-icon-svg" />;
    if (key === "zap") return <FiZap className="tg-step-icon-svg" />;
    if (key === "checkcircle" || key === "check") return <FiCheckCircle className="tg-step-icon-svg" />;
    if (key === "settings") return <FiSettings className="tg-step-icon-svg" />;
    if (key === "trendingup") return <FiTrendingUp className="tg-step-icon-svg" />;
    if (key === "layoutdashboard" || key === "layout") return <FiLayout className="tg-step-icon-svg" />;
    if (key === "filespreadsheet" || key === "file") return <FiFileText className="tg-step-icon-svg" />;
    if (key === "barchart3" || key === "chart") return <FiBarChart2 className="tg-step-icon-svg" />;
    if (key === "shieldalert") return <FiAlertCircle className="tg-step-icon-svg" />;
    if (key === "calendar") return <FiCalendar className="tg-step-icon-svg" />;
    if (key === "package") return <FiPackage className="tg-step-icon-svg" />;
    if (key === "sliders" || key === "slidershorizontal" || key === "filter") return <FiSliders className="tg-step-icon-svg" />;
    if (key === "usercheck" || key === "operator") return <FiUserCheck className="tg-step-icon-svg" />;
    if (key === "cpu" || key === "machine") return <FiCpu className="tg-step-icon-svg" />;
    if (key === "layers" || key === "timeline") return <FiLayers className="tg-step-icon-svg" />;
    return <span className="tg-step-icon-emoji">✨</span>;
}

export default function TourGuide({
    isOpen,
    version = CURRENT_APP_VERSION,
    onClose,
    onComplete,
    onStepChange
}) {
    const steps = getTourStepsForVersion(version);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, placement: "bottom" });
    const [isCelebrating, setIsCelebrating] = useState(false);
    const retryTimersRef = useRef([]);
    const popoverRef = useRef(null);

    const currentStep = steps[currentStepIndex];

    // Notify parent on step change (to auto-open submenus or un-collapse sidebar)
    useEffect(() => {
        if (!isOpen || isCelebrating || !currentStep) return;
        if (typeof onStepChange === "function") {
            onStepChange(currentStep, currentStepIndex);
        }
    }, [currentStepIndex, isOpen, isCelebrating, currentStep, onStepChange]);

    // Helper: Check if element is genuinely rendered in DOM
    const isElementVisible = (el) => {
        if (!el) return false;
        try {
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") {
                return false;
            }
            return true;
        } catch {
            return false;
        }
    };

    // Measure target element position
    const updateTargetPosition = useCallback(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        let el = document.querySelector(currentStep.targetSelector);
        if (!isElementVisible(el) && currentStep.fallbackSelector) {
            el = document.querySelector(currentStep.fallbackSelector);
        }

        if (isElementVisible(el)) {
            let rect = el.getBoundingClientRect();

            // If target is currently scrolled off-screen, auto-scroll enclosing section into view immediately
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
                const contentContainer = document.querySelector(".dl-content");
                const enclosingCard = el.closest(".qa2-card, .qa2-timeline-container, .qa2-filter-card, .pa2-card, .pa2-fs-section, .apa-root, .sa-card") || el;
                if (contentContainer && enclosingCard) {
                    const cRect = contentContainer.getBoundingClientRect();
                    const eRect = enclosingCard.getBoundingClientRect();
                    const targetScrollTop = contentContainer.scrollTop + (eRect.top - cRect.top) - 16;
                    const finalScroll = Math.max(0, targetScrollTop);
                    contentContainer.scrollTop = finalScroll;
                    contentContainer.scrollTo({ top: finalScroll, behavior: "auto" });
                    rect = el.getBoundingClientRect();
                }
            }

            const padding = 6;
            const newRect = {
                top: Math.max(4, rect.top - padding),
                left: Math.max(4, rect.left - padding),
                width: Math.min(window.innerWidth - 8, rect.width + (padding * 2)),
                height: rect.height + (padding * 2)
            };
            setTargetRect(newRect);

            // Compute popover position
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                const targetMidY = newRect.top + (newRect.height / 2);
                const placeAtBottom = targetMidY < (window.innerHeight * 0.48);

                setPopoverPos({
                    top: null,
                    left: null,
                    placement: placeAtBottom ? "bottom" : "top",
                    isMobileDocked: true,
                    mobileDock: placeAtBottom ? "bottom" : "top"
                });
                return;
            }

            // Desktop positioning
            const hasSubItems = currentStep.subItems && currentStep.subItems.length > 0;
            const hasExpandable = Boolean(currentStep.isExpandable);

            // Measure actual rendered popover dimensions if mounted in DOM
            const popoverEl = popoverRef.current;
            const measuredHeight = popoverEl ? popoverEl.offsetHeight : 0;
            const measuredWidth = popoverEl ? popoverEl.offsetWidth : 0;

            // Realistic estimated dimensions before DOM measurement
            const estimatedHeight = 110
                + (currentStep.title ? 40 : 0)
                + (currentStep.description ? 70 : 0)
                + (hasExpandable ? 65 : 0)
                + (hasSubItems ? (currentStep.subItems.length * 60) : 0)
                + 65;

            const popoverHeight = Math.max(measuredHeight, estimatedHeight, 380);
            const popoverWidth = Math.min(window.innerWidth - 32, measuredWidth > 0 ? measuredWidth : (hasSubItems ? 400 : 360));
            const margin = 14;

            let top = 0;
            let left = 0;
            let placement = currentStep.placement || "bottom";

            // Calculate safe bounds considering the left sidebar
            const sidebarEl = document.querySelector(".dl-sidebar");
            const minAllowedLeft = sidebarEl && window.getComputedStyle(sidebarEl).position !== "fixed"
                ? Math.max(16, sidebarEl.getBoundingClientRect().right + 16)
                : 16;
            const maxAllowedLeft = Math.max(minAllowedLeft, window.innerWidth - popoverWidth - 16);

            if (window.innerWidth < 820) {
                if (placement === "right" || placement === "left") {
                    placement = "bottom";
                }
            }

            const spaceAbove = newRect.top - 16;
            const spaceBelow = window.innerHeight - (newRect.top + newRect.height) - 16;

            // Check if card takes up majority of screen height (tall sections)
            const isTallCard = newRect.height > (window.innerHeight * 0.55);

            // Smart horizontal alignment calculation
            const computeHorizontalLeft = () => {
                if (currentStep.align === "start") {
                    return Math.max(minAllowedLeft, Math.min(maxAllowedLeft, newRect.left));
                }
                if (currentStep.align === "right") {
                    return Math.max(minAllowedLeft, Math.min(maxAllowedLeft, newRect.left + newRect.width - popoverWidth));
                }
                return Math.max(minAllowedLeft, Math.min(maxAllowedLeft, newRect.left + (newRect.width / 2) - (popoverWidth / 2)));
            };

            if (isTallCard) {
                // When the target element is taller than 55% of the viewport:
                if (placement === "top" && spaceAbove >= popoverHeight + margin) {
                    top = newRect.top - popoverHeight - margin;
                    left = computeHorizontalLeft();
                } else if (spaceBelow >= popoverHeight + margin) {
                    top = newRect.top + newRect.height + margin;
                    left = computeHorizontalLeft();
                } else {
                    // Dock inside viewport cleanly near bottom, avoiding obstructing center data
                    top = window.innerHeight - popoverHeight - 24;
                    left = currentStep.align === "start"
                        ? Math.max(minAllowedLeft, Math.min(maxAllowedLeft, newRect.left + 16))
                        : Math.max(minAllowedLeft, Math.min(maxAllowedLeft, newRect.left + newRect.width - popoverWidth - 24));
                }
            } else if (placement === "bottom") {
                top = newRect.top + newRect.height + margin;
                left = computeHorizontalLeft();
                if (top + popoverHeight > window.innerHeight - 20) {
                    if (spaceAbove >= popoverHeight + margin) {
                        top = newRect.top - popoverHeight - margin;
                        placement = "top";
                    }
                }
            } else if (placement === "top") {
                top = newRect.top - popoverHeight - margin;
                left = computeHorizontalLeft();
                if (top < 16) {
                    if (spaceBelow >= popoverHeight + margin) {
                        top = newRect.top + newRect.height + margin;
                        placement = "bottom";
                    }
                }
            } else if (placement === "right") {
                top = newRect.top + (newRect.height / 2) - (popoverHeight / 2);
                left = newRect.left + newRect.width + margin;
                if (left + popoverWidth > window.innerWidth - 20) {
                    top = newRect.top + newRect.height + margin;
                    left = computeHorizontalLeft();
                    placement = "bottom";
                }
            } else if (placement === "left") {
                top = newRect.top + (newRect.height / 2) - (popoverHeight / 2);
                left = newRect.left - popoverWidth - margin;
                if (left < minAllowedLeft) {
                    top = newRect.top + newRect.height + margin;
                    left = computeHorizontalLeft();
                    placement = "bottom";
                }
            }

            // CRITICAL: Clamping ensures that popover NEVER exceeds viewport boundaries:
            left = Math.max(minAllowedLeft, Math.min(maxAllowedLeft, left));
            top = Math.max(16, Math.min(window.innerHeight - popoverHeight - 24, top));

            setPopoverPos({ top, left, placement, isMobileDocked: false });
            return;
        }

        // Target not found on screen
        setTargetRect(null);
        setPopoverPos({ top: 0, left: 0, placement: "bottom", isMobileDocked: false });
    }, [isOpen, isCelebrating, currentStep]);

    // Smart scroll & spotlight positioning
    const attemptScrollAndPosition = useCallback(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        // 1. In-card tab switching (e.g. PO Fulfillment vs Futuristic Schedule)
        if (currentStep.tabAction === "standard") {
            const stdBtn = document.querySelector("[data-spotlight='pa-po-fulfillment-btn'], .pa2-fs-main-tab-btn:not(.pa2-fs-main-tab-btn--futuristic)");
            if (stdBtn && !stdBtn.classList.contains("active")) {
                stdBtn.click();
            }
        } else if (currentStep.tabAction === "futuristic") {
            const futBtn = document.querySelector("[data-spotlight='pa-futuristic-schedule-btn'], .pa2-fs-main-tab-btn--futuristic");
            if (futBtn && !futBtn.classList.contains("active")) {
                futBtn.click();
            }
        }

        let el = document.querySelector(currentStep.targetSelector);
        if (!isElementVisible(el) && currentStep.fallbackSelector) {
            el = document.querySelector(currentStep.fallbackSelector);
        }

        if (el) {
            // Smart scroll: position the section top neatly ~16px below the topbar in .dl-content
            const contentContainer = document.querySelector(".dl-content");
            const enclosingCard = el.closest(".qa2-card, .qa2-timeline-container, .qa2-filter-card, .pa2-card, .pa2-fs-section, .apa-root, .sa-card") || el;

            if (contentContainer && enclosingCard) {
                const containerRect = contentContainer.getBoundingClientRect();
                const cardRect = enclosingCard.getBoundingClientRect();
                const relativeTop = cardRect.top - containerRect.top;

                // If section is not already aligned ~16px below topbar, perform instant scroll
                if (Math.abs(relativeTop - 16) > 20) {
                    const targetScrollTop = contentContainer.scrollTop + relativeTop - 16;
                    const finalScroll = Math.max(0, targetScrollTop);
                    contentContainer.scrollTop = finalScroll;
                    contentContainer.scrollTo({
                        top: finalScroll,
                        behavior: "auto"
                    });
                }
            } else {
                try {
                    (enclosingCard || el).scrollIntoView({ behavior: "auto", block: "start" });
                } catch {
                    /* fallback */
                }
            }
        }

        updateTargetPosition();
    }, [isOpen, isCelebrating, currentStep, updateTargetPosition]);

    // Handle step change & scroll target into view
    useEffect(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        attemptScrollAndPosition();

        // Clear any prior timers
        retryTimersRef.current.forEach(clearTimeout);
        retryTimersRef.current = [];

        // Staggered checks to accommodate route transitions, table loading, CSS animations & mobile drawer
        [80, 180, 320, 520, 850, 1200, 1800, 2600].forEach(delay => {
            const t = setTimeout(attemptScrollAndPosition, delay);
            retryTimersRef.current.push(t);
        });

        return () => {
            retryTimersRef.current.forEach(clearTimeout);
            retryTimersRef.current = [];
        };
    }, [currentStepIndex, isOpen, isCelebrating, currentStep, attemptScrollAndPosition]);

    // Auto-adjust scroll & spotlight whenever content size changes (e.g. API data load, chart rendering)
    useEffect(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        const contentContainer = document.querySelector(".dl-content");
        if (!contentContainer || typeof ResizeObserver === "undefined") return;

        let frameId;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                attemptScrollAndPosition();
            });
        });

        ro.observe(contentContainer);
        return () => {
            cancelAnimationFrame(frameId);
            ro.disconnect();
        };
    }, [isOpen, isCelebrating, currentStepIndex, attemptScrollAndPosition]);

    // Listen to resize and scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleUpdate = () => {
            updateTargetPosition();
        };

        window.addEventListener("resize", handleUpdate);
        window.addEventListener("scroll", handleUpdate, true);
        return () => {
            window.removeEventListener("resize", handleUpdate);
            window.removeEventListener("scroll", handleUpdate, true);
        };
    }, [isOpen, updateTargetPosition]);

    // Prevent background scrolling while tour is active
    useEffect(() => {
        if (!isOpen) return;

        const preventScroll = (e) => {
            if (e.target && e.target.closest && e.target.closest(".tg-popover, .tg-celebration-card")) {
                return;
            }
            e.preventDefault();
        };

        window.addEventListener("wheel", preventScroll, { passive: false });
        window.addEventListener("touchmove", preventScroll, { passive: false });
        return () => {
            window.removeEventListener("wheel", preventScroll);
            window.removeEventListener("touchmove", preventScroll);
        };
    }, [isOpen]);

    // Keyboard navigation & focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleNext();
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                handleBack();
            } else if (e.key === "Tab") {
                const container = document.querySelector(".tg-celebration-card") || document.querySelector(".tg-popover");
                if (container) {
                    const focusables = Array.from(
                        container.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
                    ).filter(el => el.offsetParent !== null);
                    if (focusables.length > 0) {
                        const first = focusables[0];
                        const last = focusables[focusables.length - 1];
                        if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(i => i + 1);
        } else {
            setIsCelebrating(true);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(i => i - 1);
        }
    };

    const handleClose = () => {
        setCurrentStepIndex(0);
        setIsCelebrating(false);
        if (onClose) onClose();
    };

    const handleFinishCelebration = () => {
        setCurrentStepIndex(0);
        setIsCelebrating(false);
        if (onComplete) onComplete();
    };

    if (!isOpen) return null;

    // Progress percentage
    const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

    return (
        <div
            className="tg-portal"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            {/* ── Spotlight Cutout or Backdrop ── */}
            {targetRect && !isCelebrating ? (
                <div
                    className="tg-spotlight"
                    style={{
                        top: `${targetRect.top}px`,
                        left: `${targetRect.left}px`,
                        width: `${targetRect.width}px`,
                        height: `${targetRect.height}px`,
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                />
            ) : (
                <div
                    className="tg-backdrop-fallback"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                />
            )}

            {/* ── Popover Tooltip ── */}
            {!isCelebrating && currentStep && (
                <div
                    ref={popoverRef}
                    className={[
                        "tg-popover",
                        !targetRect ? "tg-popover--centered" : "",
                        popoverPos.isMobileDocked
                            ? (popoverPos.mobileDock === "top" ? "tg-popover--mobile-top" : "tg-popover--mobile-bottom")
                            : ""
                    ].filter(Boolean).join(" ")}
                    style={targetRect && !popoverPos.isMobileDocked ? { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` } : {}}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="tg-progress-track">
                        <div className="tg-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <div className="tg-popover__header">
                        <div className="tg-popover__badge-cluster">
                            <span className={`tg-step-badge ${currentStep.id === "spotlight-guide" ? "tg-step-badge--spotlight" : ""}`}>
                                {currentStep.id === "spotlight-guide" && <span className="tg-pulse-dot" />}
                                {currentStep.badge || `STEP ${currentStepIndex + 1} OF ${steps.length}`}
                            </span>
                            {currentStep.kbdShortcut && (
                                <span className="tg-kbd-pill">
                                    <kbd>{currentStep.kbdShortcut}</kbd>
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            className="tg-skip-btn"
                            onClick={handleClose}
                            title="Skip Tour"
                        >
                            Skip Tour
                        </button>
                    </div>

                    <div className="tg-popover__body">
                        <h3 className="tg-step-title">
                            <span className="tg-step-icon">{renderStepIcon(currentStep.iconName)}</span>
                            <span>{currentStep.title}</span>
                        </h3>
                        <p className="tg-step-desc">
                            {currentStep.description}
                        </p>

                        {currentStep.id === "spotlight-guide" && (
                            <div className="tg-spotlight-tip-banner">
                                <HiSparkles size={15} className="tg-spotlight-sparkle-anim" />
                                <span>Shortcut: Press <kbd className="tg-mini-kbd">Ctrl</kbd> + <kbd className="tg-mini-kbd">K</kbd> anywhere across the app to search instantly</span>
                            </div>
                        )}

                        {currentStep.isExpandable && (
                            <div className="tg-expandable-tip-banner">
                                <span className="tg-expand-icon-wrap">⤢</span>
                                <span>
                                    <strong>Expandable View:</strong> Click the <strong>Maximize icon (⤢)</strong> on the top-right of the card to expand this table into a wide full-width workspace.
                                </span>
                            </div>
                        )}

                        {currentStep.tabAction && (
                            <div className="tg-tabmode-tip-banner">
                                <span className="tg-tabmode-icon-wrap">
                                    {currentStep.tabAction === "futuristic" ? "✨" : "📅"}
                                </span>
                                <span>
                                    <strong>{currentStep.tabAction === "futuristic" ? "Futuristic AI Schedule Mode:" : "PO Fulfillment Schedule Mode:"}</strong>{" "}
                                    {currentStep.tabDesc || (currentStep.tabAction === "futuristic"
                                        ? "Switched to predictive reorder timeline and safety buffer runout forecast."
                                        : "Switched to committed supplier PO fulfillment lots and delivery progress.")}
                                </span>
                            </div>
                        )}

                        {currentStep.subItems && currentStep.subItems.length > 0 && (
                            <div className="tg-subitems-grid">
                                {currentStep.subItems.map((sub, sIdx) => (
                                    <div key={sIdx} className="tg-subitem-row">
                                        <div className="tg-subitem-bullet">▸</div>
                                        <div className="tg-subitem-content">
                                            <span className="tg-subitem-title">{sub.title}</span>
                                            <span className="tg-subitem-desc">{sub.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="tg-popover__footer">
                        <div className="tg-dots">
                            {steps.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`tg-dot ${idx === currentStepIndex ? "tg-dot--active" : ""}`}
                                />
                            ))}
                        </div>

                        <div className="tg-nav-btns">
                            <button
                                type="button"
                                className="tg-btn-back"
                                onClick={handleBack}
                                disabled={currentStepIndex === 0}
                            >
                                Back
                            </button>

                            <button
                                type="button"
                                className="tg-btn-next"
                                onClick={handleNext}
                                autoFocus
                            >
                                <span>{currentStepIndex === steps.length - 1 ? "Finish" : "Next"}</span>
                                {currentStepIndex === steps.length - 1 ? (
                                    <FiCheck size={14} />
                                ) : (
                                    <FiChevronRight size={15} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Celebration Finish Modal ── */}
            {isCelebrating && (
                <div className="tg-celebration-card" role="dialog" aria-modal="true">
                    <div className="tg-celebration-icon-wrap">
                        🎉
                    </div>
                    <h2 className="tg-celebration-title">You're All Set!</h2>
                    <p className="tg-celebration-desc">
                        You have completed the <strong>{version}</strong> product tour. You can discover in-depth feature guides, pro tips, and shortcuts anytime from <strong>Settings &gt; Tips</strong>.
                    </p>
                    <button
                        type="button"
                        className="tg-celebration-btn"
                        onClick={handleFinishCelebration}
                        autoFocus
                    >
                        Start Exploring Workspace
                    </button>
                </div>
            )}
        </div>
    );
}
