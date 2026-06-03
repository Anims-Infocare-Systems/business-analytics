import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

/* ================================================================
   SVG ICON COMPONENTS
   ================================================================ */
const IconCheck = () => (
    <svg width="9" height="9" viewBox="0 0 13 13">
        <polyline points="1.5,6.5 5.5,10.5 11.5,2.5" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);

const IconBack = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconArrowRight = () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconAlert = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const IconArrowBtn = () => (
    <svg className="sg-btn-arrow" width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2.667 8h10.666" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 3.5 13 8l-4.5 4.5" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/* ── Plan icon SVGs ─────────────────────────────────────────── */
const IconFree = () => (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="#1a54d4"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="29" r="1.5" fill="#1a54d4" stroke="none" />
        <line x1="18" y1="27.5" x2="18" y2="19.5" />
        <path d="M18 19.5C18 19.5 13 17.5 13 11C15.5 13 18 13 18 13C18 13 20.5 13 23 11C23 17.5 18 19.5 18 19.5Z" />
        <path d="M14.5 15C12.5 15 11 16.5 10 18.5" />
        <path d="M21.5 15C23.5 15 25 16.5 26 18.5" />
    </svg>
);

const IconPro = () => (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="#fff"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="29" r="1.5" fill="#fff" stroke="none" />
        <line x1="18" y1="27.5" x2="18" y2="18" />
        <path d="M18 18C18 18 11.5 15 11.5 7.5C14.5 10 18 10 18 10C18 10 21.5 10 24.5 7.5C24.5 15 18 18 18 18Z" />
        <path d="M13.5 12.5C11 12.5 9 14 8 16.5" />
        <path d="M22.5 12.5C25 12.5 27 14 28 16.5" />
    </svg>
);

const IconMax = () => (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="#1a54d4"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="29" r="1.5" fill="#1a54d4" stroke="none" />
        <line x1="18" y1="27.5" x2="18" y2="17" />
        <path d="M18 17C18 17 10 13.5 10 5C13.5 8 18 8 18 8C18 8 22.5 8 26 5C26 13.5 18 17 18 17Z" />
        <path d="M13 10.5C10.5 10 8.5 11.5 7.5 14" />
        <path d="M23 10.5C25.5 10 27.5 11.5 28.5 14" />
        <path d="M11.5 7.5C9 7 7 8.5 6 11" />
        <path d="M24.5 7.5C27 7 29 8.5 30 11" />
    </svg>
);

const BadgePlantIcon = () => (
    <svg width="16" height="16" viewBox="0 0 36 36" fill="none" stroke="#fff"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="28" x2="18" y2="19" />
        <path d="M18 19C18 19 12 16 12 9C15 11.5 18 11.5 18 11.5C18 11.5 21 11.5 24 9C24 16 18 19 18 19Z" />
    </svg>
);

/* ================================================================
   PLAN DATA
   ================================================================ */
const PLAN_META = {
    free: { name: "Free Plan", detail: "₹0 · up to 5 users", maxUsers: 5 },
    pro: { name: "Pro Plan", detail: "₹24,888 / year · billed annually", maxUsers: 10 },
    max: { name: "Max Plan", detail: "₹1,07,988 / year · billed annually", maxUsers: 999 },
};

const PLANS = [
    {
        id: "free",
        name: "Free",
        tagline: "Try Anims Business Analytics",
        price: { yearly: "₹0", monthly: "₹0" },
        priceUnit: "",
        priceSub: { yearly: "", monthly: "" },
        pricePrefix: "",
        ctaLabel: "Use for free",
        ctaStyle: "outline",
        features: [
            "Access to dashboards",
            "Basic Reports",
            "6 months free from registration",
            "Upto 5 user access",
            "Standard support",
            "E-Approval & T-Approval workflows",
            "MIS Reports",
            "Email Notifications",
        ],
        featureHeader: null,
        highlight: false,
        noCommit: null,
    },
    {
        id: "pro",
        name: "Pro",
        tagline: "Research, code, and organize",
        price: { yearly: "₹24,888", monthly: "₹2,499" },
        priceUnit: "/ year",
        priceSub: { yearly: "billed annually", monthly: "billed monthly" },
        pricePrefix: "",
        ctaLabel: "Get Pro plan",
        ctaStyle: "solid",
        features: [
            "Unlimited dashboards",
            "Full MIS & efficiency reports",
            "Up to 10 user accounts",
            "E-Approval & T-Approval workflows",
            "Priority email support",
            "Email Notifications",
        ],
        featureHeader: "Everything in Free and:",
        highlight: true,
        noCommit: null,
    },
    {
        id: "max",
        name: "Max",
        tagline: "Higher limits, priority access",
        price: { yearly: "₹1,07,988", monthly: "₹8,999" },
        priceUnit: "/ year",
        priceSub: { yearly: "billed annually", monthly: "billed monthly" },
        pricePrefix: "",
        ctaLabel: "Get Max plan",
        ctaStyle: "dark",
        features: [
            "Unlimited users",
            "Dedicated account manager",
            "Custom integrations & API access",
            "SLA-backed uptime guarantee",
            "On-premise deployment option",
            "Email Notifications",
        ],
        featureHeader: "Everything in Pro, plus:",
        highlight: false,
        noCommit: "No commitment · Cancel anytime",
    },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function generateCode() {
    return `ANIMS-${Math.floor(100000 + Math.random() * 900000)}`;
}

function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePhone(v) {
    return v.replace(/\D/g, "").length >= 10;
}

function passwordStrength(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
}

const PW_COLOURS = ["", "#ef4444", "#f97316", "#eab308", "#10b981"];

/* ================================================================
   PLAN CARD
   ================================================================ */
function PlanCard({ plan, billing, onBillingChange, onSelect }) {
    const price = plan.price[billing];
    const priceSub = plan.priceSub[billing];

    return (
        <div className={`sg-card${plan.highlight ? " sg-card--hl" : ""}`}>
            <div className="sg-card__top">
                <div className="sg-card__icon">
                    {plan.id === "pro" ? <IconPro /> :
                        plan.id === "max" ? <IconMax /> :
                            <IconFree />}
                </div>
                {plan.id === "pro" && (
                    <div className="sg-billing-badge">
                        <span>Yearly</span>
                        <span className="sg-save-badge" id="save-badge">Save 17%</span>
                    </div>
                )}
            </div>

            <div className="sg-card__name">{plan.name}</div>
            <div className="sg-card__tag">{plan.tagline}</div>

            <div className="sg-price-row">
                {plan.pricePrefix && <span className="sg-price-prefix">{plan.pricePrefix}</span>}
                <span className="sg-price" id={plan.id === "pro" ? "pro-price" : undefined}>{price}</span>
                {plan.priceUnit && (
                    <div className="sg-price-meta">
                        <span className="sg-price-unit">{plan.priceUnit}</span>
                        {priceSub && (
                            <span className="sg-price-sub"
                                id={plan.id === "pro" ? "pro-billing-note" : undefined}>
                                {priceSub}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <button type="button" className={`sg-cta sg-cta--${plan.ctaStyle}`}
                onClick={() => onSelect(plan, billing)}>
                {plan.ctaLabel}
            </button>

            {plan.noCommit && <p className="sg-no-commit">{plan.noCommit}</p>}

            <ul className="sg-features">
                {plan.featureHeader && (
                    <li className="sg-feat sg-feat--hd">{plan.featureHeader}</li>
                )}
                {plan.features.map((f, i) => (
                    <li key={i} className="sg-feat">
                        <span className="sg-feat-check"><IconCheck /></span>
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ================================================================
   SCREEN 1 — PLAN SELECTION
   ================================================================ */
function PlanScreen({ onPlanSelect }) {
    const [billing, setBilling] = useState("yearly");

    return (
        <div className="sg-screen sg-screen--active" id="screen-plans">
            <header className="sg-hero">
                <h1 className="sg-hero__title">Plans that grow with you</h1>
                <p className="sg-hero__sub">
                    Choose the plan that fits your business. Upgrade or downgrade at&nbsp;any&nbsp;time.
                </p>
                <div className="sg-tabs" role="tablist">
                    <button type="button" role="tab" id="tab-team"
                        className="sg-tab sg-tab--active">Team and Enterprise</button>
                </div>
            </header>

            <section className="sg-plans" aria-label="Pricing plans">
                {PLANS.map(plan => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        billing={billing}
                        onBillingChange={setBilling}
                        onSelect={onPlanSelect}
                    />
                ))}
            </section>

            <p className="sg-footnote">
                * Usage limits apply. Prices and plans are subject to change at Anims Infocare's discretion.
            </p>
            <footer className="sg-footer">
                <p className="sg-footer__copy">© {new Date().getFullYear()}&nbsp;&nbsp;Anims Infocare Systems</p>
                <nav className="sg-footer__links">
                    <a className="sg-footer__link" href="https://animse.com/#/anims/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    <span className="sg-footer__dot">·</span>
                    <a className="sg-footer__link" href="https://animse.com/#/Anims/Terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    <span className="sg-footer__dot">·</span>
                    <a className="sg-footer__link" href="https://animse.com/#/Contact" target="_blank" rel="noopener noreferrer">Contact Support</a>
                </nav>
            </footer>
        </div>
    );
}

/* ================================================================
   SCREEN 2 — COMPANY REGISTRATION FORM
   ================================================================ */
function FormScreen({ selectedPlan, selectedBilling, onBack, onSubmit }) {
    const [currentCode, setCurrentCode] = useState("");
    const [form, setForm] = useState({
        companyName: "",
        businessName: "",
        personName: "",
        email: "",
        phone: "",
        gst: "",
        employees: "",
        users: "1",
    });
    const [errors, setErrors] = useState({});
    const [formErr, setFormErr] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);

    useEffect(() => {
        const code = currentCode.trim();
        if (!code) {
            setForm(f => ({ ...f, companyName: "" }));
            setAlreadyRegistered(false);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/company/${encodeURIComponent(code)}/`);
                if (res.ok) {
                    const data = await res.json();
                    setForm(f => ({ ...f, companyName: data.company_name || "" }));
                    setAlreadyRegistered(!!data.already_registered);
                    if (data.already_registered) {
                        setErrors(e => ({ ...e, companyCode: "This company has already signed up." }));
                    } else {
                        setErrors(e => ({ ...e, companyCode: "", companyName: "" }));
                    }
                } else {
                    setForm(f => ({ ...f, companyName: "Invalid Company Code" }));
                    setAlreadyRegistered(false);
                }
            } catch (err) {
                console.error("Company lookup failed", err);
                setForm(f => ({ ...f, companyName: "Invalid Company Code" }));
                setAlreadyRegistered(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [currentCode]);

    const maxUsers = PLAN_META[selectedPlan.id].maxUsers;
    const usersHint = maxUsers === 999
        ? "(unlimited on Max)"
        : `(max ${maxUsers} on ${selectedPlan.name.split(" ")[0]})`;

    const handleField = (key, val) => {
        setForm(f => ({ ...f, [key]: val }));
        if (errors[key]) setErrors(e => ({ ...e, [key]: "" }));
    };

    const validate = () => {
        const errs = {};
        if (!currentCode.trim()) {
            errs.companyCode = "Company code is required.";
        } else if (alreadyRegistered) {
            errs.companyCode = "This company has already signed up.";
        }
        if (!form.companyName.trim()) {
            errs.companyName = "Company name is required.";
        } else if (form.companyName === "Invalid Company Code") {
            errs.companyName = "Please enter a valid company code.";
        }
        if (!form.personName.trim()) errs.personName = "Contact person name is required.";
        if (!validateEmail(form.email)) errs.email = "Enter a valid email address.";
        if (!validatePhone(form.phone)) errs.phone = "Enter a valid phone number.";
        if (!form.employees) errs.employees = "Please select employee count.";
        const u = parseInt(form.users) || 0;
        if (u < 1 || u > maxUsers) errs.users = "Please enter a valid user count.";
        return errs;
    };

    const handleContinue = () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            setFormErr(true);
            return;
        }
        setFormErr(false);
        setShowModal(true);
    };

    const planDetail = () => {
        if (selectedPlan.id === "free") return "₹0 · single user";
        if (selectedPlan.id === "pro")
            return "₹24,888 / year · billed annually";
        return "₹1,07,988 / year · billed annually";
    };

    return (
        <div className="sg-screen sg-screen--active" id="screen-form">
            <div className="sg-form-wrap">
                <div className="sg-form-accent" />
                <div className="sg-form-inner">

                    {/* Step breadcrumb */}
                    <div className="sg-steps" aria-label="Registration progress">
                        <div className="sg-step sg-step--done">
                            <div className="sg-step__num">
                                <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                                    <polyline points="1.5,6.5 5.5,10.5 11.5,2.5"
                                        stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="sg-step__label">Plan</span>
                        </div>
                        <div className="sg-step-sep sg-step-sep--done" />
                        <div className="sg-step sg-step--active">
                            <div className="sg-step__num">2</div>
                            <span className="sg-step__label">Company Details</span>
                        </div>
                        <div className="sg-step-sep" />
                        <div className="sg-step">
                            <div className="sg-step__num">3</div>
                            <span className="sg-step__label">Account Setup</span>
                        </div>
                    </div>

                    {/* Selected plan badge */}
                    <div className="sg-plan-badge" id="plan-badge">
                        <div className="sg-plan-badge__icon"><BadgePlantIcon /></div>
                        <div>
                            <div className="sg-plan-badge__name" id="badge-plan-name">
                                {PLAN_META[selectedPlan.id].name}
                            </div>
                            <div className="sg-plan-badge__detail" id="badge-plan-detail">
                                {planDetail()}
                            </div>
                        </div>
                        <button className="sg-plan-badge__change" onClick={onBack} type="button">
                            Change plan
                        </button>
                    </div>

                    {/* Error banner */}
                    <div className={`sg-form-err${formErr ? " sg-form-err--show" : ""}`}
                        id="form-err" role="alert">
                        <IconAlert />
                        <span id="form-err-text">Please fix the errors above.</span>
                    </div>

                    {/* ── SECTION A: Company Information ── */}
                    <p className="sg-section-head">Company Information</p>
                    <div className="sg-grid">

                        {/* Company Code */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-code">
                                Company Code&nbsp;<span className="sg-label__req">*</span>
                                <span className="sg-label__opt">(your login ID)</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <line x1="9" y1="9" x2="15" y2="9" />
                                        <line x1="9" y1="13" x2="15" y2="13" />
                                    </svg>
                                </span>
                                <input id="f-code"
                                    className={`sg-inp${errors.companyCode ? " sg-inp--err" : ""}`}
                                    type="text" placeholder="Enter your company code"
                                    value={currentCode}
                                    onChange={e => {
                                        setCurrentCode(e.target.value.toUpperCase());
                                        if (errors.companyCode) setErrors(err => ({ ...err, companyCode: "" }));
                                    }} />
                            </div>
                            {errors.companyCode && (
                                <span className="sg-err-text sg-err-text--show" id="err-code">
                                    {errors.companyCode}
                                </span>
                            )}
                            <span className="sg-hint">This code is used to log in. Save it after registration.</span>
                        </div>

                        {/* Company Name */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-cname">
                                Company Name&nbsp;<span className="sg-label__req">*</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9,22 9,12 15,12 15,22" />
                                    </svg>
                                </span>
                                <input id="f-cname"
                                    className={`sg-inp${errors.companyName ? " sg-inp--err" : ""}`}
                                    type="text" placeholder="Full legal company name"
                                    value={form.companyName}
                                    onChange={e => handleField("companyName", e.target.value)}
                                    readOnly
                                />
                            </div>
                            {errors.companyName && (
                                <span className="sg-err-text sg-err-text--show" id="err-cname">
                                    {errors.companyName}
                                </span>
                            )}
                        </div>

                        {alreadyRegistered && (
                            <div className="sg-registered-banner">
                                <div className="sg-registered-banner__icon">✨</div>
                                <div className="sg-registered-banner__body">
                                    <h4 className="sg-registered-banner__title">Company Already Registered!</h4>
                                    <p className="sg-registered-banner__desc">
                                        This company code is already registered on Business Analytics. You can proceed directly to sign in with your admin credentials.
                                    </p>
                                    <button 
                                        type="button" 
                                        className="sg-registered-banner__btn"
                                        onClick={() => navigate("/")}
                                    >
                                        Go to Sign In &rarr;
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Business Name */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-bname">
                                Business Name&nbsp;
                                <span className="sg-label__opt">(trading / brand name)</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="7" width="20" height="14" rx="2" />
                                        <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                                        <path d="M8 7V5a2 2 0 0 1 4 0v2" />
                                    </svg>
                                </span>
                                <input id="f-bname" className="sg-inp" type="text"
                                    placeholder="Brand or trading name"
                                    value={form.businessName}
                                    onChange={e => handleField("businessName", e.target.value)} />
                            </div>
                        </div>

                        {/* Business Person Name */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-person">
                                Business Person Name&nbsp;<span className="sg-label__req">*</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                    </svg>
                                </span>
                                <input id="f-person"
                                    className={`sg-inp${errors.personName ? " sg-inp--err" : ""}`}
                                    type="text" placeholder="Full name of primary contact"
                                    value={form.personName}
                                    onChange={e => handleField("personName", e.target.value)} />
                            </div>
                            {errors.personName && (
                                <span className="sg-err-text sg-err-text--show" id="err-person">
                                    {errors.personName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── SECTION B: Contact Details ── */}
                    <p className="sg-section-head">Contact Details</p>
                    <div className="sg-grid">

                        {/* Email ID */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-email">
                                Email ID&nbsp;<span className="sg-label__req">*</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <polyline points="2,4 12,13 22,4" />
                                    </svg>
                                </span>
                                <input id="f-email"
                                    className={`sg-inp${errors.email ? " sg-inp--err"
                                        : form.email && validateEmail(form.email) ? " sg-inp--ok"
                                            : ""}`}
                                    type="email" placeholder="company@example.com"
                                    value={form.email}
                                    onChange={e => handleField("email", e.target.value)} />
                            </div>
                            {errors.email && (
                                <span className="sg-err-text sg-err-text--show" id="err-email">
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-phone">
                                Phone Number&nbsp;<span className="sg-label__req">*</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </span>
                                <input id="f-phone"
                                    className={`sg-inp${errors.phone ? " sg-inp--err"
                                        : form.phone && validatePhone(form.phone) ? " sg-inp--ok"
                                            : ""}`}
                                    type="tel" placeholder="10-digit mobile number" maxLength={15}
                                    value={form.phone}
                                    onChange={e => handleField("phone", e.target.value)} />
                            </div>
                            {errors.phone && (
                                <span className="sg-err-text sg-err-text--show" id="err-phone">
                                    {errors.phone}
                                </span>
                            )}
                        </div>

                        {/* GST Number */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-gst">
                                GST Number&nbsp;<span className="sg-label__opt">(optional)</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="3" width="20" height="18" rx="2" />
                                        <line x1="8" y1="9" x2="16" y2="9" />
                                        <line x1="8" y1="13" x2="16" y2="13" />
                                        <line x1="8" y1="17" x2="12" y2="17" />
                                    </svg>
                                </span>
                                <input id="f-gst" className="sg-inp" type="text"
                                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                                    style={{ textTransform: "uppercase" }}
                                    value={form.gst}
                                    onChange={e => handleField("gst", e.target.value.toUpperCase())} />
                            </div>
                            <span className="sg-hint">15-character Indian GSTIN (if applicable)</span>
                        </div>
                    </div>

                    {/* ── SECTION C: Business Size ── */}
                    <p className="sg-section-head">Business Size</p>
                    <div className="sg-grid">

                        {/* No. of Employees */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-employees">
                                No. of Employees&nbsp;<span className="sg-label__req">*</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </span>
                                <select id="f-employees"
                                    className={`sg-select${errors.employees ? " sg-inp--err" : ""}`}
                                    value={form.employees}
                                    onChange={e => handleField("employees", e.target.value)}>
                                    <option value="">Select employee range</option>
                                    <option value="1-10">1 – 10</option>
                                    <option value="11-50">11 – 50</option>
                                    <option value="51-200">51 – 200</option>
                                    <option value="201-500">201 – 500</option>
                                    <option value="500+">500+</option>
                                </select>
                            </div>
                            {errors.employees && (
                                <span className="sg-err-text sg-err-text--show" id="err-employees">
                                    {errors.employees}
                                </span>
                            )}
                        </div>

                        {/* No. of Users — number input, plan-limited */}
                        <div className="sg-field">
                            <label className="sg-label" htmlFor="f-users">
                                No. of Users&nbsp;<span className="sg-label__req">*</span>
                                <span className="sg-label__opt" id="users-max-hint">{usersHint}</span>
                            </label>
                            <div className="sg-inp-wrap">
                                <span className="sg-inp-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                    </svg>
                                </span>
                                <input id="f-users"
                                    className={`sg-inp${errors.users ? " sg-inp--err" : ""}`}
                                    type="number"
                                    value={form.users}
                                    onChange={e => {
                                        let val = e.target.value;
                                        if (val === "" || val === "-") { handleField("users", val); return; }
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num)) {
                                            const clamped = Math.max(1, Math.min(num, maxUsers === 999 ? 9999 : maxUsers));
                                            handleField("users", String(clamped));
                                        }
                                    }} />
                            </div>
                            {errors.users && (
                                <span className="sg-err-text sg-err-text--show" id="err-users">
                                    {errors.users}
                                </span>
                            )}
                            <span className="sg-hint" id="users-hint">
                                Number of login accounts your team needs.
                            </span>
                        </div>
                    </div>

                    {/* Action row */}
                    <div className="sg-actions">
                        <button type="button" className="sg-btn-back" onClick={onBack}>
                            <IconBack /> Back to Plans
                        </button>
                        <button type="button" className="sg-btn-continue"
                            id="btn-continue" onClick={handleContinue}>
                            Continue to Account Setup <IconArrowRight />
                        </button>
                    </div>
                </div>
            </div>

            {/* Admin Account Modal */}
            {showModal && (
                <AdminModal
                    companyCode={currentCode}
                    onClose={() => setShowModal(false)}
                    onSubmit={async (adminData) => {
                        await onSubmit({ form, code: currentCode, adminData });
                    }}
                />
            )}
        </div>
    );
}

/* ================================================================
   MODAL — ADMIN ACCOUNT CREATION  (Step 3)
   ================================================================ */
function AdminModal({ companyCode, onClose, onSubmit }) {
    const [username, setUsername] = useState("");
    const [designation, setDesignation] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [terms, setTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const strength = passwordStrength(password);
    const clearErr = () => setErrors({});

    const validate = () => {
        const errs = {};
        if (!/^[a-zA-Z0-9_]{4,20}$/.test(username.trim()))
            errs.username = "Username must be 4–20 alphanumeric characters.";
        if (!designation.trim())
            errs.designation = "Designation is required.";
        if (password.length < 8)
            errs.password = "Password must be at least 8 characters.";
        if (!confirm || confirm !== password)
            errs.confirm = "Passwords do not match.";
        if (!terms)
            errs.terms = "You must agree to the terms to continue.";
        return errs;
    };

    const handleSignup = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        try {
            await onSubmit({ username, designation, password });
        } catch (err) {
            setErrors({ apiError: err.message || "Signup failed." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sg-modal sg-modal--open" id="modal-account"
            role="dialog" aria-modal="true" aria-labelledby="modal-title"
            onClick={onClose}>
            <div className="sg-modal__box" onClick={e => e.stopPropagation()}>
                <div className="sg-modal__accent" />

                <div className="sg-modal__head">
                    <div>
                        <h2 className="sg-modal__title" id="modal-title">Create Admin Account</h2>
                        <p className="sg-modal__sub">Set up the primary login credentials for your ERP.</p>
                    </div>
                    <button type="button" className="sg-modal__close"
                        onClick={onClose} aria-label="Close">✕</button>
                </div>

                {/* Inline step indicator inside modal */}
                <div style={{ padding: "0 24px 6px", display: "flex", alignItems: "center", gap: 0 }}>
                    <div className="sg-step sg-step--done" style={{ fontSize: 11 }}>
                        <div className="sg-step__num" style={{ width: 22, height: 22, fontSize: 10 }}>
                            <svg width="9" height="9" viewBox="0 0 13 13" fill="none">
                                <polyline points="1.5,6.5 5.5,10.5 11.5,2.5" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span>Plan</span>
                    </div>
                    <div className="sg-step-sep sg-step-sep--done"
                        style={{ minWidth: 14, margin: "0 6px" }} />
                    <div className="sg-step sg-step--done" style={{ fontSize: 11 }}>
                        <div className="sg-step__num" style={{ width: 22, height: 22, fontSize: 10 }}>
                            <svg width="9" height="9" viewBox="0 0 13 13" fill="none">
                                <polyline points="1.5,6.5 5.5,10.5 11.5,2.5" stroke="currentColor"
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span>Company</span>
                    </div>
                    <div className="sg-step-sep sg-step-sep--done"
                        style={{ minWidth: 14, margin: "0 6px" }} />
                    <div className="sg-step sg-step--active" style={{ fontSize: 11 }}>
                        <div className="sg-step__num" style={{ width: 22, height: 22, fontSize: 10 }}>3</div>
                        <span>Account</span>
                    </div>
                </div>

                <div className="sg-modal__body">
                    {errors.apiError && (
                        <div className="sg-form-err sg-form-err--show" style={{ margin: "0 0 1rem 0" }} role="alert">
                            <IconAlert />
                            <span>{errors.apiError}</span>
                        </div>
                    )}

                    {/* Username */}
                    <div className="sg-field">
                        <label className="sg-label" htmlFor="m-username">
                            Username&nbsp;<span className="sg-label__req">*</span>
                            <span className="sg-label__opt">(4–20 chars, alphanumeric)</span>
                        </label>
                        <div className="sg-inp-wrap">
                            <span className="sg-inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                </svg>
                            </span>
                            <input id="m-username"
                                className={`sg-inp${errors.username ? " sg-inp--err" : ""}`}
                                type="text" placeholder="e.g. admin_anims"
                                maxLength={20} autoComplete="username"
                                value={username}
                                onChange={e => { setUsername(e.target.value); clearErr(); }} />
                        </div>
                        {errors.username && (
                            <span className="sg-err-text sg-err-text--show" id="err-m-username">
                                {errors.username}
                            </span>
                        )}
                    </div>

                    {/* Designation */}
                    <div className="sg-field">
                        <label className="sg-label" htmlFor="m-designation">
                            Designation&nbsp;<span className="sg-label__req">*</span>
                        </label>
                        <div className="sg-inp-wrap">
                            <span className="sg-inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" />
                                    <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                                    <path d="M8 7V5a2 2 0 0 1 4 0v2" />
                                </svg>
                            </span>
                            <input id="m-designation"
                                className={`sg-inp${errors.designation ? " sg-inp--err" : ""}`}
                                type="text" placeholder="e.g. Manager, Director, CEO"
                                value={designation}
                                onChange={e => { setDesignation(e.target.value); clearErr(); }} />
                        </div>
                        {errors.designation && (
                            <span className="sg-err-text sg-err-text--show" id="err-m-designation">
                                {errors.designation}
                            </span>
                        )}
                    </div>

                    {/* Password */}
                    <div className="sg-field">
                        <label className="sg-label" htmlFor="m-password">
                            Password&nbsp;<span className="sg-label__req">*</span>
                            <span className="sg-label__opt">(min 8 chars)</span>
                        </label>
                        <div className="sg-inp-wrap">
                            <span className="sg-inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input id="m-password"
                                className={`sg-inp${errors.password ? " sg-inp--err" : ""}`}
                                type="password" placeholder="••••••••"
                                autoComplete="new-password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); clearErr(); }} />
                        </div>
                        {/* Strength bar */}
                        <div className="sg-pw-strength">
                            <div className="sg-pw-strength__bar" id="pw-bar"
                                style={{
                                    width: `${strength * 25}%`,
                                    background: PW_COLOURS[strength] || "#e8eeff",
                                }} />
                        </div>
                        {errors.password && (
                            <span className="sg-err-text sg-err-text--show" id="err-m-password">
                                {errors.password}
                            </span>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="sg-field">
                        <label className="sg-label" htmlFor="m-confirm">
                            Confirm Password&nbsp;<span className="sg-label__req">*</span>
                        </label>
                        <div className="sg-inp-wrap">
                            <span className="sg-inp-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input id="m-confirm"
                                className={`sg-inp${errors.confirm ? " sg-inp--err" : ""}`}
                                type="password" placeholder="Re-enter password"
                                autoComplete="new-password"
                                value={confirm}
                                onChange={e => { setConfirm(e.target.value); clearErr(); }} />
                        </div>
                        {errors.confirm && (
                            <span className="sg-err-text sg-err-text--show" id="err-m-confirm">
                                {errors.confirm}
                            </span>
                        )}
                    </div>

                    {/* Terms & Privacy */}
                    <label style={{
                        display: "flex", alignItems: "flex-start", gap: 9,
                        fontSize: "12.5px", color: "var(--sg-muted)",
                        cursor: "pointer", lineHeight: 1.5,
                    }}>
                        <input id="m-terms" type="checkbox" checked={terms}
                            onChange={e => { setTerms(e.target.checked); clearErr(); }}
                            style={{
                                marginTop: 2, accentColor: "var(--sg-blue-2)",
                                width: 14, height: 14, flexShrink: 0,
                            }} />
                        <span>
                            I agree to the{" "}
                            <a href="#" style={{ color: "var(--sg-blue-2)", fontWeight: 600 }}>
                                Terms of Service
                            </a>{" "}
                            and{" "}
                            <a href="#" style={{ color: "var(--sg-blue-2)", fontWeight: 600 }}>
                                Privacy Policy
                            </a>{" "}
                            of Anims Infocare Systems.
                        </span>
                    </label>
                    {errors.terms && (
                        <span className="sg-err-text sg-err-text--show" id="err-m-terms">
                            {errors.terms}
                        </span>
                    )}
                </div>

                <div className="sg-modal__foot">
                    <button type="button" className="sg-btn-cancel" onClick={onClose}>Cancel</button>
                    <button type="button" id="btn-signup"
                        className={`sg-btn-signup${loading ? " sg-btn-signup--loading" : ""}`}
                        onClick={handleSignup} disabled={loading}>
                        <span className="sg-btn-text">Sign Up</span>
                        <div className="sg-btn-spinner" />
                        <IconArrowBtn />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   SCREEN 3 — SUCCESS
   ================================================================ */
function SuccessScreen({ companyCode, adminUsername, onGoToLogin }) {
    const initials = adminUsername ? adminUsername.slice(0, 2).toUpperCase() : "AD";

    return (
        <div className="sg-screen sg-screen--active" id="screen-success">
            <div className="sg-success-card">

                <div className="sg-success__circle">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <polyline className="sg-checkmark"
                            points="8,20 16,28 32,12"
                            stroke="#fff" strokeWidth="3.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            strokeDasharray="60" strokeDashoffset="60"
                            style={{ animation: "sg-check-draw 0.5s ease 0.4s forwards" }} />
                    </svg>
                </div>

                <h2 className="sg-success__title">Account Created!</h2>
                <p className="sg-success__sub">
                    Welcome to Anims Business Analytics. Your company has been registered successfully.<br />
                    Use the details below to log in for the first time.
                </p>

                <div className="sg-success__code-box">
                    <p className="sg-success__code-label">Your Company Login Code</p>
                    <p className="sg-success__code-val" id="success-code">{companyCode}</p>
                    <p className="sg-success__code-note">
                        Save this code — it is your Organisation ID on the login screen.
                    </p>
                </div>

                <div className="sg-success__user-row">
                    <div className="sg-success__avatar" id="success-avatar">{initials}</div>
                    <div>
                        <p className="sg-success__uname" id="success-username">{adminUsername}</p>
                        <p className="sg-success__urole">Super Administrator</p>
                    </div>
                </div>

                <button className="sg-btn-login" onClick={onGoToLogin} type="button">
                    Go to Login
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor"
                            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/* ================================================================
   ROOT — SIGNUP PAGE
   ================================================================ */
export default function SignupPage() {
    const navigate = useNavigate();
    const [screen, setScreen] = useState("plans");
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedBilling, setSelectedBilling] = useState("yearly");
    const [successData, setSuccessData] = useState(null);

    /* Back button: from plans → login, from form → plans */
    const handleBack = () => {
        if (screen === "plans") {
            navigate("/");
        } else {
            setScreen("plans");
        }
    };

    const handlePlanSelect = useCallback((plan, billing) => {
        setSelectedPlan(plan);
        setSelectedBilling(billing);
        setScreen("form");
    }, []);

    const handleFormSubmit = useCallback(async (data) => {
        const payload = {
            company_code: data.code,
            company_name: data.form.companyName,
            business_name: data.form.businessName,
            person_name: data.form.personName,
            email: data.form.email,
            phone: data.form.phone,
            gst: data.form.gst,
            employees: data.form.employees,
            users: data.form.users,
            plan_id: selectedPlan ? selectedPlan.id : "free",
            plan_name: selectedPlan ? selectedPlan.name : "Free Plan",
            admin_username: data.adminData.username,
            admin_designation: data.adminData.designation,
            admin_password: data.adminData.password
        };

        const res = await fetch(`${API}/signup/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const resData = await res.json();
        if (!res.ok) {
            throw new Error(resData.error || "Failed to sign up.");
        }

        setSuccessData(data);
        setScreen("success");
    }, [selectedPlan]);

    return (
        <div className="sg-page">
            {/* Atmosphere blobs */}
            <div className="sg-blob sg-blob--tr" />
            <div className="sg-blob sg-blob--bl" />
            <div className="sg-blob sg-blob--tl" />

            {/* Fixed back button */}
            <button className="sg-back" onClick={handleBack} aria-label="Back">
                <IconBack />
                <span>Back to Login</span>
            </button>

            {/* Logo badge */}
            <div className="sg-logo-badge" title="Anims ERP">
                <img src="/Images/logo.png" alt="Anims ERP" />
            </div>

            {/* Screens — only the active screen is rendered */}
            {screen === "plans" && (
                <PlanScreen onPlanSelect={handlePlanSelect} />
            )}

            {screen === "form" && selectedPlan && (
                <FormScreen
                    selectedPlan={selectedPlan}
                    selectedBilling={selectedBilling}
                    onBack={() => setScreen("plans")}
                    onSubmit={handleFormSubmit}
                />
            )}

            {screen === "success" && successData && (
                <SuccessScreen
                    companyCode={successData.code}
                    adminUsername={successData.adminData.username}
                    onGoToLogin={() => navigate("/")}
                />
            )}
        </div>
    );
}