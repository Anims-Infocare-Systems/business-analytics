import { useEffect, useMemo, useState } from "react";
import {
    LayoutDashboard,
    Factory,
    ClipboardCheck,
    BarChart3,
    FileSpreadsheet,
    TrendingUp,
    Settings,
    Users,
    ArrowUpRight,
    Sparkles,
    Shield,
    CalendarDays,
} from "lucide-react";
import "./Welcome.css";

const SHORTCUTS = [
    {
        id: "dashboard",
        title: "Management Dashboard",
        desc: "KPIs, sales, purchase & quality at a glance",
        target: "Top Management Dashboard",
        icon: LayoutDashboard,
        tone: "blue",
        rightKey: "Dashboard",
    },
    {
        id: "plant",
        title: "Plant Performance",
        desc: "Shop-floor efficiency, shifts & production metrics",
        target: "Plant Performance Dashboard",
        icon: Factory,
        tone: "cyan",
        rightKey: "Plant Performance Dashboard",
        fallbackKey: "Dashboard",
    },
    {
        id: "approvals",
        title: "Approvals",
        desc: "E-Approval & T-Approval workflows",
        target: "E-Approval",
        icon: ClipboardCheck,
        tone: "emerald",
        rightKey: "Approvals",
    },
    {
        id: "reports",
        title: "Reports",
        desc: "Sales, purchase, quality & production analysis",
        target: "Sales Analysis",
        icon: FileSpreadsheet,
        tone: "amber",
        rightKey: "Reports",
        proBlocked: true,
    },
    {
        id: "mis",
        title: "MIS",
        desc: "Idle time & efficiency operational reports",
        target: "Idle Time Report",
        icon: BarChart3,
        tone: "violet",
        rightKey: "MIS",
    },
    {
        id: "charts",
        title: "Analytics Charts",
        desc: "Trend visuals and comparative insights",
        target: "Charts",
        icon: TrendingUp,
        tone: "rose",
        rightKey: "Charts",
    },
    {
        id: "users",
        title: "User Rights",
        desc: "Manage team access and module permissions",
        target: "User Rights",
        icon: Users,
        tone: "indigo",
        rightKey: "Utility",
    },
    {
        id: "settings",
        title: "Settings",
        desc: "Profile, security & subscription management",
        target: "Settings",
        icon: Settings,
        tone: "slate",
        always: true,
    },
];

function getGreeting(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function formatToday() {
    return new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatTime() {
    return new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function Welcome({
    userName,
    companyName,
    onNavigate,
    userRights = {},
    isSuperAdmin = false,
}) {
    const [greeting, setGreeting] = useState("Welcome");
    const [clock, setClock] = useState(formatTime());

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setGreeting(getGreeting(now.getHours()));
            setClock(formatTime());
        };
        tick();
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, []);

    const planId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            return (user.plan_id || "free").toLowerCase().trim();
        } catch {
            return "free";
        }
    }, []);

    const hasAccess = (item) => {
        if (item.always) return true;
        if (item.proBlocked && planId === "pro") return false;
        if (isSuperAdmin) return true;
        if (item.rightKey && userRights?.[item.rightKey]) return true;
        if (item.fallbackKey && userRights?.[item.fallbackKey]) return true;
        return false;
    };

    const shortcuts = useMemo(
        () => SHORTCUTS.filter(hasAccess),
        [userRights, isSuperAdmin, planId],
    );

    const moduleCount = useMemo(() => {
        const keys = Object.keys(userRights || {}).filter((k) => userRights[k]);
        return isSuperAdmin ? keys.length || shortcuts.length : keys.length;
    }, [userRights, isSuperAdmin, shortcuts.length]);

    const initials = (userName?.slice(0, 2) || "US").toUpperCase();

    const openShortcut = (target) => {
        if (typeof onNavigate === "function") onNavigate(target);
    };

    return (
        <div className="wh-page">
            <div className="wh-hero">
                <div className="wh-hero__mesh" aria-hidden="true" />
                <div className="wh-hero__inner">
                    <div className="wh-hero__left">
                        <span className="wh-hero__eyebrow">
                            <Sparkles size={14} />
                            Anims Business Analytics
                        </span>
                        <h1 className="wh-hero__title">
                            {greeting}, <span>{userName}</span>
                        </h1>
                        <p className="wh-hero__sub">
                            Your workspace for <strong>{companyName}</strong> is ready.
                        </p>
                    </div>

                    <div className="wh-hero__right">
                        <div className="wh-profile-chip">
                            <div className="wh-profile-chip__avatar">{initials}</div>
                            <div className="wh-profile-chip__meta">
                                <span className="wh-profile-chip__name">{userName}</span>
                                <span className="wh-profile-chip__role">
                                    {isSuperAdmin ? "Super Admin" : "Team Member"}
                                </span>
                            </div>
                        </div>
                        <div className="wh-live-pill">
                            <span className="wh-live-pill__dot" />
                            ERP Connected
                        </div>
                    </div>
                </div>
            </div>

            <div className="wh-kpi-row">
                <div className="wh-kpi">
                    <span className="wh-kpi__icon wh-kpi__icon--blue">
                        <Shield size={18} />
                    </span>
                    <div>
                        <span className="wh-kpi__label">Organization</span>
                        <span className="wh-kpi__value">{companyName}</span>
                    </div>
                </div>
                <div className="wh-kpi">
                    <span className="wh-kpi__icon wh-kpi__icon--emerald">
                        <LayoutDashboard size={18} />
                    </span>
                    <div>
                        <span className="wh-kpi__label">Accessible Modules</span>
                        <span className="wh-kpi__value">{moduleCount || shortcuts.length}</span>
                    </div>
                </div>
                <div className="wh-kpi">
                    <span className="wh-kpi__icon wh-kpi__icon--violet">
                        <CalendarDays size={18} />
                    </span>
                    <div>
                        <span className="wh-kpi__label">Today · {clock}</span>
                        <span className="wh-kpi__value wh-kpi__value--sm">{formatToday()}</span>
                    </div>
                </div>
            </div>

            <section className="wh-section">
                <header className="wh-section__head">
                    <div>
                        <h2 className="wh-section__title">Quick Access</h2>
                        <p className="wh-section__desc">
                            Jump into the modules assigned to your account
                        </p>
                    </div>
                    <span className="wh-section__count">{shortcuts.length} available</span>
                </header>

                {shortcuts.length === 0 ? (
                    <div className="wh-empty">
                        <Shield size={32} strokeWidth={1.5} />
                        <p>No modules are assigned to your profile yet.</p>
                        <span>Contact your administrator to request access.</span>
                    </div>
                ) : (
                    <div className="wh-bento">
                        {shortcuts.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`wh-tile wh-tile--${item.tone}`}
                                    style={{ "--i": idx }}
                                    onClick={() => openShortcut(item.target)}
                                >
                                    <span className="wh-tile__glow" aria-hidden="true" />
                                    <span className="wh-tile__icon">
                                        <Icon size={22} strokeWidth={1.75} />
                                    </span>
                                    <span className="wh-tile__body">
                                        <span className="wh-tile__title">{item.title}</span>
                                        <span className="wh-tile__desc">{item.desc}</span>
                                    </span>
                                    <span className="wh-tile__go" aria-hidden="true">
                                        <ArrowUpRight size={18} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
