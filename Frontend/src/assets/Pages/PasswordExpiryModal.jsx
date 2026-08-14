import { useState } from "react";
import { ShieldAlert, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { resolveApiBase } from "../../apiBase";
import "./PasswordExpiryModal.css";

const API = resolveApiBase();

export default function PasswordExpiryModal({ user, onClose }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!currentPassword) return setError("Please enter your current password.");
        if (!newPassword) return setError("Please enter your new password.");
        if (newPassword.length < 6) return setError("New password must be at least 6 characters.");
        if (newPassword === currentPassword) return setError("New password cannot be the same as current password.");
        if (newPassword !== confirmPassword) return setError("Passwords do not match.");

        setBusy(true);
        try {
            const res = await fetch(`${API}/settings/change-password/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update password.");
            }

            // Success state
            setSuccess(true);
            
            // Update localStorage
            const localUser = JSON.parse(localStorage.getItem("user") || "{}");
            localUser.passwordExpired = false;
            localUser.passwordAgeDays = 0;
            localStorage.setItem("user", JSON.stringify(localUser));

            // Auto-close modal after delay
            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (err) {
            setError(err.message || "Failed to update password. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleRemindLater = () => {
        // Update user storage so it won't prompt again in this session
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        localUser.passwordExpired = false;
        localStorage.setItem("user", JSON.stringify(localUser));
        onClose();
    };

    return (
        <div className="pem-overlay">
            <div className="pem-card">
                <div className="pem-accent" />
                
                {success ? (
                    <div className="pem-success-container">
                        <div className="pem-success-badge">
                            <Check size={28} className="pem-check-icon" />
                        </div>
                        <h3 className="pem-title">Password Updated!</h3>
                        <p className="pem-subtitle">Your password has been changed successfully. Redirecting you to the dashboard...</p>
                    </div>
                ) : (
                    <>
                        <div className="pem-head">
                            <div className="pem-icon-wrap">
                                <ShieldAlert size={22} className="pem-shield-icon" />
                            </div>
                            <div>
                                <h3 className="pem-title">Security Recommendation</h3>
                                <p className="pem-subtitle">
                                    Your password hasn't been changed in <strong>{user?.passwordAgeDays || 60} days</strong>.
                                    We recommend updating it to keep your account secure.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="pem-error-alert">
                                <X size={14} className="pem-error-close" onClick={() => setError("")} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="pem-form">
                            <div className="pem-field">
                                <label className="pem-label">Current Password</label>
                                <div className="pem-input-wrapper">
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        className="pem-input"
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        disabled={busy}
                                    />
                                    <button
                                        type="button"
                                        className="pem-toggle-btn"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        disabled={busy}
                                    >
                                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pem-field">
                                <label className="pem-label">New Password</label>
                                <div className="pem-input-wrapper">
                                    <input
                                        type={showNew ? "text" : "password"}
                                        className="pem-input"
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        disabled={busy}
                                    />
                                    <button
                                        type="button"
                                        className="pem-toggle-btn"
                                        onClick={() => setShowNew(!showNew)}
                                        disabled={busy}
                                    >
                                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pem-field">
                                <label className="pem-label">Confirm New Password</label>
                                <div className="pem-input-wrapper">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        className="pem-input"
                                        placeholder="Re-enter new password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        disabled={busy}
                                    />
                                    <button
                                        type="button"
                                        className="pem-toggle-btn"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        disabled={busy}
                                    >
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pem-foot">
                                <button
                                    type="button"
                                    className="pem-btn-sec"
                                    onClick={handleRemindLater}
                                    disabled={busy}
                                >
                                    Remind Me Later
                                </button>
                                <button
                                    type="submit"
                                    className="pem-btn-pri"
                                    disabled={busy}
                                >
                                    {busy ? (
                                        <>
                                            <Loader2 size={16} className="pem-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Change Password"
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
