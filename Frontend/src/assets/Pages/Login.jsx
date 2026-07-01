import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { resolveApiBase } from "../../apiBase";
import "./Login.css";

const API = resolveApiBase();
const RIGHTS_CACHE_KEY = "ba_user_rights";
const COMPANY_DEBOUNCE_MS = 200;
const COMPANY_MIN_LEN = 2;
const COMPANY_CACHE_MS = 5 * 60 * 1000;
const companyLookupCache = new Map();

function writeRightsCache(companyCode, username, rights, isSuperAdmin) {
    try {
        localStorage.setItem(RIGHTS_CACHE_KEY, JSON.stringify({
            companyCode,
            username,
            rights,
            isSuperAdmin,
            ts: Date.now(),
        }));
    } catch {
        /* ignore */
    }
}

const IconOrg = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="4.5" y="1.5" width="9" height="15" rx="0.7" stroke="#9397B3" strokeWidth="1.1" />
        <rect x="1.5" y="7.5" width="3" height="9" rx="0.7" stroke="#9397B3" strokeWidth="1.1" />
        <rect x="13.5" y="5.25" width="3" height="11.25" rx="0.7" stroke="#9397B3" strokeWidth="1.1" />
        <rect x="6.75" y="4.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
        <rect x="9.75" y="4.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
        <rect x="6.75" y="7.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
        <rect x="9.75" y="7.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
        <rect x="6.75" y="10.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
        <rect x="9.75" y="10.5" width="1.5" height="1.5" rx="0.3" fill="#9397B3" />
    </svg>
);

const IconUser = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="#9CA3AF" strokeWidth="1.1" fill="none" />
        <path d="M3 15.75C3 12.85 5.69 10.5 9 10.5s6 2.35 6 5.25"
            stroke="#9CA3AF" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
);

const IconLock = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.25" y="8.25" width="13.5" height="8.5" rx="1.5"
            stroke="#9397B3" strokeWidth="1.1" fill="none" />
        <path d="M5.25 8.25V5.25a3.75 3.75 0 0 1 7.5 0v3"
            stroke="#9397B3" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </svg>
);

const IconEyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconEyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.667 8h10.666" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 3.5 13 8l-4.5 4.5" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


const IconToastAccess = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M10 1.667 3.333 4.167v5c0 3.5 2.917 6.775 6.667 7.5 3.75-.725 6.667-4 6.667-7.5v-5L10 1.667Z"
            stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"
        />
        <path d="M7.5 10 9.167 11.667 12.5 8.333" stroke="currentColor" strokeWidth="1.35"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconToastError = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.35" />
        <path d="M10 6.25v4.5M10 13.75h.008" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" />
    </svg>
);

function LoginToastContent({ variant, title, message }) {
    return (
        <div className={`lp-toast lp-toast--${variant}`}>
            <span className="lp-toast__accent" aria-hidden="true" />
            <span className={`lp-toast__icon-wrap lp-toast__icon-wrap--${variant}`}>
                {variant === "access" ? <IconToastAccess /> : <IconToastError />}
            </span>
            <div className="lp-toast__content">
                <p className="lp-toast__title">{title}</p>
                <p className="lp-toast__message">{message}</p>
            </div>
        </div>
    );
}

const LOGIN_TOAST_OPTS = {
    position: "top-right",
    autoClose: 6500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    icon: false,
    className: "lp-toast-item",
    bodyClassName: "lp-toast-body",
    progressClassName: "lp-toast-progress",
};

function showLoginToast(variant, title, message) {
    toast(
        <LoginToastContent variant={variant} title={title} message={message} />,
        {
            ...LOGIN_TOAST_OPTS,
            toastId: `login-${variant}-${title}`,
            className: `lp-toast-item lp-toast-item--${variant}`,
            closeButton: ({ closeToast }) => (
                <button
                    type="button"
                    className="lp-toast__close"
                    onClick={closeToast}
                    aria-label="Dismiss notification"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5" stroke="currentColor"
                            strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                </button>
            ),
        },
    );
}

function getCachedCompanyLookup(code) {
    const key = code.trim().toLowerCase();
    const hit = companyLookupCache.get(key);
    if (hit && Date.now() - hit.at < COMPANY_CACHE_MS) {
        return hit.result;
    }
    return null;
}

function cacheCompanyLookup(code, result) {
    companyLookupCache.set(code.trim().toLowerCase(), { at: Date.now(), result });
}

async function fetchCompanyLookup(code, signal) {
    const trimmed = code.trim();
    const cached = getCachedCompanyLookup(trimmed);
    if (cached) return cached;

    const res = await fetch(
        `${API}/company/${encodeURIComponent(trimmed)}/`,
        { credentials: "include", signal },
    );
    const data = await res.json();
    const result = { res, data };
    if (res.ok || (res.status === 403 && data.code === "account_inactive")) {
        cacheCompanyLookup(trimmed, result);
    }
    return result;
}

export default function LoginPage() {
    const navigate = useNavigate();

    const [userId, setUserId] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [companyState, setCompanyState] = useState("idle"); // idle | loading | found | error | inactive | network
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);
    const inactiveToastKeyRef = useRef("");
    const companyFetchRef = useRef({ timer: null, controller: null });

    const showAccountInactiveToast = () => {
        showLoginToast(
            "error",
            "Account Inactive",
            "This organization is inactive. Please contact Anims ERP Team.",
        );
    };

    const applyCompanyLookup = (result, trimmed) => {
        const { res, data } = result;
        if (res.ok && data.company_name) {
            setCompanyName(data.company_name);
            setCompanyState("found");
            return;
        }
        if (res.status === 403 && data.code === "account_inactive") {
            setCompanyName(data.company_name || "");
            setCompanyState("inactive");
            const toastKey = trimmed.toLowerCase();
            if (inactiveToastKeyRef.current !== toastKey) {
                inactiveToastKeyRef.current = toastKey;
                showAccountInactiveToast();
            }
            return;
        }
        setCompanyName("");
        setCompanyState("error");
    };

    const runCompanyLookup = async (trimmed) => {
        const cached = getCachedCompanyLookup(trimmed);
        if (cached) {
            applyCompanyLookup(cached, trimmed);
            return;
        }

        companyFetchRef.current.controller?.abort();
        const controller = new AbortController();
        companyFetchRef.current.controller = controller;
        setCompanyState("loading");

        try {
            const result = await fetchCompanyLookup(trimmed, controller.signal);
            if (controller.signal.aborted) return;
            applyCompanyLookup(result, trimmed);
        } catch (err) {
            if (err.name === "AbortError") return;
            console.error("Company fetch failed:", err);
            setCompanyName("");
            setCompanyState("network");
        }
    };

    const scheduleCompanyLookup = (trimmed) => {
        clearTimeout(companyFetchRef.current.timer);
        companyFetchRef.current.controller?.abort();

        if (trimmed.length < COMPANY_MIN_LEN) {
            setCompanyName("");
            setCompanyState("idle");
            inactiveToastKeyRef.current = "";
            return;
        }

        const cached = getCachedCompanyLookup(trimmed);
        if (cached) {
            applyCompanyLookup(cached, trimmed);
            return;
        }

        setCompanyState("loading");
        companyFetchRef.current.timer = setTimeout(() => {
            runCompanyLookup(trimmed);
        }, COMPANY_DEBOUNCE_MS);
    };

    const handleUserIdBlur = () => {
        const trimmed = userId.trim();
        if (trimmed.length < COMPANY_MIN_LEN) return;
        if (companyState === "found" || companyState === "inactive") return;

        clearTimeout(companyFetchRef.current.timer);
        runCompanyLookup(trimmed);
    };

    // ── Auto-fetch company name (debounced, cached, abort on change) ──
    useEffect(() => {
        inactiveToastKeyRef.current = "";
        scheduleCompanyLookup(userId.trim());
        return () => {
            clearTimeout(companyFetchRef.current.timer);
            companyFetchRef.current.controller?.abort();
        };
    }, [userId]);


    // ── Placeholder text based on state ─────────────────────
    const companyPlaceholder = {
        idle: "Auto-fetched from User ID",
        loading: "Looking up company…",
        found: "",
        error: "⚠ Company not found — check your ID",
        inactive: "⚠ Account Inactive — contact your administrator",
        network: "⚠ Cannot reach server — is Django running?",
    }[companyState];

    // ── Input class based on state ───────────────────────────
    const companyClass = [
        "lp__inp lp__inp--ro",
        companyState === "found" ? "lp__inp--ok" : "",
        companyState === "error" || companyState === "inactive" ? "lp__inp--err" : "",
        companyState === "network" ? "lp__inp--err" : "",
    ].join(" ").trim();

    // ── Login submit ─────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");

        if (!userId.trim()) return setLoginError("Please enter your organization ID.");
        if (!username.trim()) return setLoginError("Please enter your username.");
        if (!password) return setLoginError("Please enter your password.");
        if (companyState === "error") return setLoginError("Invalid company code.");
        if (companyState === "inactive") {
            showAccountInactiveToast();
            return;
        }
        if (companyState === "network") return setLoginError("Cannot reach server. Is Django running?");

        setLoginBusy(true);

        try {
            const res = await fetch(`${API}/login/`, {
                method: "POST",
                credentials: "include",       // ✅ session cookie saved by browser
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_code: userId.trim(),
                    username: username.trim(),
                    password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                try { sessionStorage.removeItem("ba_erp_unavailable"); } catch { /* ignore */ }

                if (data.hasAccess === false) {
                    showLoginToast(
                        "access",
                        "Access denied",
                        "Sorry, you don't have access to Business Analytics. Please contact your administrator to request permissions.",
                    );
                    return;
                }

                localStorage.setItem("user", JSON.stringify({
                    message: data.message,
                    company: data.company,
                    company_code: data.company_code,
                    username: data.username,
                    designation: data.designation,
                    isExpired: !!data.isExpired,
                    plan_id: data.license?.plan_id || "free",
                    license: data.license || {
                        dashboard: true,
                        approvals: true,
                        reports: true,
                        mis: true,
                        charts: true,
                        utility: true,
                        plan_id: "free"
                    }
                }));
                writeRightsCache(
                    data.company_code,
                    data.username,
                    data.rights || {},
                    !!data.isSuperAdmin,
                );
                // Full navigation so PWA + all dashboard CSS load cleanly (client-side
                // navigate can leave enter animations stuck at opacity 0).
                window.location.replace("/AnimsBusinessAnalytics");
            } else if (res.status === 403 && data.code === "account_inactive") {
                showAccountInactiveToast();
            } else if (res.status === 503 && data.code === "erp_unavailable") {
                showLoginToast(
                    "error",
                    "Server unavailable",
                    data.error || "Your organization database is currently unavailable. Please try again later or contact IT.",
                );
            } else {
                showLoginToast(
                    "error",
                    "Login failed",
                    data.error || "Invalid username or password. Please try again.",
                );
            }
        } catch (err) {
            console.error("Login error:", err);
            showLoginToast(
                "error",
                "Connection error",
                "Unable to reach the server. Please check your connection and try again.",
            );
        } finally {
            setLoginBusy(false);
        }
    };

    return (
        <>
            <ToastContainer
                className="lp-toast-container"
                toastClassName="lp-toast-item"
                bodyClassName="lp-toast-body"
                progressClassName="lp-toast-progress"
                position="top-right"
                autoClose={6500}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                limit={2}
                icon={false}
            />
            <div className="lp">
                <div className="lp__blob lp__blob--tr" />
                <div className="lp__blob lp__blob--bl" />
                <div className="lp__blob lp__blob--tl" />

                {/* ═══ LEFT PANEL ════════════════════════════════════ */}
                <div className="lp__left">
                    <div className="lp__brand anim-fade-up" style={{ animationDelay: "0.1s" }}>
                        <div className="lp__brand-row">
                            <span className="lp__brand-anims">Anims</span>
                            <span className="lp__brand-erp">&nbsp;ERP</span>
                        </div>
                        <div className="lp__brand-rule" />
                        <p className="lp__brand-mfg">Manufacturing</p>
                    </div>

                    <h2 className="lp__tagline anim-fade-up" style={{ animationDelay: "0.2s" }}>
                        Business Analytics Platform
                    </h2>

                    <div className="lp__illus anim-fade-in" style={{ animationDelay: "0.4s" }}>
                        <img
                            src="/Images/LOGIN FINAL imag eand curve.png"
                            alt="Business analytics dashboard illustration"
                            className="lp__illus-img float-slow"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                        />
                    </div>

                    <p className="lp__desc anim-fade-up" style={{ animationDelay: "0.3s" }}>
                        Login to access real-time dashboards, track key performance metrics,
                        and turn your raw business data into actionable insights, all from a
                        single platform.
                    </p>
                </div>

                {/* ═══ RIGHT PANEL ═══════════════════════════════════ */}
                <div className="lp__right">
                    <div className="lp__card">
                        <div className="lp__card-head anim-fade-up" style={{ animationDelay: "0.1s" }}>
                            <div className="lp__logo anim-fade-in" style={{ animationDelay: "0.05s" }}>
                                <img src="/Images/logo.png" alt="Anims" className="lp__logo-img" />
                            </div>
                            <h1 className="lp__title">Welcome back</h1>
                            <p className="lp__subtitle">
                                Please enter your details to Login to your account.
                            </p>
                        </div>

                        <form className="lp__form" onSubmit={handleLogin} noValidate autoComplete="off">

                            {/* ── Organization / Company Code ── */}
                            <div className="lp__field anim-fade-up" style={{ animationDelay: "0.2s" }}>
                                <label className="lp__label" htmlFor="f-uid">User ID</label>
                                <div className="lp__wrap">
                                    <span className="lp__ico"><IconOrg /></span>
                                    <input
                                        id="f-uid"
                                        type="text"
                                        className="lp__inp"
                                        placeholder="Enter your organization ID"
                                        value={userId}
                                        onChange={(e) => {
                                            setUserId(e.target.value);
                                            setLoginError("");
                                        }}
                                        onBlur={handleUserIdBlur}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* ── Customer Name (auto-fetched) ── */}
                            <div className="lp__field anim-fade-up" style={{ animationDelay: "0.25s" }}>
                                <label className="lp__label" htmlFor="f-cust">
                                    Customer Name
                                    {/* ✅ Loading spinner inline */}
                                    {companyState === "loading" && (
                                        <span style={{
                                            marginLeft: 8, fontSize: 11,
                                            color: "#3b82f6", fontWeight: 500,
                                        }}>
                                            fetching…
                                        </span>
                                    )}
                                    {/* ✅ Green tick when found */}
                                    {companyState === "found" && (
                                        <span style={{
                                            marginLeft: 8, fontSize: 11,
                                            color: "#10b981", fontWeight: 600,
                                        }}>
                                            ✓ verified
                                        </span>
                                    )}
                                </label>
                                <div className="lp__wrap lp__wrap--bare">
                                    <input
                                        id="f-cust"
                                        type="text"
                                        className={companyClass}
                                        placeholder={companyPlaceholder}
                                        value={companyName}
                                        readOnly
                                        tabIndex={-1}
                                    />
                                </div>
                            </div>

                            {/* ── Username ── */}
                            <div className="lp__field anim-fade-up" style={{ animationDelay: "0.3s" }}>
                                <label className="lp__label" htmlFor="f-user">Username</label>
                                <div className="lp__wrap">
                                    <span className="lp__ico"><IconUser /></span>
                                    <input
                                        id="f-user"
                                        type="text"
                                        className="lp__inp"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setLoginError("");
                                        }}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* ── Password ── */}
                            <div className="lp__field anim-fade-up" style={{ animationDelay: "0.35s" }}>
                                <label className="lp__label" htmlFor="f-pass">Password</label>
                                <div className="lp__wrap">
                                    <span className="lp__ico"><IconLock /></span>
                                    <input
                                        id="f-pass"
                                        type={showPassword ? "text" : "password"}
                                        className="lp__inp lp__inp--pass"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setLoginError("");
                                        }}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        className="lp__pass-toggle"
                                        onClick={() => setShowPassword(p => !p)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        <span className="lp__eye-icon">
                                            {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                                        </span>
                                    </button>
                                </div>
                                <div className="lp__forgot-row">
                                    <a
                                        href="#"
                                        className="lp__forgot-link"
                                        onClick={e => { e.preventDefault(); navigate("/forgot-password"); }}
                                    >Forgot Password?</a>
                                </div>
                            </div>


                            {/* ✅ Login error message — replaces alert() */}
                            {loginError && (
                                <div style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    fontSize: 13,
                                    color: "#dc2626",
                                    fontWeight: 500,
                                    marginBottom: 4,
                                }}>
                                    ⚠ {loginError}
                                </div>
                            )}

                            <div className="anim-fade-up" style={{ animationDelay: "0.45s" }}>
                                <button
                                    type="submit"
                                    className="lp__btn"
                                    disabled={loginBusy || companyState === "loading"}
                                    style={{ opacity: loginBusy ? 0.7 : 1 }}
                                >
                                    <span>{loginBusy ? "Logging in…" : "Login"}</span>
                                    <IconArrow />
                                </button>
                                <div className="lp__signup-prompt">
                                    Don't have an account yet? <a href="#" className="lp__signup-link" onClick={(e) => { e.preventDefault(); navigate("/signup"); }}>Sign up</a>
                                </div>
                            </div>
                        </form>

                        <div className="lp__footer anim-fade-up" style={{ animationDelay: "0.55s" }}>
                            <p className="lp__copy">© {new Date().getFullYear()}&nbsp;&nbsp;Anims Infocare Systems</p>
                            <nav className="lp__links">
                                <a className="lp__link" href="https://animse.com/#/anims/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                                <span className="lp__dot">·</span>
                                <a className="lp__link" href="https://animse.com/#/Anims/Terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                                <span className="lp__dot">·</span>
                                <a className="lp__link" href="https://animse.com/#/Contact" target="_blank" rel="noopener noreferrer">Contact Support</a>
                            </nav>
                        </div>
                    </div>
                </div>


            </div>
        </>
    );
}