import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

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

const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.667 8h10.666" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 3.5 13 8l-4.5 4.5" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Base URL — single place to change ─────────────────────────
// In dev, Vite proxies `/api` to Django (see `vite.config.js`).
// In prod, set `VITE_API_BASE_URL` if backend is hosted elsewhere.
const API = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export default function LoginPage() {
    const navigate = useNavigate();

    const [userId,       setUserId]       = useState("");
    const [companyName,  setCompanyName]  = useState("");
    const [companyState, setCompanyState] = useState("idle"); // idle | loading | found | error | network
    const [username,     setUsername]     = useState("");
    const [password,     setPassword]     = useState("");
    const [loginError,   setLoginError]   = useState("");
    const [loginBusy,    setLoginBusy]    = useState(false);

    // ── Auto-fetch company name (debounced 500ms) ────────────
    useEffect(() => {
        setCompanyName("");
        setCompanyState("idle");

        const trimmed = userId.trim();
        if (!trimmed) return;

        setCompanyState("loading");

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API}/company/${encodeURIComponent(trimmed)}/`,
                    { credentials: "include" }
                );
                const data = await res.json();

                if (res.ok && data.company_name) {
                    setCompanyName(data.company_name);
                    setCompanyState("found");
                } else {
                    // 404 — company code not in tenants table
                    setCompanyState("error");
                }
            } catch (err) {
                // Network / CORS error — Django not reachable
                console.error("Company fetch failed:", err);
                setCompanyState("network");
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [userId]);

    // ── Placeholder text based on state ─────────────────────
    const companyPlaceholder = {
        idle:    "Auto-fetched from User ID",
        loading: "Looking up company…",
        found:   "",
        error:   "⚠ Company not found — check your ID",
        network: "⚠ Cannot reach server — is Django running?",
    }[companyState];

    // ── Input class based on state ───────────────────────────
    const companyClass = [
        "lp__inp lp__inp--ro",
        companyState === "found"               ? "lp__inp--ok"  : "",
        companyState === "error"               ? "lp__inp--err" : "",
        companyState === "network"             ? "lp__inp--err" : "",
    ].join(" ").trim();

    // ── Login submit ─────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");

        if (!userId.trim())    return setLoginError("Please enter your organization ID.");
        if (!username.trim())  return setLoginError("Please enter your username.");
        if (!password)         return setLoginError("Please enter your password.");
        if (companyState === "error")   return setLoginError("Invalid company code.");
        if (companyState === "network") return setLoginError("Cannot reach server. Is Django running?");

        setLoginBusy(true);

        try {
            const res = await fetch(`${API}/login/`, {
                method:      "POST",
                credentials: "include",       // ✅ session cookie saved by browser
                headers:     { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_code: userId.trim(),
                    username:     username.trim(),
                    password,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("user", JSON.stringify(data));
                navigate("/AnimsBusinessAnalytics");
            } else {
                setLoginError(data.error || "Login failed. Please try again.");
            }
        } catch (err) {
            console.error("Login error:", err);
            setLoginError("Server error. Please check Django is running.");
        } finally {
            setLoginBusy(false);
        }
    };

    return (
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
                        <h1 className="lp__title">Welcome back</h1>
                        <p className="lp__subtitle">
                            Please enter your details to Login to your account.
                        </p>
                    </div>

                    <form className="lp__form" onSubmit={handleLogin} noValidate>

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
                                    autoComplete="username"
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
                                    type="password"
                                    className="lp__inp"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setLoginError("");
                                    }}
                                    autoComplete="current-password"
                                />
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
                        </div>
                    </form>

                    <div className="lp__footer anim-fade-up" style={{ animationDelay: "0.55s" }}>
                        <p className="lp__copy">© 2026&nbsp;&nbsp;Anims Infocare Systems</p>
                        <nav className="lp__links">
                            <a className="lp__link" href="#">Privacy Policy</a>
                            <span className="lp__dot">·</span>
                            <a className="lp__link" href="#">Terms of Service</a>
                            <span className="lp__dot">·</span>
                            <a className="lp__link" href="#">Contact Support</a>
                        </nav>
                    </div>
                </div>
            </div>

            {/* ── Anims logo — fixed top-right corner ── */}
            <div className="lp__logo anim-fade-in" style={{ animationDelay: "0.6s" }}>
                <img src="/Images/logo.png" alt="Anims" className="lp__logo-img" />
            </div>
        </div>
    );
}