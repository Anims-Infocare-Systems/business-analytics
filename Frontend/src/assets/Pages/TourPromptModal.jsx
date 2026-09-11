import { useEffect } from "react";
import "./TourPromptModal.css";
import { getVersionData, CURRENT_APP_VERSION } from "./versionToursData";
import { FiX, FiCheck, FiPlay, FiInfo } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";

export default function TourPromptModal({
    version = CURRENT_APP_VERSION,
    userName = "there",
    onStartTour,
    onDismiss
}) {
    const versionData = getVersionData(version);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && onDismiss) {
                onDismiss();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onDismiss]);

    return (
        <div className="tpm-overlay" role="dialog" aria-modal="true" aria-labelledby="tpm-title">
            <div className="tpm-card">
                <div className="tpm-card__glow-1" />
                <div className="tpm-card__glow-2" />

                <button
                    type="button"
                    className="tpm-close-btn"
                    onClick={onDismiss}
                    aria-label="Close modal"
                    title="Dismiss"
                >
                    <FiX size={18} />
                </button>

                <div className="tpm-header">
                    <div className="tpm-badge-row">
                        <span className="tpm-version-chip">
                            <HiSparkles size={14} className="tpm-sparkle-icon" />
                            {versionData.version} UPDATE
                        </span>
                    </div>

                    <h2 id="tpm-title" className="tpm-title">
                        Welcome to <span>Anims Business Analytics</span>
                    </h2>
                    <p className="tpm-desc">
                        Hi <strong>{userName}</strong>! We’ve introduced powerful new dashboard metrics, approval workflows, and productivity tools. Would you like a quick 1-minute interactive tour?
                    </p>
                </div>

                <div className="tpm-body">
                    <div className="tpm-section-label">
                        <HiSparkles size={14} style={{ color: "#38bdf8" }} />
                        What's New in {versionData.version}
                    </div>

                    <div className="tpm-highlights-grid">
                        {(versionData.highlights || []).map((highlight, idx) => (
                            <div key={idx} className="tpm-highlight-item">
                                <div className="tpm-highlight-icon">
                                    <FiCheck size={14} />
                                </div>
                                <span className="tpm-highlight-text">{highlight}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="tpm-footer">
                    <div className="tpm-actions">
                        <button
                            type="button"
                            className="tpm-btn-primary"
                            onClick={onStartTour}
                            autoFocus
                        >
                            <FiPlay size={15} style={{ marginLeft: "2px" }} />
                            <span>Start Interactive Tour</span>
                        </button>

                        <button
                            type="button"
                            className="tpm-btn-secondary"
                            onClick={onDismiss}
                        >
                            <span>Explore on My Own</span>
                        </button>
                    </div>

                    <div className="tpm-tip-hint">
                        <FiInfo size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                        <span>You can replay this tour or view tips anytime under <strong>Settings &gt; Tips</strong>.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
