import { useState, useEffect, useRef, useCallback } from "react";
import "./TourGuide.css";
import { getTourStepsForVersion, CURRENT_APP_VERSION } from "./versionToursData";
import { FiChevronRight, FiChevronLeft, FiCheck, FiArrowRight } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

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

    const currentStep = steps[currentStepIndex];

    // Notify parent on step change (to auto-open submenus or un-collapse sidebar)
    useEffect(() => {
        if (!isOpen || isCelebrating || !currentStep) return;
        if (typeof onStepChange === "function") {
            onStepChange(currentStep, currentStepIndex);
        }
    }, [currentStepIndex, isOpen, isCelebrating, currentStep, onStepChange]);

    // Measure target element position
    const updateTargetPosition = useCallback(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        let el = document.querySelector(currentStep.targetSelector);
        if (!el && currentStep.fallbackSelector) {
            el = document.querySelector(currentStep.fallbackSelector);
        }

        if (el) {
            const rect = el.getBoundingClientRect();
            // Check if element is actually visible with non-zero dimensions
            if (rect.width > 0 && rect.height > 0) {
                const padding = 6;
                const newRect = {
                    top: Math.max(4, rect.top - padding),
                    left: Math.max(4, rect.left - padding),
                    width: rect.width + (padding * 2),
                    height: rect.height + (padding * 2)
                };
                setTargetRect(newRect);

                // Compute popover position
                const isMobile = window.innerWidth <= 768;
                const hasSubItems = currentStep.subItems && currentStep.subItems.length > 0;
                const popoverWidth = Math.min(window.innerWidth - 24, hasSubItems ? 400 : 360);
                const popoverHeight = hasSubItems ? 280 : 220;
                const margin = 14;

                let top = 0;
                let left = 0;
                let placement = currentStep.placement || "bottom";

                // On mobile or narrow widths (<820px), avoid right placement that overflows
                if (isMobile || window.innerWidth < 820) {
                    if (placement === "right" || placement === "left") {
                        placement = "bottom";
                    }
                }

                if (placement === "bottom") {
                    top = newRect.top + newRect.height + margin;
                    left = newRect.left + (newRect.width / 2) - (popoverWidth / 2);
                    // If bottom overflows viewport, flip to top
                    if (top + popoverHeight > window.innerHeight - 20) {
                        top = Math.max(16, newRect.top - popoverHeight - margin);
                        placement = "top";
                    }
                } else if (placement === "top") {
                    top = newRect.top - popoverHeight - margin;
                    left = newRect.left + (newRect.width / 2) - (popoverWidth / 2);
                    if (top < 16) {
                        top = newRect.top + newRect.height + margin;
                        placement = "bottom";
                    }
                } else if (placement === "right") {
                    top = newRect.top + (newRect.height / 2) - (popoverHeight / 2);
                    left = newRect.left + newRect.width + margin;
                    if (left + popoverWidth > window.innerWidth - 20) {
                        top = newRect.top + newRect.height + margin;
                        left = newRect.left + (newRect.width / 2) - (popoverWidth / 2);
                        placement = "bottom";
                    }
                } else if (placement === "left") {
                    top = newRect.top + (newRect.height / 2) - (popoverHeight / 2);
                    left = newRect.left - popoverWidth - margin;
                    if (left < 16) {
                        top = newRect.top + newRect.height + margin;
                        left = newRect.left + (newRect.width / 2) - (popoverWidth / 2);
                        placement = "bottom";
                    }
                }

                // Keep inside horizontal viewport boundaries
                left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));
                top = Math.max(12, Math.min(window.innerHeight - popoverHeight - 12, top));

                setPopoverPos({ top, left, placement });
                return;
            }
        }

        // Target not found on screen
        setTargetRect(null);
    }, [isOpen, isCelebrating, currentStep]);

    // Handle step change & scroll target into view
    useEffect(() => {
        if (!isOpen || isCelebrating || !currentStep) return;

        let el = document.querySelector(currentStep.targetSelector);
        if (!el && currentStep.fallbackSelector) {
            el = document.querySelector(currentStep.fallbackSelector);
        }

        if (el) {
            try {
                el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            } catch {
                /* fallback */
            }
        }

        updateTargetPosition();

        // Clear any prior timers
        retryTimersRef.current.forEach(clearTimeout);
        retryTimersRef.current = [];

        // Staggered checks to accommodate CSS menu expand transitions
        [80, 180, 320].forEach(delay => {
            const t = setTimeout(updateTargetPosition, delay);
            retryTimersRef.current.push(t);
        });

        return () => {
            retryTimersRef.current.forEach(clearTimeout);
            retryTimersRef.current = [];
        };
    }, [currentStepIndex, isOpen, isCelebrating, currentStep, updateTargetPosition]);

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

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                handleClose();
            } else if (e.key === "ArrowRight") {
                handleNext();
            } else if (e.key === "ArrowLeft") {
                handleBack();
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
        <div className="tg-portal">
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
                />
            ) : (
                <div className="tg-backdrop-fallback" onClick={handleClose} />
            )}

            {/* ── Popover Tooltip ── */}
            {!isCelebrating && currentStep && (
                <div
                    className={`tg-popover ${!targetRect ? "tg-popover--centered" : ""}`}
                    style={targetRect ? { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` } : {}}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="tg-progress-track">
                        <div className="tg-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>

                    <div className="tg-popover__header">
                        <span className="tg-step-badge">
                            {currentStep.badge || `STEP ${currentStepIndex + 1} OF ${steps.length}`}
                        </span>
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
                            <span className="tg-step-icon">✨</span>
                            {currentStep.title}
                        </h3>
                        <p className="tg-step-desc">
                            {currentStep.description}
                        </p>

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
