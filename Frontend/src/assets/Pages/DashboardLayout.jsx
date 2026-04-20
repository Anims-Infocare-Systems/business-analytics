import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardLayout.css";
import Dashboard1 from "./Dashboard1";
import Dashboard2 from "./Dashboard2";
import Charts from "./Charts";
import EApproval from "./EApproval";
import TApproval from "./TApproval";
import EfficiencyReport from "./EfficiencyReport";
import IdleTimeReport from "./IdleTimeReport";
import SalesAnalysis from "./SalesAnalysis";
import PurchaseAnalysis from "./PurchaseAnalysis";
import QualityAnalysis from "./QualityAnalysis";
import ProductionAnalysis from "./ProductionAnalysis";
import StoreAnalysis from "./StoreAnalysis";
import PackingDispatch from "./PackingDispatch";
import UserRights from "./UserRights";
import AnimsUtility from "./AnimsUtility";

/* ── Breakpoints ─────────────────────────────────────────── */
const BP_MOBILE = 768;
const BP_TABLET = 1024;
function getInitialExpanded() { return window.innerWidth >= BP_TABLET; }

/* ── Icons ───────────────────────────────────────────────── */
const Icons = {
    Dashboard:  () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
    Approvals:  () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>),
    Reports:    () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>),
    Dispatch:   () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="14" height="12" rx="1" /><path d="M16 10l4 2v5h-4" /><circle cx="6" cy="20" r="2" /><circle cx="18" cy="20" r="2" /></svg>),
    MIS:        () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="17" x2="8" y2="12" /><line x1="12" y1="17" x2="12" y2="8" /><line x1="16" y1="17" x2="16" y2="14" /></svg>),
    Charts:     () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,17 8,11 13,14 21,6" /><polyline points="17,6 21,6 21,10" /></svg>),
    Logout:     () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
    Chevron:    ({ open }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`dl-chevron ${open ? "dl-chevron--open" : ""}`}><polyline points="6,9 12,15 18,9" /></svg>),
    ChevronRight: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,6 15,12 9,18" /></svg>),
    Spinner:    () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /></svg>),
    SidebarExpand:   () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="13,9 17,12 13,15" /></svg>),
    SidebarCollapse: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="15,9 11,12 15,15" /></svg>),
    Utility:    () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>),
    Hamburger:  () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>),
    Close:      () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
};

const MENU_ITEMS = [
    {
        key: "Dashboard",
        icon: Icons.Dashboard,
        children: ["Dashboard1", "Dashboard2"],
    },
    {
        key: "Approvals",
        icon: Icons.Approvals,
        children: ["E-Approval", "T-Approval"],
    },
    {
        key: "Reports",
        icon: Icons.Reports,
        children: [
            "Sales Analysis",
            "Purchase Analysis",
            "Quality Analysis",
            "Production Analysis",
            "Store Analysis",
        ],
    },
    {
        key: "Dispatch / Packing",
        icon: Icons.Dispatch,
        children: [],
    },
    {
        key: "MIS",
        icon: Icons.MIS,
        children: ["Idle Time Report", "Efficiency Report"],
    },
    {
        key: "Charts",
        icon: Icons.Charts,
        children: [],
    },
    {
        key: "Utility",
        icon: Icons.Utility,
        children: ["User Rights", "Anims Utility"],
    },
];

/* ── Topbar heading map ───────────────────────────────────── */
const HEADING_MAP = {
    "Dashboard1":           "Top Management Dashboard",
    "Dashboard2":           "Plant Performance Dashboard",
    "E-Approval":           "E-Approval Workflow",
    "T-Approval":           "T-Approval Workflow",
    "Sales Analysis":       "Reports — Sales Analysis",
    "Purchase Analysis":    "Reports — Purchase Analysis",
    "Quality Analysis":     "Reports — Quality Analysis",
    "Production Analysis":  "Reports — Production Analysis",
    "Store Analysis":       "Reports — Store Analysis",
    "Dispatch / Packing":   "Packing & Dispatch Dashboard",
    "Idle Time Report":     "MIS — Idle Time Report",
    "Efficiency Report":    "MIS — Efficiency Report",
    "Charts":               "Advanced Analytics Dashboard",
    "User Rights":          "Utility — User Rights",
    "Anims Utility":        "Utility — Anims Utility",
};

/* ── Page content with fade+slide transition ─────────────── */
function PageContent({ activeSubItem, activeItem }) {
    const [visible, setVisible] = useState(true);
    const [content, setContent] = useState({ activeSubItem, activeItem });
    const prevKey = useRef(`${activeItem}__${activeSubItem}`);

    useEffect(() => {
        const newKey = `${activeItem}__${activeSubItem}`;
        if (newKey === prevKey.current) return;
        prevKey.current = newKey;
        setVisible(false);
        const t = setTimeout(() => {
            setContent({ activeSubItem, activeItem });
            setVisible(true);
        }, 190);
        return () => clearTimeout(t);
    }, [activeSubItem, activeItem]);

    const { activeSubItem: si, activeItem: ai } = content;

    let node;

    if      (si === "Dashboard1")           node = <Dashboard1 />;
    else if (si === "Dashboard2")           node = <Dashboard2 />;
    else if (si === "E-Approval")           node = <EApproval />;
    else if (si === "T-Approval")           node = <TApproval />;
    else if (si === "Sales Analysis")       node = <SalesAnalysis />;
    else if (si === "Purchase Analysis")    node = <PurchaseAnalysis />;
    else if (si === "Quality Analysis")     node = <QualityAnalysis />;
    else if (si === "Production Analysis")  node = <ProductionAnalysis />;
    else if (si === "Store Analysis")       node = <StoreAnalysis />;
    else if (ai === "Dispatch / Packing")   node = <PackingDispatch />;
    else if (si === "Idle Time Report")     node = <IdleTimeReport />;
    else if (si === "Efficiency Report")    node = <EfficiencyReport />;
    else if (ai === "Charts")               node = <Charts />;
    else if (si === "User Rights")          node = <UserRights />;
    else if (si === "Anims Utility")        node = <AnimsUtility />;
    else node = (
        <div className="dl-content__placeholder dl-content__placeholder--labeled">
            <div className="dl-placeholder-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
            </div>
            <p className="dl-placeholder-title">{si || ai}</p>
            <p className="dl-placeholder-sub">This page is under construction</p>
        </div>
    );

    return (
        <div className={`dl-page-wrap ${visible ? "dl-page-wrap--in" : "dl-page-wrap--out"}`}>
            {node}
        </div>
    );
}

/* ── Clock ───────────────────────────────────────────────── */
function Clock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const h    = time.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12  = String(h % 12 || 12).padStart(2, "0");
    const mm   = String(time.getMinutes()).padStart(2, "0");
    const ss   = String(time.getSeconds()).padStart(2, "0");

    return (
        <div className="dl-clock">
            <div className="dl-clock__time">
                <span className="dl-clock__seg">{h12}</span>
                <span className="dl-clock__colon">:</span>
                <span className="dl-clock__seg">{mm}</span>
                <span className="dl-clock__colon">:</span>
                <span className="dl-clock__seg dl-clock__seg--sec" key={ss}>{ss}</span>
                <span className="dl-clock__ampm"> {ampm}</span>
            </div>
            <div className="dl-clock__date">
                {DAYS[time.getDay()]} , {time.getDate()} {MONTHS[time.getMonth()]} {time.getFullYear()}
            </div>
        </div>
    );
}

/* ── Animated topbar heading ─────────────────────────────── */
function TopbarHeading({ text }) {
    const [displayed, setDisplayed] = useState(text);
    const [phase, setPhase]         = useState("idle");

    useEffect(() => {
        if (text === displayed) return;
        setPhase("out");
        const t1 = setTimeout(() => { setDisplayed(text); setPhase("in"); }, 200);
        const t2 = setTimeout(() => setPhase("idle"), 420);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [text]);

    return (
        <span className={`dl-topbar__heading dl-topbar__heading--${phase}`}>
            {displayed}
        </span>
    );
}

/* ── SidebarItem ─────────────────────────────────────────── */
function SidebarItem({ item, isActive, isOpen, isExpanded, isMobile, onToggle, onSubClick, activeSubItem, index }) {
    const [hovered,   setHovered]   = useState(false);
    const [rippleKey, setRippleKey] = useState(0);
    const leaveTimer = useRef(null);

    const IconComp    = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const showMenu    = isOpen || hovered;
    const collapsedMode = !isExpanded && !isMobile;

    const handleMouseEnter = () => { clearTimeout(leaveTimer.current); setHovered(true); };
    const handleMouseLeave = () => { leaveTimer.current = setTimeout(() => setHovered(false), 180); };
    useEffect(() => () => clearTimeout(leaveTimer.current), []);

    const handleSubSelect = (sub) => {
        clearTimeout(leaveTimer.current);
        setHovered(false);
        onSubClick(sub);
    };

    const handleDirectClick = () => {
        clearTimeout(leaveTimer.current);
        setHovered(false);
        onToggle(item.key);
    };

    const handleClick = () => {
        setRippleKey(k => k + 1);
        onToggle(item.key);
    };

    return (
        <div
            className="dl-sidebar__group"
            style={{ "--idx": index }}
            onMouseEnter={collapsedMode ? handleMouseEnter : undefined}
            onMouseLeave={collapsedMode ? handleMouseLeave : undefined}
        >
            <div
                className={`dl-sidebar__item ${isActive ? "dl-sidebar__item--active" : ""} ${showMenu ? "dl-sidebar__item--open" : ""}`}
                onClick={handleClick}
            >
                <span className="dl-ripple-wrap" key={rippleKey}><span className="dl-ripple" /></span>
                <span className="dl-sidebar__item-icon"><IconComp /></span>
                {isExpanded && (
                    <>
                        <span className="dl-sidebar__item-label">{item.key}</span>
                        {hasChildren && (
                            <span className="dl-sidebar__item-chevron">
                                <Icons.Chevron open={showMenu} />
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Expanded inline submenu */}
            {isExpanded && hasChildren && (
                <div className={`dl-submenu ${showMenu ? "dl-submenu--open" : ""}`}>
                    {item.children.map((sub, si) => (
                        <div
                            key={sub}
                            className={`dl-submenu__item ${activeSubItem === sub ? "dl-submenu__item--active" : ""}`}
                            style={{ "--si": si }}
                            onClick={() => handleSubSelect(sub)}
                        >
                            <span className="dl-submenu__dot" />
                            <span className="dl-submenu__label">{sub}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Collapsed flyout with children */}
            {collapsedMode && hasChildren && showMenu && (
                <div className="dl-flyout">
                    <div className="dl-flyout__bridge" />
                    <div className="dl-flyout__title">{item.key}</div>
                    {item.children.map((sub, si) => (
                        <div
                            key={sub}
                            className={`dl-flyout__item ${activeSubItem === sub ? "dl-flyout__item--active" : ""}`}
                            style={{ "--si": si }}
                            onClick={() => handleSubSelect(sub)}
                        >
                            <Icons.ChevronRight /><span>{sub}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Collapsed label-only flyout (direct pages) */}
            {collapsedMode && !hasChildren && hovered && (
                <div className="dl-flyout dl-flyout--label-only">
                    <div className="dl-flyout__bridge" />
                    <div className="dl-flyout__label-item" onClick={handleDirectClick}>
                        <Icons.ChevronRight /><span>{item.key}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── PromoCard ───────────────────────────────────────────── */
function PromoCard() {
    return (
        <div className="dl-promo">
            <div className="dl-promo__orb" />
            <p className="dl-promo__title">Improve Your Sales Efficiency</p>
            <div className="dl-promo__chart">
                <svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                        </linearGradient>
                    </defs>
                    <polygon
                        points="0,60 0,52 30,42 55,37 75,27 95,32 115,17 140,12 160,6 200,3 200,60"
                        fill="url(#pg)"
                    />
                    <polyline
                        points="0,52 30,42 55,37 75,27 95,32 115,17 140,12 160,6 200,3"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <button className="dl-promo__btn">
                <span>Start Now</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9,6 15,12 9,18" />
                </svg>
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   DashboardLayout — root component
   ══════════════════════════════════════════════════════════ */
export default function DashboardLayout() {
    const navigate = useNavigate();

    // ✅ Read logged-in company name from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const companyName = user.company || "Anims Infocare Systems";

    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const isMobile = screenWidth < BP_MOBILE;

    const [expanded,      setExpanded]      = useState(getInitialExpanded);
    const [drawerOpen,    setDrawerOpen]    = useState(false);
    const [openMenu,      setOpenMenu]      = useState("Dashboard");
    const [activeItem,    setActiveItem]    = useState("Dashboard");
    const [activeSubItem, setActiveSubItem] = useState("Dashboard1");
    const [mounted,       setMounted]       = useState(false);

    const sidebarRef = useRef(null);
    const contentRef = useRef(null);

    /* entrance animation gate */
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80);
        return () => clearTimeout(t);
    }, []);

    /* responsive resize handler */
    useEffect(() => {
        const onResize = () => {
            const w = window.innerWidth;
            setScreenWidth(w);
            if      (w >= BP_TABLET) { setExpanded(true);  setDrawerOpen(false); }
            else if (w >= BP_MOBILE) { setExpanded(false); setDrawerOpen(false); }
            else                     { setExpanded(true);  setDrawerOpen(false); }
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    /* scroll-to-top on navigation */
    useEffect(() => {
        if (contentRef.current)
            contentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }, [activeSubItem, activeItem]);

    /* close flyouts when clicking outside collapsed sidebar */
    useEffect(() => {
        const handler = (e) => {
            if (!expanded && !isMobile && sidebarRef.current && !sidebarRef.current.contains(e.target))
                setOpenMenu(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [expanded, isMobile]);

    /* parent-level toggle */
    const handleToggle = (key) => {
        const item = MENU_ITEMS.find(m => m.key === key);
        if (!item || item.children.length === 0) {
            setActiveItem(key);
            setActiveSubItem(null);
            setOpenMenu(null);
            if (isMobile) setDrawerOpen(false);
        } else {
            setOpenMenu(prev => prev === key ? null : key);
            setActiveItem(key);
        }
    };

    /* sub-item click */
    const handleSubClick = (sub) => {
        const parent = MENU_ITEMS.find(m => m.children?.includes(sub));
        if (parent) setActiveItem(parent.key);
        setActiveSubItem(sub);
        if (!expanded) setOpenMenu(null);
        if (isMobile)  setDrawerOpen(false);
    };

    const handleLogout  = () => navigate("/");
    const showExpanded  = isMobile ? true : expanded;
    const topbarHeading = activeSubItem
        ? (HEADING_MAP[activeSubItem] || activeSubItem)
        : (HEADING_MAP[activeItem]    || activeItem);

    return (
        <div className={`dl-root ${showExpanded ? "dl-root--expanded" : "dl-root--collapsed"}`}>

            {/* Mobile overlay */}
            {isMobile && drawerOpen && (
                <div className="dl-overlay" onClick={() => setDrawerOpen(false)} />
            )}

            {/* ── Sidebar ─────────────────────────────────── */}
            <aside
                ref={sidebarRef}
                className={[
                    "dl-sidebar",
                    showExpanded ? "dl-sidebar--expanded" : "dl-sidebar--collapsed",
                    isMobile  ? "dl-sidebar--mobile"      : "",
                    isMobile && drawerOpen ? "dl-sidebar--mobile-open" : "",
                    mounted   ? "dl-sidebar--mounted"     : "",
                ].join(" ")}
            >
                <div className="dl-sidebar__glow-stripe" />

                {/* Logo */}
                <div className="dl-sidebar__logo">
                    <div className="dl-sidebar__logo-box">
                        <img src="/Images/logo.png" alt="Anims ERP Logo" className="dl-sidebar__logo-img" />
                    </div>
                    {showExpanded && <span className="dl-sidebar__logo-name">Anims ERP</span>}
                </div>

                <div className="dl-sidebar__section-label">MENU</div>

                {/* Nav */}
                <nav className="dl-sidebar__nav">
                    {MENU_ITEMS.map((item, idx) => (
                        <SidebarItem
                            key={item.key}
                            item={item}
                            index={idx}
                            isActive={activeItem === item.key}
                            isOpen={openMenu === item.key}
                            isExpanded={showExpanded}
                            isMobile={isMobile}
                            onToggle={handleToggle}
                            onSubClick={handleSubClick}
                            activeSubItem={activeSubItem}
                        />
                    ))}

                    <div className="dl-sidebar__divider" />
                    <div className="dl-sidebar__section-label">OTHER</div>

                    <div className="dl-sidebar__item dl-sidebar__item--logout" onClick={handleLogout}>
                        <span className="dl-sidebar__item-icon"><Icons.Logout /></span>
                        {showExpanded && <span className="dl-sidebar__item-label">Logout</span>}
                    </div>
                </nav>

                {/* Collapse / expand toggle (desktop only) */}
                {!isMobile && (
                    <button
                        className={`dl-sidebar__toggle-btn ${expanded ? "dl-sidebar__toggle-btn--right" : "dl-sidebar__toggle-btn--center"}`}
                        onClick={() => { setExpanded(e => !e); setOpenMenu(null); }}
                        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {expanded ? <Icons.SidebarCollapse /> : <Icons.SidebarExpand />}
                    </button>
                )}

                {showExpanded && <PromoCard />}
            </aside>

            {/* ── Main area ────────────────────────────────── */}
            <div className="dl-main">

                {/* Header */}
                <header className="dl-header">
                    {isMobile && (
                        <button
                            className={`dl-hamburger ${drawerOpen ? "dl-hamburger--open" : ""}`}
                            onClick={() => setDrawerOpen(o => !o)}
                            aria-label="Toggle menu"
                        >
                            {drawerOpen ? <Icons.Close /> : <Icons.Hamburger />}
                        </button>
                    )}
                    {/* ✅ Dynamic company name from localStorage */}
                    <h1 className="dl-header__title">{companyName}</h1>
                    <Clock />
                </header>

                {/* Topbar */}
                <div className="dl-topbar">
                    <div className="dl-topbar__inner">
                        <span className="dl-topbar__spinner-icon"><Icons.Spinner /></span>
                        <TopbarHeading text={topbarHeading} />
                        <div className="dl-topbar__actions" />
                    </div>
                </div>

                {/* Content */}
                <main className="dl-content" ref={contentRef}>
                    <PageContent activeSubItem={activeSubItem} activeItem={activeItem} />
                </main>
            </div>
        </div>
    );
}