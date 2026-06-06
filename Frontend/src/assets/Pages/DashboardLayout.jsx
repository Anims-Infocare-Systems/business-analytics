import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { resolveApiBase } from "../../apiBase";
import "./DashboardLayout.css";

const API = resolveApiBase();
import Dashboard1 from "./Dashboard1";
import Dashboard2 from "./Dashboard2";
import Dashboard3 from "./Dashboard3";
import Charts from "./Charts";
import EApproval from "./EApproval";
import TApproval from "./TApproval";
import EfficiencyReport from "./EfficiencyReport";
import IdleTimeReport from "./IdleTimeReport";
import SalesAnalysis from "./SalesAnalysis";
import PurchaseAnalysis from "./PurchaseAnalysis";
import QualityAnalysis from "./QualityAnalysis";
import ProductionAnalysis from "./ProductionAnalysis";
import UserRights from "./UserRights";
import Settings from "./Settings";
import Welcome from "./Welcome";

/* ── Breakpoints ─────────────────────────────────────────── */
const BP_MOBILE = 768;
const BP_TABLET = 1024;
function getInitialExpanded() { return window.innerWidth >= BP_TABLET; }

/* ── Icons ───────────────────────────────────────────────── */
const Icons = {
    Dashboard: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
    Approvals: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>),
    Reports: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></svg>),
    MIS: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="17" x2="8" y2="12" /><line x1="12" y1="17" x2="12" y2="8" /><line x1="16" y1="17" x2="16" y2="14" /></svg>),
    Charts: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,17 8,11 13,14 21,6" /><polyline points="17,6 21,6 21,10" /></svg>),
    Logout: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
    Setting: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
    Chevron: ({ open }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`dl-chevron ${open ? "dl-chevron--open" : ""}`}><polyline points="6,9 12,15 18,9" /></svg>),
    ChevronRight: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9,6 15,12 9,18" /></svg>),
    Spinner: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /></svg>),
    SidebarExpand: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="13,9 17,12 13,15" /></svg>),
    SidebarCollapse: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="15,9 11,12 15,15" /></svg>),
    Utility: () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>),
    Hamburger: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>),
    Close: () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>),
};

const MENU_ITEMS = [
    {
        key: "Dashboard",
        icon: Icons.Dashboard,
        children: ["Top Management Dashboard", "Plant Performance Dashboard"],
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
        ],
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
        children: ["User Rights"],
    },
];

/* ── Topbar heading map ───────────────────────────────────── */
const HEADING_MAP = {
    "Top Management Dashboard": "Top Management Dashboard",
    "Dashboard2": "Plant Performance Dashboard",
    "Plant Performance Dashboard": "Plant Performance Dashboard",
    "E-Approval": "E-Approval Workflow",
    "T-Approval": "T-Approval Workflow",
    "Sales Analysis": "Reports — Sales Analysis",
    "Purchase Analysis": "Reports — Purchase Analysis",
    "Quality Analysis": "Reports — Quality Analysis",
    "Production Analysis": "Reports — Production Analysis",
    "Idle Time Report": "MIS — Idle Time Report",
    "Efficiency Report": "MIS — Efficiency Report",
    "Charts": "Charts & Visualizations",
    "User Rights": "Utility — User Rights",
    "Settings": "Settings",
    "Welcome": "Workspace Overview",
};

/* ── Page content with fade+slide transition ─────────────── */
function PageContent({ activeSubItem, activeItem, onNavigate, userName, companyName, userRights, isSuperAdmin }) {
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

    if (ai === "Welcome") node = <Welcome userName={userName} companyName={companyName} onNavigate={onNavigate} userRights={userRights} isSuperAdmin={isSuperAdmin} />;
    else if (si === "Top Management Dashboard") node = <Dashboard1 />;
    else if (si === "Dashboard2") node = <Dashboard2 />;
    else if (si === "Plant Performance Dashboard") node = <Dashboard3 />;
    else if (si === "E-Approval") node = <EApproval />;
    else if (si === "T-Approval") node = <TApproval />;
    else if (si === "Sales Analysis") node = <SalesAnalysis />;
    else if (si === "Purchase Analysis") node = <PurchaseAnalysis />;
    else if (si === "Quality Analysis") node = <QualityAnalysis />;
    else if (si === "Production Analysis") node = <ProductionAnalysis />;
    else if (si === "Idle Time Report") node = <IdleTimeReport />;
    else if (si === "Efficiency Report") node = <EfficiencyReport />;
    else if (ai === "Charts") node = <Charts />;
    else if (si === "User Rights") node = <UserRights />;
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

    const isPlant = si === "Plant Performance Dashboard";

    return (
        <div className={`dl-page-wrap ${visible ? "dl-page-wrap--in" : "dl-page-wrap--out"}${isPlant ? " dl-page-wrap--plant" : ""}`}>
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

    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const h = time.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = String(h % 12 || 12).padStart(2, "0");
    const mm = String(time.getMinutes()).padStart(2, "0");
    const ss = String(time.getSeconds()).padStart(2, "0");

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
    const [phase, setPhase] = useState("idle");

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
    const [hovered, setHovered] = useState(false);
    const [rippleKey, setRippleKey] = useState(0);
    const leaveTimer = useRef(null);

    const IconComp = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const showMenu = isOpen || hovered;
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


/* ══════════════════════════════════════════════════════════
   DashboardLayout — root component
   ══════════════════════════════════════════════════════════ */
/* ── sessionStorage nav helpers ─────────────────────────── */
const NAV_KEY = "ba_nav";
function readNav() {
    try {
        const raw = sessionStorage.getItem(NAV_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function writeNav(data) {
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify(data)); } catch {}
}

export default function DashboardLayout() {
    const navigate = useNavigate();

    // ✅ Read logged-in company name from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAuthenticated = !!user.username;
    const companyName = user.company || "Anims Infocare Systems";
    const userName = user.username || "User";
    const userInitials = (userName.slice(0, 2) || "US").toUpperCase();
    const [userDesignation, setUserDesignation] = useState(user.designation || "Staff");
    const [isExpired, setIsExpired] = useState(() => {
        const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
        return !!cachedUser.isExpired;
    });

    // ✅ Filter menu items based on cached user rights
    const rightsCache = JSON.parse(localStorage.getItem("ba_user_rights") || "{}");
    const userRights = rightsCache.rights || {};
    const isSuperAdmin = !!rightsCache.isSuperAdmin;

    const allowedMenuItems = MENU_ITEMS.filter(item => isSuperAdmin || userRights[item.key]);

    const firstAllowed = allowedMenuItems[0];
    const defaultItem = firstAllowed ? firstAllowed.key : "Dashboard";
    const defaultSubItem = (firstAllowed && firstAllowed.children && firstAllowed.children.length > 0)
        ? firstAllowed.children[0]
        : null;

    // ✅ Restore navigation from sessionStorage (survives F5 refresh)
    const savedNav = readNav();
    const initItem    = savedNav?.activeItem    ?? "Welcome";
    const initSubItem = savedNav?.activeSubItem ?? null;
    const initMenu    = savedNav?.openMenu      ?? null;

    const [screenWidth, setScreenWidth] = useState(window.innerWidth);
    const isMobile = screenWidth < BP_MOBILE;

    const [expanded, setExpanded] = useState(getInitialExpanded);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState(initMenu);
    const [activeItem, setActiveItem] = useState(initItem);
    const [activeSubItem, setActiveSubItem] = useState(initSubItem);
    const [mounted, setMounted] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(() => {
        try { return sessionStorage.getItem("ba_settings_open") === "1"; }
        catch { return false; }
    });

    const sidebarRef = useRef(null);
    const contentRef = useRef(null);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileRef = useRef(null);

    /* entrance animation gate */
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80);
        return () => clearTimeout(t);
    }, []);

    /* persist settingsOpen to sessionStorage */
    useEffect(() => {
        try { sessionStorage.setItem("ba_settings_open", settingsOpen ? "1" : "0"); } catch {}
    }, [settingsOpen]);

    /* fetch fresh user designation dynamically from backend to heal legacy/stale localstorage caches */
    useEffect(() => {
        fetch(`${API}/user-rights/me/`, { credentials: "include" })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Failed to fetch profile");
            })
            .then(data => {
                if (data.success) {
                    if (data.designation) {
                        setUserDesignation(data.designation);
                    }
                    setIsExpired(!!data.isExpired);
                    // Sync designation and expiry status with localStorage cache
                    const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
                    if (data.designation) cachedUser.designation = data.designation;
                    cachedUser.isExpired = !!data.isExpired;
                    localStorage.setItem("user", JSON.stringify(cachedUser));
                }
            })
            .catch(() => { /* fallback to static initialDesignation */ });
    }, []);
 
    /* Background heartbeat to check session validity and trigger auto-logout if terminated from elsewhere */
    useEffect(() => {
        const checkSession = () => {
            fetch(`${API}/user-rights/me/`, { credentials: "include" })
                .catch(() => {});
        };
        const interval = setInterval(checkSession, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, []);

    /* responsive resize handler */
    useEffect(() => {
        const onResize = () => {
            const w = window.innerWidth;
            setScreenWidth(w);
            if (w >= BP_TABLET) { setExpanded(true); setDrawerOpen(false); }
            else if (w >= BP_MOBILE) { setExpanded(false); setDrawerOpen(false); }
            else { setExpanded(true); setDrawerOpen(false); }
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

    /* close profile dropdown when clicking outside */
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (profileDropdownOpen && profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [profileDropdownOpen]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate]);

    /* parent-level toggle */
    const handleToggle = (key) => {
        if (key === "Settings") {
            setSettingsOpen(true);
            return;
        }
        const item = MENU_ITEMS.find(m => m.key === key);
        if (!item || item.children.length === 0) {
            setActiveItem(key);
            setActiveSubItem(null);
            setOpenMenu(null);
            writeNav({ activeItem: key, activeSubItem: null, openMenu: null });
            if (isMobile) setDrawerOpen(false);
        } else {
            const nextMenu = openMenu === key ? null : key;
            setOpenMenu(nextMenu);
            setActiveItem(key);
            writeNav({ activeItem: key, activeSubItem, openMenu: nextMenu });
        }
    };

    /* sub-item click */
    const handleSubClick = (sub) => {
        const parent = MENU_ITEMS.find(m => m.children?.includes(sub));
        const parentKey = parent ? parent.key : activeItem;
        if (parent) setActiveItem(parentKey);
        setActiveSubItem(sub);
        const nextMenu = expanded ? openMenu : null;
        if (!expanded) setOpenMenu(null);
        if (isMobile) setDrawerOpen(false);
        writeNav({ activeItem: parentKey, activeSubItem: sub, openMenu: nextMenu });
    };

    const handleLogout = () => {
        try {
            sessionStorage.clear();
            localStorage.removeItem("user");
            localStorage.removeItem("ba_user_rights");
            localStorage.removeItem("ba_settings_profile");
        } catch {}
        navigate("/", { replace: true });

        fetch(`${API}/logout/`, { method: "POST", credentials: "include" })
            .catch(err => console.error("Error logging out from backend:", err));
    };
    const showExpanded = isMobile ? true : expanded;
    const topbarHeading = activeSubItem
        ? (HEADING_MAP[activeSubItem] || activeSubItem)
        : (HEADING_MAP[activeItem] || activeItem);

    if (!isAuthenticated) return null;

    if (isExpired) {
        return (
            <div className="dl-expired-screen">
                <div className="dl-expired-card">
                    <div className="dl-expired-logo">
                        <img src="/Images/logo.png" alt="Anims ERP Logo" className="dl-expired-logo-img" />
                    </div>
                    <div className="dl-expired-icon-container">
                        <div className="dl-expired-icon-bg">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="dl-expired-title">Subscription Expired</h1>
                    <p className="dl-expired-text">
                        The subscription plan for <strong>{companyName}</strong> has expired. To restore access to your dashboards and reports, please renew or upgrade your plan.
                    </p>
                    <div className="dl-expired-details">
                        <div className="dl-expired-detail-row">
                            <span className="dl-expired-detail-label">Workspace Code:</span>
                            <span className="dl-expired-detail-value">{user.company_code || "—"}</span>
                        </div>
                    </div>
                    <div className="dl-expired-actions">
                        {isSuperAdmin && (
                            <button className="dl-expired-btn dl-expired-btn--upgrade" onClick={() => setSettingsOpen(true)}>
                                <Icons.Setting />
                                <span>Renewal / Upgrade Subscription</span>
                            </button>
                        )}
                        <button className="dl-expired-btn dl-expired-btn--logout" onClick={handleLogout}>
                            <Icons.Logout />
                            <span>Logout</span>
                        </button>
                    </div>
                    <div className="dl-expired-footer">
                        <p>Need help? Contact our support team at <a href="mailto:support@animse.com">support@animse.com</a></p>
                    </div>
                </div>
                {/* Settings Overlay Modal in Expired Mode */}
                <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} isExpiredMode={true} />
            </div>
        );
    }

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
                    isMobile ? "dl-sidebar--mobile" : "",
                    isMobile && drawerOpen ? "dl-sidebar--mobile-open" : "",
                    mounted ? "dl-sidebar--mounted" : "",
                ].join(" ")}
                onClick={(e) => {
                    if (isMobile) return;
                    const target = e.target;
                    if (target.closest('.dl-sidebar__item') ||
                        target.closest('.dl-submenu__item') ||
                        target.closest('.dl-sidebar__collapse-btn') ||
                        target.closest('.dl-sidebar__logo') ||
                        target.closest('.dl-flyout')
                    ) {
                        return;
                    }
                    setExpanded(prev => !prev);
                    setOpenMenu(null);
                }}
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
                    {allowedMenuItems.map((item, idx) => (
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

                    <SidebarItem
                        item={{
                            key: "Settings",
                            icon: Icons.Setting,
                            children: []
                        }}
                        index={allowedMenuItems.length}
                        isActive={activeItem === "Settings"}
                        isOpen={false}
                        isExpanded={showExpanded}
                        isMobile={isMobile}
                        onToggle={handleToggle}
                        onSubClick={() => {}}
                        activeSubItem={null}
                    />

                    <div className="dl-sidebar__item dl-sidebar__item--logout" onClick={handleLogout}>
                        <span className="dl-sidebar__item-icon"><Icons.Logout /></span>
                        {showExpanded && <span className="dl-sidebar__item-label">Logout</span>}
                    </div>
                </nav>

                {/* ── Collapse / expand toggle (desktop only) — bottom of sidebar ── */}
                {!isMobile && (
                    <button
                        className="dl-sidebar__collapse-btn"
                        onClick={() => { setExpanded(e => !e); setOpenMenu(null); }}
                        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {expanded
                            ? <><Icons.SidebarCollapse /><span className="dl-sidebar__collapse-label">Collapse</span></>
                            : <Icons.SidebarExpand />}
                    </button>
                )}
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
                    <div className="dl-header__right">
                        <Clock />
                        <div
                            ref={profileRef}
                            className={`dl-header__profile ${profileDropdownOpen ? "dl-header__profile--active" : ""}`}
                            onClick={() => setProfileDropdownOpen(open => !open)}
                        >
                            <div className="dl-header__profile-avatar">{userInitials}</div>
                            <div className="dl-header__profile-info">
                                <span className="dl-header__profile-name">{userName}</span>
                                <span className="dl-header__profile-designation">{userDesignation}</span>
                            </div>
                            {profileDropdownOpen && (
                                <div className="dl-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="dl-profile-dropdown__item"
                                        onClick={() => {
                                            setSettingsOpen(true);
                                            setProfileDropdownOpen(false);
                                        }}
                                    >
                                        <span className="dl-profile-dropdown__item-icon"><Icons.Setting /></span>
                                        <span className="dl-profile-dropdown__item-label">Settings</span>
                                    </button>
                                    <div className="dl-profile-dropdown__divider" />
                                    <button
                                        className="dl-profile-dropdown__item dl-profile-dropdown__item--logout"
                                        onClick={() => {
                                            handleLogout();
                                            setProfileDropdownOpen(false);
                                        }}
                                    >
                                        <span className="dl-profile-dropdown__item-icon"><Icons.Logout /></span>
                                        <span className="dl-profile-dropdown__item-label">Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
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
                    <PageContent
                        activeSubItem={activeSubItem}
                        activeItem={activeItem}
                        onNavigate={handleSubClick}
                        userName={userName}
                        companyName={companyName}
                        userRights={userRights}
                        isSuperAdmin={isSuperAdmin}
                    />
                </main>
            </div>

            {/* Settings Overlay Modal */}
            <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    );
}