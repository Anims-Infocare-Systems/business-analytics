import { useState, useEffect } from "react";
import "./Settings.css";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

/* ── Inline Icons for Settings ──────────────────────────────── */
const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    ),
    Account: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    Billing: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
    ),
    About: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    Key: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
    ),
    Download: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    Check: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    Lock: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    Branch: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
    ),
    Eye: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    EyeOff: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    )
};

export default function Settings({ isOpen, onClose, isExpiredMode = false }) {
    // ── Persist active tab across refresh ──
    const [activeTab, setActiveTab] = useState(() => {
        if (isExpiredMode) return "billing";
        try { return sessionStorage.getItem("ba_settings_tab") || "account"; }
        catch { return "account"; }
    });

    // Write tab to sessionStorage whenever it changes
    useEffect(() => {
        if (isExpiredMode) return;
        try { sessionStorage.setItem("ba_settings_tab", activeTab); } catch { }
    }, [activeTab, isExpiredMode]);

    useEffect(() => {
        if (isExpiredMode && isOpen) {
            setActiveTab("billing");
        }
    }, [isExpiredMode, isOpen]);

    const [isClosing, setIsClosing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeBusy, setUpgradeBusy] = useState(false);
    const [upgradeErr, setUpgradeErr] = useState("");
    const [upgradeOk, setUpgradeOk] = useState("");
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState("");
    const [confirmBillingCycle, setConfirmBillingCycle] = useState("yearly");
    const [enteredUsersCount, setEnteredUsersCount] = useState(1);

    const formatBillingDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
        } catch {
            return dateStr;
        }
    };

    const formatDateDMY = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getDate()).padStart(2, "0");
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    const handleCopyEmail = (text) => {
        // Fallback for non-secure origins (HTTP IP address)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                triggerToast();
            }).catch(err => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand("copy");
            triggerToast();
        } catch (err) {
            console.error("Fallback copy failed", err);
        }
        document.body.removeChild(textarea);
    };

    const triggerToast = () => {
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
            setCopied(false);
            setShowToast(false);
        }, 2200);
    };

    // Retrieve local storage user fallback
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [profile, setProfile] = useState(() => {
        try {
            const cached = localStorage.getItem("ba_settings_profile");
            if (cached) {
                const parsed = JSON.parse(cached);
                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                const cachedCompany = parsed?.profile?.companyCode;
                const currentCompany = currentUser.company_code || currentUser.companyCode;

                if (parsed?.profile?.username === currentUser.username && cachedCompany === currentCompany) {
                    return parsed;
                }
            }
            return null;
        } catch {
            return null;
        }
    });
    const [loadingProfile, setLoadingProfile] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Reset profile state if the cached user doesn't match the current logged-in user
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentCompany = currentUser.company_code || currentUser.companyCode;
        if (profile && (profile?.profile?.username !== currentUser.username ||
            profile?.profile?.companyCode !== currentCompany)) {
            setProfile(null);
        }

        setLoadingProfile(true);
        fetch(`${API}/settings/profile/`, { credentials: "include" })
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setProfile(data);
                try {
                    localStorage.setItem("ba_settings_profile", JSON.stringify(data));
                } catch (e) {
                    console.error("Failed to cache settings profile", e);
                }
            })
            .catch(err => {
                console.error("Failed to load profile details", err);
            })
            .finally(() => {
                setLoadingProfile(false);
            });
    }, [isOpen]);

    const username = profile?.profile?.username || user.username || "—";
    const userEmail = profile?.profile?.email || (loadingProfile && !profile ? "Loading email..." : "—");
    const userCompany = profile?.profile?.company || user.company || "—";
    const userRole = profile?.profile?.role || user.designation || user.role || "—";
    const isSuperadmin = String(userRole).toLowerCase() === "superadmin";
    const companyCode = profile?.profile?.companyCode || user.company_code || user.companyCode || "—";
    const accountStatus = profile?.profile?.status || (loadingProfile && !profile ? "Loading..." : "—");

    const planName = profile?.billing?.planName || (loadingProfile && !profile ? "Loading plan..." : "—");
    const planNameLower = String(planName).toLowerCase();
    const isFree = planNameLower === "free";
    const isPro = planNameLower === "pro";
    const isMax = planNameLower.includes("enterprise") || planNameLower === "max";
    const isRenewal = isExpiredMode && (
        (selectedPlan === "Free" && isFree) ||
        (selectedPlan === "Pro" && isPro) ||
        (selectedPlan === "Max" && isMax)
    );

    const nextRenewal = profile?.billing?.nextRenewal || (loadingProfile && !profile ? "Loading renewal date..." : "—");
    const activeUsers = profile?.billing?.activeUsers ?? 0;
    const maxUsers = profile?.billing?.maxUsers ?? 0;
    const storageUsed = profile?.billing?.storageUsed || "—";
    const storageLimit = profile?.billing?.storageLimit || "—";
    const exportsUsed = profile?.billing?.exportsUsed ?? 0;
    const exportsLimit = profile?.billing?.exportsLimit ?? 0;

    const invoices = profile?.invoices || [];

    // Password fields
    const [curPass, setCurPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confPass, setConfPass] = useState("");
    const [showCurPass, setShowCurPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfPass, setShowConfPass] = useState(false);
    const [pwdBusy, setPwdBusy] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState(false);
    const [pwdError, setPwdError] = useState("");

    // Closing animation coordinator
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300); // matches animation out duration
    };

    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") handleClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen]);

    // Active tab coordination: redirect normal users away from billing
    useEffect(() => {
        if (isExpiredMode) return;
        if (!profile && loadingProfile) return;
        if (!isSuperadmin && activeTab === "billing") {
            setActiveTab("account");
        }
    }, [userRole, profile, loadingProfile, activeTab, isSuperadmin, isExpiredMode]);

    useEffect(() => {
        if (showConfirmModal) {
            setEnteredUsersCount(activeUsers > 0 ? activeUsers : 1);
        }
    }, [showConfirmModal, activeUsers]);

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setPwdError("");
        setPwdSuccess(false);

        if (!curPass || !newPass || !confPass) {
            setPwdError("All password fields are required.");
            return;
        }

        if (newPass !== confPass) {
            setPwdError("New passwords do not match.");
            return;
        }

        if (newPass.length < 6) {
            setPwdError("New password must be at least 6 characters.");
            return;
        }

        setPwdBusy(true);
        try {
            const res = await fetch(`${API}/settings/change-password/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: curPass,
                    newPassword: newPass
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Update failed with status ${res.status}`);
            }
            setPwdSuccess(true);
            setCurPass("");
            setNewPass("");
            setConfPass("");
        } catch (err) {
            setPwdError(err.message || "Failed to update password.");
        } finally {
            setPwdBusy(false);
        }
    };

    const handleUpgradeSubmit = async (plan) => {
        setUpgradeErr("");
        setUpgradeOk("");
        setUpgradeBusy(true);
        try {
            const res = await fetch(`${API}/settings/upgrade-plan/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planName: plan, billingCycle: confirmBillingCycle, noOfUsers: enteredUsersCount })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Upgrade failed with status ${res.status}`);
            }
            setUpgradeOk(data.message || `Successfully upgraded to ${plan}!`);
            setShowConfirmModal(false);

            // Re-fetch profile to refresh settings state dynamically
            fetch(`${API}/settings/profile/`, { credentials: "include" })
                .then(r => r.ok && r.json())
                .then(d => {
                    if (d) {
                        setProfile(d);
                        try { localStorage.setItem("ba_settings_profile", JSON.stringify(d)); } catch { }
                    }
                })
                .catch(() => { });

            setTimeout(() => {
                setShowUpgradeModal(false);
                setUpgradeOk("");
                window.location.reload();
            }, 2000);
        } catch (err) {
            setUpgradeErr(err.message || "Failed to upgrade plan.");
        } finally {
            setUpgradeBusy(false);
        }
    };

    if (!isOpen && !isClosing) return null;

    const currentUsersCount = activeUsers > 0 ? activeUsers : 1;
    const confirmSubtotal = selectedPlan === "Free" ? 0 : (selectedPlan === "Pro" ? (enteredUsersCount * 500 * (confirmBillingCycle === "6month" ? 6 : 12)) : (enteredUsersCount * 2000 * (confirmBillingCycle === "6month" ? 6 : 12)));
    const confirmTax = 0;
    const confirmTotal = confirmSubtotal;
    const formatCurrency = (val) => {
        return "₹" + val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className={`st-overlay ${isClosing ? "st-overlay--fade-out" : "st-overlay--fade-in"}`}>
            <div className={`st-container ${isClosing ? "st-container--slide-down" : "st-container--slide-up"}`}>

                {/* ── Left Sidebar ─────────────────────────────────── */}
                {!isExpiredMode && (
                    <aside className="st-sidebar">
                        <div className="st-sidebar__header">
                            <button className="st-sidebar__back-btn" onClick={handleClose} aria-label="Back">
                                <Icons.Back />
                            </button>
                            <span className="st-sidebar__title">Settings</span>
                        </div>

                        <nav className="st-sidebar__nav">
                            <button
                                className={`st-sidebar__nav-item ${activeTab === "account" ? "st-sidebar__nav-item--active" : ""}`}
                                onClick={() => setActiveTab("account")}
                            >
                                <span className="st-sidebar__nav-icon"><Icons.Account /></span>
                                <span className="st-sidebar__nav-label">Account</span>
                            </button>
                            {isSuperadmin && (
                                <button
                                    className={`st-sidebar__nav-item ${activeTab === "billing" ? "st-sidebar__nav-item--active" : ""}`}
                                    onClick={() => setActiveTab("billing")}
                                >
                                    <span className="st-sidebar__nav-icon"><Icons.Billing /></span>
                                    <span className="st-sidebar__nav-label">Billing</span>
                                </button>
                            )}
                            <button
                                className={`st-sidebar__nav-item ${activeTab === "about" ? "st-sidebar__nav-item--active" : ""}`}
                                onClick={() => setActiveTab("about")}
                            >
                                <span className="st-sidebar__nav-icon"><Icons.About /></span>
                                <span className="st-sidebar__nav-label">About</span>
                            </button>
                        </nav>
                    </aside>
                )}

                {/* ── Right Content Area ───────────────────────────── */}
                <main className="st-content">
                    {isExpiredMode && (
                        <div className="st-expired-mode-header" style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <button className="st-sidebar__back-btn" onClick={handleClose} aria-label="Back">
                                    <Icons.Back />
                                </button>
                                <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>Billing & Plan Upgrade</span>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: ACCOUNT ── */}
                    {activeTab === "account" && (() => {
                        const _daysLeft = profile?.billing?.daysLeft ?? 0;
                        const _circ = 2 * Math.PI * 52;
                        const _fill = Math.round(_circ * Math.min(1, _daysLeft / 365));
                        return (
                            <div className="st-section st-acct-root">

                                {/* ── Hero Banner ── */}
                                <div className="st-acct-hero">
                                    <div className="st-acct-hero__particles" />
                                    <div className="st-acct-hero__left">
                                        <div className="st-acct-avatar-wrap">
                                            <div className="st-acct-avatar-ring" />
                                            <div className="st-acct-avatar-ring st-acct-avatar-ring--mask" />
                                            <div className="st-acct-avatar">{username.substring(0, 2).toUpperCase()}</div>
                                        </div>
                                        <div className="st-acct-hero__identity">
                                            <h2 className="st-acct-hero__name">{username}</h2>
                                            <div className="st-acct-hero__role-row">
                                                <span className="st-acct-hero__role-badge">{userRole}</span>
                                                <span className={`st-acct-hero__status-chip ${accountStatus === "Active" ? "st-acct-hero__status-chip--on" : ""}`}>
                                                    <span className="st-acct-hero__status-dot" />
                                                    {accountStatus}
                                                </span>
                                            </div>
                                            {profile?.profile?.signupDate && (
                                                <p className="st-acct-hero__onboard">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                    Member since {formatDateDMY(profile.profile.signupDate)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="st-acct-hero__right">
                                        <div className="st-acct-arc-wrap">
                                            <svg className="st-acct-arc-svg" viewBox="0 0 120 120">
                                                <defs>
                                                    <linearGradient id="acct-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#06b6d4" />
                                                        <stop offset="100%" stopColor="#2d6de8" />
                                                    </linearGradient>
                                                </defs>
                                                <circle className="st-acct-arc-track" cx="60" cy="60" r="52" />
                                                <circle
                                                    className="st-acct-arc-fill"
                                                    cx="60" cy="60" r="52"
                                                    strokeDasharray={`${_fill} ${_circ}`}
                                                    strokeDashoffset="0"
                                                />
                                            </svg>
                                            <div className="st-acct-arc-inner">
                                                <span className="st-acct-arc-count">{_daysLeft}</span>
                                                <span className="st-acct-arc-label">days left</span>
                                            </div>
                                        </div>
                                        <div className="st-acct-plan-meta">
                                            <span className="st-acct-plan-chip">ACTIVE PLAN</span>
                                            <h3 className="st-acct-plan-title">{planName}</h3>
                                            <p className="st-acct-plan-renew">
                                                {profile?.billing?.planEndDate
                                                    ? `Renews ${formatDateDMY(profile.billing.planEndDate)}`
                                                    : nextRenewal}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Glass Info Tiles ── */}
                                <div className="st-acct-tiles">
                                    {[
                                        { label: "Company", value: userCompany, d: "M3 21h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" },
                                        { label: "Company Code", value: companyCode, mono: true, d: "M6 3h12l4 6-10 13L2 9z" },
                                        { label: "System Role", value: userRole, d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                                        { label: "Onboarded", value: formatDateDMY(profile?.profile?.signupDate || ""), d: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
                                    ].map((f, i) => (
                                        <div key={i} className="st-acct-tile" style={{ "--td": `${i * 90}ms` }}>
                                            <div className="st-acct-tile__glow" />
                                            <div className="st-acct-tile__icon">
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d={f.d} />
                                                </svg>
                                            </div>
                                            <div className="st-acct-tile__body">
                                                <span className="st-acct-tile__label">{f.label}</span>
                                                <span className={`st-acct-tile__val${f.mono ? " st-acct-tile__val--mono" : ""}`}>{f.value || "—"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Frosted Password Panel ── */}
                                <div className="st-acct-pwd">
                                    <div className="st-acct-pwd__top-line" />
                                    <div className="st-acct-pwd__header">
                                        <div className="st-acct-pwd__header-icon">
                                            <Icons.Key />
                                        </div>
                                        <div>
                                            <h3 className="st-acct-pwd__title">Change Password</h3>
                                            <p className="st-acct-pwd__sub">Keep your account secure with a strong password</p>
                                        </div>
                                    </div>

                                    <form className="st-acct-pwd__form" onSubmit={handleSavePassword}>
                                        <div className="st-acct-pwd__row st-acct-pwd__row--single">
                                            <div className="st-acct-pwd__field">
                                                <label className="st-acct-pwd__label">Current Password</label>
                                                <div className="st-acct-pwd__iw">
                                                    <span className="st-acct-pwd__iicon"><Icons.Lock /></span>
                                                    <input
                                                        type={showCurPass ? "text" : "password"}
                                                        className="st-acct-pwd__input"
                                                        placeholder="Enter current password"
                                                        value={curPass}
                                                        onChange={(e) => setCurPass(e.target.value)}
                                                        autoComplete="current-password"
                                                    />
                                                    <button type="button" className="st-acct-eye" onClick={() => setShowCurPass(v => !v)} aria-label="Toggle">
                                                        <span className={`st-acct-eye__icon${showCurPass ? " st-acct-eye__icon--on" : ""}`}>
                                                            {showCurPass ? <Icons.EyeOff /> : <Icons.Eye />}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="st-acct-pwd__row">
                                            <div className="st-acct-pwd__field">
                                                <label className="st-acct-pwd__label">New Password</label>
                                                <div className="st-acct-pwd__iw">
                                                    <span className="st-acct-pwd__iicon"><Icons.Lock /></span>
                                                    <input
                                                        type={showNewPass ? "text" : "password"}
                                                        className="st-acct-pwd__input"
                                                        placeholder="Enter new password"
                                                        value={newPass}
                                                        onChange={(e) => setNewPass(e.target.value)}
                                                        autoComplete="new-password"
                                                    />
                                                    <button type="button" className="st-acct-eye" onClick={() => setShowNewPass(v => !v)} aria-label="Toggle">
                                                        <span className={`st-acct-eye__icon${showNewPass ? " st-acct-eye__icon--on" : ""}`}>
                                                            {showNewPass ? <Icons.EyeOff /> : <Icons.Eye />}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="st-acct-pwd__field">
                                                <label className="st-acct-pwd__label">Confirm New Password</label>
                                                <div className="st-acct-pwd__iw">
                                                    <span className="st-acct-pwd__iicon"><Icons.Lock /></span>
                                                    <input
                                                        type={showConfPass ? "text" : "password"}
                                                        className="st-acct-pwd__input"
                                                        placeholder="Confirm new password"
                                                        value={confPass}
                                                        onChange={(e) => setConfPass(e.target.value)}
                                                        autoComplete="new-password"
                                                    />
                                                    <button type="button" className="st-acct-eye" onClick={() => setShowConfPass(v => !v)} aria-label="Toggle">
                                                        <span className={`st-acct-eye__icon${showConfPass ? " st-acct-eye__icon--on" : ""}`}>
                                                            {showConfPass ? <Icons.EyeOff /> : <Icons.Eye />}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {pwdError && <div className="st-acct-pwd__msg st-acct-pwd__msg--err">{pwdError}</div>}
                                        {pwdSuccess && <div className="st-acct-pwd__msg st-acct-pwd__msg--ok">✓ Password updated successfully!</div>}

                                        <button type="submit" className="st-acct-pwd__submit" disabled={pwdBusy}>
                                            <span className="st-acct-pwd__submit-ripple" />
                                            <span className="st-acct-pwd__submit-icon"><Icons.Key /></span>
                                            <span>{pwdBusy ? "Saving…" : "Update Password"}</span>
                                        </button>
                                    </form>
                                </div>

                            </div>
                        );
                    })()}

                    {/* ── TAB: BILLING ── */}
                    {activeTab === "billing" && (
                        <div className="st-section anim-fade-in-quick">
                            <h2 className="st-section__title">Billing & Subscriptions</h2>
                            <p className="st-section__desc">View your plan status, monitor usage quotas, and manage invoices.</p>

                            {/* Plan Card */}
                            <div className="st-billing-banner">
                                <div className="st-billing-banner__glow" />
                                <div className="st-billing-banner__content">
                                    <div className="st-billing-banner__left">
                                        <span className="st-billing-banner__badge">CURRENT PLAN</span>
                                        <h3 className="st-billing-banner__plan">{(!profile && loadingProfile) ? "Loading plan..." : planName}</h3>
                                        <p className="st-billing-banner__expiry">{(!profile && loadingProfile) ? "" : nextRenewal}</p>
                                        {profile?.billing?.planStartDate && (
                                            <p className="st-billing-banner__dates" style={{ fontSize: "11px", opacity: 0.85, marginTop: "4px", fontWeight: "500" }}>
                                                Active Period: {formatBillingDate(profile.billing.planStartDate)} – {formatBillingDate(profile.billing.planEndDate)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="st-billing-banner__right">
                                        <button className="st-billing-banner__upgrade-btn" onClick={() => setShowUpgradeModal(true)}>
                                            <span>Upgrade Plan</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12 5 19 12 12 19" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Resource Quotas */}
                            <h3 className="st-subheading">Resource Usage</h3>
                            <div className="st-quotas">
                                <div className="st-quota-card">
                                    <div className="st-quota-card__header">
                                        <span className="st-quota-card__label">Active Users</span>
                                        <span className="st-quota-card__value">{(!profile && loadingProfile) ? "…" : `${activeUsers} / ${maxUsers}`}</span>
                                    </div>
                                    <div className="st-quota-card__bar-bg">
                                        <div className="st-quota-card__bar-fill" style={{ width: `${maxUsers ? Math.min(100, (activeUsers / maxUsers) * 100) : 0}%` }} />
                                    </div>
                                </div>
                                <div className="st-quota-card">
                                    <div className="st-quota-card__header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                                        <span className="st-quota-card__label">Company Name</span>
                                        <span className="st-quota-card__value" style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{userCompany}</span>
                                    </div>
                                </div>
                                <div className="st-quota-card">
                                    <div className="st-quota-card__header" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                                        <span className="st-quota-card__label">Company Code</span>
                                        <span className="st-quota-card__value" style={{ fontSize: "14px", fontWeight: "700", color: "#2d6de8", fontFamily: "monospace" }}>{companyCode}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="st-divider" />

                            {/* Invoices List */}
                            <h3 className="st-subheading">Invoices History</h3>
                            <div className="st-invoices-wrapper">
                                <table className="st-invoices-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice Date</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!profile && loadingProfile) ? (
                                            <tr>
                                                <td colSpan="5" className="text-center" style={{ padding: "1.5rem", color: "#94a3b8" }}>
                                                    Loading invoices...
                                                </td>
                                            </tr>
                                        ) : invoices.length > 0 ? (
                                            invoices.map((inv, idx) => (
                                                <tr key={idx}>
                                                    <td>{inv.date}</td>
                                                    <td>{inv.description}</td>
                                                    <td>{inv.amount}</td>
                                                    <td><span className="st-invoice-badge st-invoice-badge--paid">{inv.status}</span></td>
                                                    <td className="text-right">
                                                        <button className="st-invoice-dl" title="Download Invoice">
                                                            <Icons.Download />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="text-center" style={{ padding: "1.5rem", color: "#94a3b8" }}>
                                                    No invoice history found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: ABOUT ── */}
                    {activeTab === "about" && (
                        <div className="st-section anim-fade-in-quick st-about-tab">
                            <h2 className="st-section__title">About</h2>
                            <p className="st-section__desc">Learn more about the platform, version updates, and the company behind it.</p>

                            <div className="st-about-grid">
                                {/* Left Side: Text and Contact */}
                                <div className="st-about-main">
                                    <div className="st-about-block anim-slide-up-staggered">
                                        <h3 className="st-about-subheading">About Anims</h3>
                                        <p className="st-about-text">
                                            Anims is a leading Technology firm specializing in innovative software development and IT consulting services. Founded in 2009, Anims has consistently Delivered cutting-edge solutions to clients across various industries, including Engineering, foundry, and retail.
                                        </p>
                                        <p className="st-about-text">
                                            Our company specializes in the development of Enterprise Resource Planning (ERP) software, designed to streamline and optimize the myriad processes within an organization. Our team of expert developers and consultants are dedicated to providing high quality, customized solutions that drive business growth and efficiency. With a commitment to excellence and customer satisfaction, Anims Infocare systems continues to be at the forefront of technological advancements, helping businesses navigate the complexities of the digital age.
                                        </p>
                                    </div>

                                    <div className="st-about-block anim-slide-up-staggered">
                                        <h3 className="st-about-subheading">Feedback & Support</h3>
                                        <div
                                            className={`st-email-card ${copied ? "st-email-card--copied" : ""}`}
                                            onClick={() => handleCopyEmail("teamweb@animse.com")}
                                            title="Click to copy email address"
                                        >
                                            <div className="st-email-card__icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>
                                            </div>
                                            <div className="st-email-card__content">
                                                <span className="st-email-card__label">Email Support</span>
                                                <span className="st-email-card__value">teamweb@animse.com</span>
                                            </div>
                                            <div className="st-email-card__copy-badge">
                                                {copied ? "Copied!" : "Copy"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Logo & System Stats */}
                                <div className="st-about-sidebar anim-slide-up-staggered">
                                    <div className="st-stats-widget">
                                        <div className="st-stats-widget__logo-container">
                                            <div className="st-stats-widget__glow" />
                                            <img src="/Images/logo.png" alt="Anims ERP Logo" className="st-stats-widget__logo" />
                                        </div>

                                        <h4 className="st-stats-widget__title">System Information</h4>
                                        <div className="st-stats-list">
                                            <div className="st-stats-row">
                                                <span>Software Version</span>
                                                <strong>v2.4.0 (Stable)</strong>
                                            </div>
                                            <div className="st-stats-row">
                                                <span>Build Number</span>
                                                <strong>#2026.06.02-release</strong>
                                            </div>
                                            <div className="st-stats-row">
                                                <span>Environment</span>
                                                <strong>Production (Cloud)</strong>
                                            </div>
                                            <div className="st-stats-row">
                                                <span>Platform</span>
                                                <strong>React 18 & Vite</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer links & social icons */}
                            <footer className="st-about-footer anim-slide-up-staggered">
                                <div className="st-about-footer__left">
                                    <a href="https://animse.com/#/Anims/Terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                                    <a href="https://animse.com/#/anims/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                                    <a href="https://animse.com/#/Contact" target="_blank" rel="noopener noreferrer">Contact Support</a>
                                </div>

                                <div className="st-about-footer__right">
                                    <p className="st-about-footer__copy">© {new Date().getFullYear()} Anims Infocare Systems.</p>
                                </div>
                            </footer>
                        </div>
                    )}

                </main>
            </div>
            {/* Toast Notification */}
            {showToast && (
                <div className="st-toast anim-fade-in-up">
                    <span className="st-toast__icon">✓</span>
                    <span>Email copied to clipboard!</span>
                </div>
            )}

            {/* ── UPGRADE PLAN MODAL ── */}
            {showUpgradeModal && (
                <div className="st-upgrade-overlay" onClick={() => !upgradeBusy && setShowUpgradeModal(false)}>
                    <div className="st-upgrade-container st-upgrade-container--new" onClick={(e) => e.stopPropagation()}>
                        <button className="st-upgrade-close-btn" onClick={() => !upgradeBusy && setShowUpgradeModal(false)} aria-label="Close modal">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>

                        <div className="st-upgrade-header-centered">
                            <h2 className="st-upgrade-main-title">Plans that grow with you</h2>
                            <p className="st-upgrade-main-subtitle">Choose the plan that fits your business. Upgrade or downgrade at any time.</p>
                            <div className="st-upgrade-pill-badge">Team and Enterprise</div>
                        </div>

                        {upgradeErr && <div className="st-upgrade-msg st-upgrade-msg--error">{upgradeErr}</div>}
                        {upgradeOk && <div className="st-upgrade-msg st-upgrade-msg--success">{upgradeOk}</div>}

                        <div className="st-upgrade-plans-grid">
                            {/* Free Plan */}
                            <div className={`st-upgrade-plan-card st-upgrade-plan-card--free ${isFree ? 'st-upgrade-plan-card--active' : ''}`}>
                                <div className="st-upgrade-plan-card__icon-wrap">
                                    <Icons.Branch />
                                </div>
                                <h3 className="st-upgrade-plan-card__title">Free</h3>
                                <p className="st-upgrade-plan-card__desc">Try Anims Business Analytics</p>
                                <div className="st-upgrade-plan-card__price-area">
                                    <span className="st-upgrade-plan-card__price">₹0</span>
                                </div>

                                <button
                                    className="st-upgrade-plan-card__btn st-upgrade-plan-card__btn--free-outline"
                                    disabled={true}
                                >
                                    {isFree ? (isExpiredMode ? 'Expired' : 'Current Plan') : 'Use for free'}
                                </button>

                                <ul className="st-upgrade-plan-card__features-list">
                                    <li><span className="st-feature-check"><Icons.Check /></span> Access to dashboards</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Basic Reports</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> 6 months free from registration</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Upto 5 user access</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Standard support</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> E-Approval & T-Approval workflows</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> MIS Reports</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Email Notifications</li>
                                </ul>
                            </div>

                            {/* Pro Plan */}
                            <div className={`st-upgrade-plan-card st-upgrade-plan-card--pro st-upgrade-plan-card--featured ${isPro ? 'st-upgrade-plan-card--active' : ''}`}>
                                <div className="st-upgrade-plan-card__promo-badge">
                                    <span className="st-upgrade-plan-card__promo-label">Yearly</span>
                                    <span className="st-upgrade-plan-card__promo-save">Save 17%</span>
                                </div>
                                <div className="st-upgrade-plan-card__icon-wrap">
                                    <Icons.Branch />
                                </div>
                                <h3 className="st-upgrade-plan-card__title">Pro</h3>
                                <p className="st-upgrade-plan-card__desc">Advanced data reporting & operations analytics</p>
                                <div className="st-upgrade-plan-card__price-area">
                                    <span className="st-upgrade-plan-card__price">₹500</span>
                                    <span className="st-upgrade-plan-card__period">/ user / month</span>
                                </div>
                                <div className="st-upgrade-plan-card__billing-cycle">
                                    {`billed annually (₹${(currentUsersCount * 500 * 12).toLocaleString("en-IN")}/yr for ${currentUsersCount} users)`}
                                </div>

                                <button
                                    className="st-upgrade-plan-card__btn st-upgrade-plan-card__btn--white"
                                    disabled={upgradeBusy || (isPro && !isExpiredMode)}
                                    onClick={() => { setSelectedPlan("Pro"); setConfirmBillingCycle("yearly"); setShowConfirmModal(true); }}
                                >
                                    {isPro ? (isExpiredMode ? 'Renewal' : 'Current Plan') : (upgradeBusy ? 'Upgrading...' : 'Get Pro plan')}
                                </button>

                                <div className="st-upgrade-plan-card__features-header">Pro has:</div>
                                <ul className="st-upgrade-plan-card__features-list">
                                    <li><span className="st-feature-check"><Icons.Check /></span> Top Management dashboards</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> E-Approval & T-Approval workflows</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Standard support</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Email Notifications</li>
                                </ul>
                            </div>

                            {/* Max Plan */}
                            <div className={`st-upgrade-plan-card st-upgrade-plan-card--max ${isMax ? 'st-upgrade-plan-card--active' : ''}`}>
                                <div className="st-upgrade-plan-card__icon-wrap">
                                    <Icons.Branch />
                                </div>
                                <h3 className="st-upgrade-plan-card__title">Max</h3>
                                <p className="st-upgrade-plan-card__desc">Full enterprise integrations & multi-plant operation tracking</p>
                                <div className="st-upgrade-plan-card__price-area">
                                    <span className="st-upgrade-plan-card__price">₹2,000</span>
                                    <span className="st-upgrade-plan-card__period">/ user / month</span>
                                </div>
                                <div className="st-upgrade-plan-card__billing-cycle">
                                    {`billed annually (₹${(currentUsersCount * 2000 * 12).toLocaleString("en-IN")}/yr for ${currentUsersCount} users)`}
                                </div>

                                <button
                                    className="st-upgrade-plan-card__btn st-upgrade-plan-card__btn--blue"
                                    disabled={upgradeBusy || (isMax && !isExpiredMode)}
                                    onClick={() => { setSelectedPlan("Max"); setConfirmBillingCycle("yearly"); setShowConfirmModal(true); }}
                                >
                                    {isMax ? (isExpiredMode ? 'Renewal' : 'Current Plan') : (upgradeBusy ? 'Upgrading...' : 'Get Max plan')}
                                </button>

                                <div className="st-upgrade-plan-card__features-header">Everything in Pro, plus:</div>
                                <ul className="st-upgrade-plan-card__features-list">
                                    <li><span className="st-feature-check"><Icons.Check /></span> Unlimited Dashboard</li>
                                    {/* <li><span className="st-feature-check"><Icons.Check /></span> Dedicated account manager</li> */}
                                    <li><span className="st-feature-check"><Icons.Check /></span> Advanced Analytics Charts</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Full MIS & Reports</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> E-Approval & T-Approval workflows</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Priority email support</li>
                                    <li><span className="st-feature-check"><Icons.Check /></span> Email Notifications</li>
                                </ul>
                            </div>
                        </div>

                        <div className="st-upgrade-disclaimer">
                            * Usage limits apply. Prices and plans are subject to change at Anims Infocare's discretion.
                        </div>

                        <div className="st-upgrade-modal-footer">
                            <span className="st-upgrade-footer-copyright">© 2026 Anims Infocare Systems</span>
                            <div className="st-upgrade-footer-links">
                                <a href="https://animse.com/#/anims/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                                <span className="st-footer-bullet">•</span>
                                <a href="https://animse.com/#/Anims/Terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                                <span className="st-footer-bullet">•</span>
                                <a href="https://animse.com/#/Contact" target="_blank" rel="noopener noreferrer">Contact Support</a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONFIRM PLAN CHANGES MODAL ── */}
            {showConfirmModal && (
                <div className="st-confirm-overlay" onClick={() => !upgradeBusy && setShowConfirmModal(false)}>
                    <div className="st-confirm-container" onClick={(e) => e.stopPropagation()}>
                        <button className="st-confirm-close-btn" onClick={() => !upgradeBusy && setShowConfirmModal(false)} aria-label="Close modal">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        <h3 className="st-confirm-title">{isRenewal ? "Confirm plan renewal" : "Confirm plan changes"}</h3>

                        {/* Billing cycle selector */}
                        {selectedPlan !== "Free" && (
                            <div className="st-confirm-cycle-selector" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                                <button
                                    type="button"
                                    className={`st-confirm-cycle-btn ${confirmBillingCycle === "6month" ? "st-confirm-cycle-btn--active" : ""}`}
                                    onClick={() => setConfirmBillingCycle("6month")}
                                    style={{
                                        flex: 1,
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: "1.5px solid",
                                        borderColor: confirmBillingCycle === "6month" ? "#2d6de8" : "rgba(255,255,255,0.08)",
                                        background: confirmBillingCycle === "6month" ? "rgba(45,109,232,0.05)" : "rgba(255,255,255,0.02)",
                                        color: confirmBillingCycle === "6month" ? "#ffffff" : "rgba(255,255,255,0.6)",
                                        fontWeight: "600",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    6 Months
                                </button>
                                <button
                                    type="button"
                                    className={`st-confirm-cycle-btn ${confirmBillingCycle === "yearly" ? "st-confirm-cycle-btn--active" : ""}`}
                                    onClick={() => setConfirmBillingCycle("yearly")}
                                    style={{
                                        flex: 1,
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: "1.5px solid",
                                        borderColor: confirmBillingCycle === "yearly" ? "#2d6de8" : "rgba(255,255,255,0.08)",
                                        background: confirmBillingCycle === "yearly" ? "rgba(45,109,232,0.05)" : "rgba(255,255,255,0.02)",
                                        color: confirmBillingCycle === "yearly" ? "#ffffff" : "rgba(255,255,255,0.6)",
                                        fontWeight: "600",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    Yearly (12 Months)
                                </button>
                            </div>
                        )}

                        {/* User count selector */}
                        {selectedPlan !== "Free" && (
                            <div className="st-confirm-users-selector" style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "12.5px", fontWeight: "600", marginBottom: "8px" }}>
                                    No. of Users
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <button
                                        type="button"
                                        className="st-user-count-btn"
                                        onClick={() => setEnteredUsersCount(prev => Math.max(activeUsers, prev - 1))}
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            border: "1.5px solid rgba(255,255,255,0.1)",
                                            background: "rgba(255,255,255,0.03)",
                                            color: "#fff",
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
                                        onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.03)"; e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                                    >
                                        —
                                    </button>
                                    <input
                                        type="number"
                                        min={activeUsers}
                                        value={enteredUsersCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || activeUsers;
                                            setEnteredUsersCount(Math.max(activeUsers, val));
                                        }}
                                        style={{
                                            flex: 1,
                                            height: "36px",
                                            borderRadius: "8px",
                                            border: "1.5px solid rgba(255,255,255,0.1)",
                                            background: "rgba(0,0,0,0.15)",
                                            color: "#fff",
                                            textAlign: "center",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            outline: "none",
                                            transition: "all 0.2s ease"
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = "#2d6de8"}
                                        onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                    />
                                    <button
                                        type="button"
                                        className="st-user-count-btn"
                                        onClick={() => setEnteredUsersCount(prev => prev + 1)}
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            border: "1.5px solid rgba(255,255,255,0.1)",
                                            background: "rgba(255,255,255,0.03)",
                                            color: "#fff",
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.borderColor = "rgba(255,255,255,0.2)"; }}
                                        onMouseLeave={(e) => { e.target.style.background = "rgba(255,255,255,0.03)"; e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                                    >
                                        +
                                    </button>
                                </div>
                                <span style={{ display: "block", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "6px" }}>
                                    Minimum required: {activeUsers} (currently registered active users)
                                </span>
                            </div>
                        )}

                        <div className="st-confirm-details-box">
                            <div className="st-confirm-plan-row">
                                <div>
                                    <div className="st-confirm-plan-name">
                                        {selectedPlan === "Pro" ? `Pro Plan (${enteredUsersCount} users) subscription` :
                                            selectedPlan === "Max" ? `Max Plan (${enteredUsersCount} users) subscription` :
                                                `${selectedPlan} Plan subscription`}
                                    </div>
                                    <div className="st-confirm-plan-cycle">
                                        {selectedPlan === "Free" ? "6 months free from registration" :
                                            confirmBillingCycle === "6month" ? "Billed every 6 months, starting today" : "Billed annually, starting today"}
                                    </div>
                                </div>
                                <div className="st-confirm-plan-price">
                                    {formatCurrency(confirmSubtotal)}
                                </div>
                            </div>

                            <div className="st-confirm-divider" />

                            <div className="st-confirm-price-row">
                                <span className="st-confirm-price-label">Subtotal</span>
                                <span className="st-confirm-price-val">
                                    {formatCurrency(confirmSubtotal)}
                                </span>
                            </div>

                            <div className="st-confirm-price-row">
                                <span className="st-confirm-price-label">Tax 0%</span>
                                <span className="st-confirm-price-val">
                                    {formatCurrency(confirmTax)}
                                </span>
                            </div>

                            <div className="st-confirm-divider" />

                            <div className="st-confirm-price-row st-confirm-price-row--total">
                                <span className="st-confirm-price-label">Total due</span>
                                <span className="st-confirm-price-val">
                                    {formatCurrency(confirmTotal)}
                                </span>
                            </div>
                        </div>

                        {upgradeErr && <div className="st-upgrade-msg st-upgrade-msg--error" style={{ marginTop: 0, marginBottom: 16 }}>{upgradeErr}</div>}

                        <div className="st-confirm-actions">
                            <button
                                type="button"
                                className="st-confirm-btn st-confirm-btn--cancel"
                                disabled={upgradeBusy}
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="st-confirm-btn st-confirm-btn--confirm"
                                disabled={upgradeBusy}
                                onClick={() => handleUpgradeSubmit(selectedPlan)}
                            >
                                {upgradeBusy ? (
                                    <><span className="st-upgrade-spinner" /> Updating...</>
                                ) : (
                                    isRenewal ? "Renew Plan" : "Update Plan"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
