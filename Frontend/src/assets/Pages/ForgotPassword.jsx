import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resolveApiBase } from "../../apiBase";
import "./ForgotPassword.css";

const API = resolveApiBase();

/* ── Icon Components ──────────────────────────────────────── */
const IconBack = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconBuilding = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
);

const IconUser = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
);

const IconOffice = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
);

const IconLock = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const IconKey = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="4" />
        <path d="M12 11l9-9" />
        <path d="M17 6l2 2" />
        <path d="M15 8l2 2" />
    </svg>
);

const IconShield = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v5c0 4.5 3.8 8.7 9 10 5.2-1.3 9-5.5 9-10V7z" />
        <polyline points="9,12 11,14 15,10" />
    </svg>
);

const IconCheck = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20,6 9,17 4,12" />
    </svg>
);

const IconAlert = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.667 8h10.666" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 3.5 13 8l-4.5 4.5" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── Password Strength ────────────────────────────────────── */
function pwStrength(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
}
const PW_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#10b981"];

/* ================================================================
   STEP 1 — Verify Identity
   ================================================================ */
function VerifyStep({ onVerified }) {
    const [companyCode, setCompanyCode] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [username, setUsername] = useState("");
    const [usernameVerified, setUsernameVerified] = useState(false);
    const [errors, setErrors] = useState({});
    const [alert, setAlert] = useState("");
    const [busy, setBusy] = useState(false);

    const clearErr = (key) => setErrors(e => ({ ...e, [key]: "" }));

    // Auto-fetch Company Name based on Company Code
    useEffect(() => {
        const code = companyCode.trim();
        if (code.length < 3) return;

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/company/${code}/`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.company_name) {
                        setCompanyName(data.company_name);
                        clearErr("companyName");
                    }
                }
            } catch (e) {
                // Ignore fetch errors during typing
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [companyCode]);

    // Real-time username verification to show the tick icon
    useEffect(() => {
        const code = companyCode.trim();
        const name = companyName.trim();
        const user = username.trim();

        if (!code || !name || !user) {
            setUsernameVerified(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/forgot-password/verify/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        company_code: code,
                        company_name: name,
                        username: user
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setUsernameVerified(true);
                    } else {
                        setUsernameVerified(false);
                    }
                } else {
                    setUsernameVerified(false);
                }
            } catch (e) {
                setUsernameVerified(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [companyCode, companyName, username]);

    const validate = () => {
        const errs = {};
        if (!companyCode.trim()) errs.companyCode = "Company code is required.";
        if (!companyName.trim()) errs.companyName = "Company name is required.";
        if (!username.trim()) errs.username = "Username is required.";
        return errs;
    };

    const handleVerify = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setAlert("");
        setBusy(true);

        try {
            const res = await fetch(`${API}/forgot-password/verify/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_code: companyCode.trim(),
                    company_name: companyName.trim(),
                    username: username.trim()
                }),
            });
            const data = await res.json();
            if (res.ok) {
                onVerified({ companyCode: companyCode.trim(), username: username.trim() });
            } else {
                setAlert(data.error || "Verification failed. Please check details.");
            }
        } catch (e) {
            setAlert("Network error. Please try again later.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fp-screen-enter">
            {/* Step indicator */}
            <div className="fp-steps">
                <div className="fp-step fp-step--active">
                    <div className="fp-step__num">1</div>
                    <span>Verify Identity</span>
                </div>
                <div className="fp-step-sep" />
                <div className="fp-step">
                    <div className="fp-step__num">2</div>
                    <span>Reset Password</span>
                </div>
            </div>

            {/* Header */}
            <div className="fp-head">
                <div className="fp-head__icon"><IconKey /></div>
                <h1 className="fp-head__title">Forgot Password?</h1>
                <p className="fp-head__sub">
                    Enter your Company Code, Company Name, and Username to verify your identity.
                </p>
            </div>

            {/* Error alert */}
            <div className={`fp-alert${alert ? " fp-alert--show" : ""}`} role="alert">
                <IconAlert />{alert}
            </div>

            {/* Company Code */}
            <div className="fp-field">
                <label className="fp-label" htmlFor="fp-code">
                    Company Code <span className="fp-label__req">*</span>
                </label>
                <div className="fp-inp-wrap">
                    <span className="fp-inp-icon"><IconBuilding /></span>
                    <input id="fp-code"
                        className={`fp-inp${errors.companyCode ? " fp-inp--err" : ""}`}
                        type="text" placeholder="e.g. ANIMS-123456"
                        value={companyCode}
                        onChange={e => { setCompanyCode(e.target.value.toUpperCase()); clearErr("companyCode"); }} />
                </div>
                {errors.companyCode && <span className="fp-err-text">{errors.companyCode}</span>}
            </div>

            {/* Company Name */}
            <div className="fp-field">
                <label className="fp-label" htmlFor="fp-cname">
                    Company Name <span className="fp-label__req">*</span>
                </label>
                <div className="fp-inp-wrap">
                    <span className="fp-inp-icon"><IconOffice /></span>
                    <input id="fp-cname"
                        className={`fp-inp fp-inp--ro${errors.companyName ? " fp-inp--err" : ""}`}
                        type="text" placeholder="Full legal company name"
                        value={companyName}
                        readOnly />
                </div>
                {errors.companyName && <span className="fp-err-text">{errors.companyName}</span>}
            </div>

            {/* Username */}
            <div className="fp-field">
                <label className="fp-label" htmlFor="fp-user">
                    Username <span className="fp-label__req">*</span>
                </label>
                <div className="fp-inp-wrap">
                    <span className="fp-inp-icon"><IconUser /></span>
                    <input id="fp-user"
                        className={`fp-inp${errors.username ? " fp-inp--err" : ""}${usernameVerified ? " fp-inp--has-tick fp-inp--ok" : ""}`}
                        type="text" placeholder="Your login username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); clearErr("username"); }} />
                    {usernameVerified && (
                        <span className="fp-inp-tick">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20,6 9,17 4,12" />
                            </svg>
                        </span>
                    )}
                </div>
                {errors.username && <span className="fp-err-text">{errors.username}</span>}
            </div>

            <button type="button" className="fp-btn fp-btn--primary"
                onClick={handleVerify} disabled={busy}>
                {busy
                    ? <><span className="fp-spinner" /> Verifying…</>
                    : <><span>Verify Identity</span><IconArrow /></>
                }
            </button>
        </div>
    );
}

/* ================================================================
   STEP 2 — Reset Password
   ================================================================ */
function ResetStep({ identity, onDone }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [errors, setErrors] = useState({});
    const [alert, setAlert] = useState("");
    const [busy, setBusy] = useState(false);

    const strength = pwStrength(password);
    const clearErr = (key) => setErrors(e => ({ ...e, [key]: "" }));

    const validate = () => {
        const errs = {};
        if (password.length < 8)
            errs.password = "Password must be at least 8 characters.";
        if (!confirm || confirm !== password)
            errs.confirm = "Passwords do not match.";
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setAlert("");
        setBusy(true);

        try {
            const res = await fetch(`${API}/forgot-password/reset/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_code: identity.companyCode,
                    username: identity.username,
                    new_password: password
                }),
            });
            const data = await res.json();
            if (res.ok) {
                onDone();
            } else {
                setAlert(data.error || "Failed to reset password.");
            }
        } catch (e) {
            setAlert("Network error. Please try again later.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fp-screen-enter">
            {/* Step indicator */}
            <div className="fp-steps">
                <div className="fp-step fp-step--done">
                    <div className="fp-step__num">
                        <svg width="10" height="10" viewBox="0 0 13 13" fill="none">
                            <polyline points="1.5,6.5 5.5,10.5 11.5,2.5"
                                stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span>Verified</span>
                </div>
                <div className="fp-step-sep fp-step-sep--done" />
                <div className="fp-step fp-step--active">
                    <div className="fp-step__num">2</div>
                    <span>Reset Password</span>
                </div>
            </div>

            {/* Verified badge */}
            <div className="fp-verified-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2">
                    <polyline points="20,6 9,17 4,12" />
                </svg>
                Verified: {identity.username} @ {identity.companyCode}
            </div>

            {/* Header */}
            <div className="fp-head" style={{ marginBottom: 16 }}>
                <div className="fp-head__icon"><IconShield /></div>
                <h1 className="fp-head__title">Set New Password</h1>
                <p className="fp-head__sub">
                    Choose a strong password with at least 8 characters.
                </p>
            </div>

            {/* Error alert */}
            <div className={`fp-alert${alert ? " fp-alert--show" : ""}`} role="alert">
                <IconAlert />{alert}
            </div>

            {/* New Password */}
            <div className="fp-field">
                <label className="fp-label" htmlFor="fp-newpw">
                    New Password <span className="fp-label__req">*</span>
                </label>
                <div className="fp-inp-wrap">
                    <span className="fp-inp-icon"><IconLock /></span>
                    <input id="fp-newpw"
                        className={`fp-inp${errors.password ? " fp-inp--err" : ""}`}
                        type="password" placeholder="••••••••"
                        autoComplete="new-password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearErr("password"); }} />
                </div>
                {/* Strength bar */}
                <div className="fp-pw-bar-wrap">
                    <div className="fp-pw-bar" style={{
                        width: `${strength * 25}%`,
                        background: PW_COLORS[strength] || "#e8eeff",
                    }} />
                </div>
                {errors.password && <span className="fp-err-text">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="fp-field">
                <label className="fp-label" htmlFor="fp-confirm">
                    Confirm Password <span className="fp-label__req">*</span>
                </label>
                <div className="fp-inp-wrap">
                    <span className="fp-inp-icon"><IconLock /></span>
                    <input id="fp-confirm"
                        className={`fp-inp${errors.confirm ? " fp-inp--err"
                            : confirm && confirm === password ? " fp-inp--ok" : ""}`}
                        type="password" placeholder="Re-enter password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); clearErr("confirm"); }} />
                </div>
                {errors.confirm && <span className="fp-err-text">{errors.confirm}</span>}
            </div>

            <button type="button" className="fp-btn fp-btn--success"
                onClick={handleSave} disabled={busy}>
                {busy
                    ? <><span className="fp-spinner" /> Saving…</>
                    : <><span>Save New Password</span><IconArrow /></>
                }
            </button>
        </div>
    );
}

/* ================================================================
   STEP 3 — Success
   ================================================================ */
function SuccessStep({ onGoLogin }) {
    return (
        <div className="fp-success">
            <div className="fp-success__icon"><IconCheck /></div>
            <h2 className="fp-success__title">Password Reset!</h2>
            <p className="fp-success__sub">
                Your password has been updated successfully.<br />
                You can now log in with your new password.
            </p>
            <button type="button" className="fp-btn fp-btn--primary" onClick={onGoLogin}>
                <span>Go to Login</span><IconArrow />
            </button>
        </div>
    );
}

/* ================================================================
   ROOT — FORGOT PASSWORD PAGE
   ================================================================ */
export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState("verify");   // verify | reset | done
    const [identity, setIdentity] = useState(null);

    return (
        <div className="fp-page">
            {/* Atmosphere blobs */}
            <div className="fp-blob fp-blob--tr" />
            <div className="fp-blob fp-blob--bl" />
            <div className="fp-blob fp-blob--tl" />

            {/* Fixed back button */}
            <button className="fp-back" onClick={() => navigate("/")} aria-label="Back to Login">
                <IconBack />
                <span>Back to Login</span>
            </button>

            {/* Fixed logo */}
            <div className="fp-logo" title="Anims ERP">
                <img src="/Images/logo.png" alt="Anims ERP" />
            </div>

            {/* Card */}
            <div className="fp-card">
                <div className="fp-card__accent" />

                {step === "verify" && (
                    <VerifyStep
                        onVerified={(id) => { setIdentity(id); setStep("reset"); }}
                    />
                )}

                {step === "reset" && identity && (
                    <ResetStep
                        identity={identity}
                        onDone={() => setStep("done")}
                    />
                )}

                {step === "done" && (
                    <SuccessStep onGoLogin={() => navigate("/")} />
                )}

                {step !== "done" && (
                    <div className="fp-footer">
                        Remember your password?{" "}
                        <a href="#" onClick={e => { e.preventDefault(); navigate("/"); }}>
                            Log in
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
