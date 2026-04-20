/**
 * AnimsUtility.jsx  —  Admin / Developer Client Monitor
 * Prefix: au-
 *
 * Shows all registered tenant companies, their real-time tunnel/session
 * status, last login, active users, and data-sync health — all driven
 * from the multi-tenant CompanyMaster model described in the BRD.
 */
import { useState, useEffect, useRef } from "react";
import "./AnimsUtility.css";

/* ─────────────────────────────────────────────────────────────
   MOCK DATA  (replace with Django REST API calls in production)
   Matches: CompanyMaster → CompanyCode, CompanyName, Status, …
   ───────────────────────────────────────────────────────────── */
const MOCK_CLIENTS = [
    {
        id: 1,
        code: "ANIMS001",
        name: "Anims Infocare Systems",
        industry: "IT Services",
        plan: "Enterprise",
        tunnel: "connected",
        status: "active",
        activeUsers: 8,
        totalUsers: 12,
        lastLogin: new Date(Date.now() - 4 * 60 * 1000),       // 4 min ago
        lastSync: new Date(Date.now() - 2 * 60 * 1000),
        syncHealth: 98,
        location: "Chennai, TN",
        modules: ["Dashboard", "Approvals", "Charts", "Reports", "MIS"],
        joinedDate: "Jan 2025",
        apiCalls: 1842,
        avatar: "AI",
        color: "#3b82f6",
    },
    {
        id: 2,
        code: "NAHATAL",
        name: "Nahatal Alloys Pvt Ltd",
        industry: "Manufacturing",
        plan: "Professional",
        tunnel: "connected",
        status: "active",
        activeUsers: 3,
        totalUsers: 6,
        lastLogin: new Date(Date.now() - 22 * 60 * 1000),      // 22 min ago
        lastSync: new Date(Date.now() - 8 * 60 * 1000),
        syncHealth: 94,
        location: "Coimbatore, TN",
        modules: ["Dashboard", "Charts", "Reports"],
        joinedDate: "Nov 2024",
        apiCalls: 763,
        avatar: "NA",
        color: "#10b981",
    },
    {
        id: 3,
        code: "PRIMECAST",
        name: "Primecast Foundries",
        industry: "Foundry",
        plan: "Professional",
        tunnel: "connected",
        status: "active",
        activeUsers: 5,
        totalUsers: 9,
        lastLogin: new Date(Date.now() - 55 * 60 * 1000),      // 55 min ago
        lastSync: new Date(Date.now() - 30 * 60 * 1000),
        syncHealth: 87,
        location: "Madurai, TN",
        modules: ["Dashboard", "Approvals", "MIS"],
        joinedDate: "Feb 2025",
        apiCalls: 1124,
        avatar: "PF",
        color: "#f97316",
    },
    {
        id: 4,
        code: "STELLARMC",
        name: "Stellar Machine Works",
        industry: "Engineering",
        plan: "Starter",
        tunnel: "disconnected",
        status: "inactive",
        activeUsers: 0,
        totalUsers: 4,
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000),  // 3 h ago
        lastSync: new Date(Date.now() - 3 * 60 * 60 * 1000),
        syncHealth: 0,
        location: "Trichy, TN",
        modules: ["Dashboard", "Charts"],
        joinedDate: "Mar 2025",
        apiCalls: 342,
        avatar: "SM",
        color: "#8b5cf6",
    },
    {
        id: 5,
        code: "CROWNCAST",
        name: "Crown Castings Ltd",
        industry: "Casting",
        plan: "Enterprise",
        tunnel: "reconnecting",
        status: "warning",
        activeUsers: 1,
        totalUsers: 7,
        lastLogin: new Date(Date.now() - 90 * 60 * 1000),      // 90 min ago
        lastSync: new Date(Date.now() - 75 * 60 * 1000),
        syncHealth: 61,
        location: "Salem, TN",
        modules: ["Dashboard", "Approvals", "Charts", "Reports"],
        joinedDate: "Dec 2024",
        apiCalls: 589,
        avatar: "CC",
        color: "#ec4899",
    },
    {
        id: 6,
        code: "VGPRESS",
        name: "VG Press Components",
        industry: "Press Shop",
        plan: "Starter",
        tunnel: "disconnected",
        status: "inactive",
        activeUsers: 0,
        totalUsers: 3,
        lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2d ago
        lastSync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        syncHealth: 0,
        location: "Hosur, TN",
        modules: ["Dashboard"],
        joinedDate: "Feb 2025",
        apiCalls: 98,
        avatar: "VG",
        color: "#06b6d4",
    },
];

/* Activity feed (recent cross-tenant events) */
const ACTIVITY_FEED = [
    { id: 1, type: "login",    code: "ANIMS001",  name: "Anims Infocare",    user: "Admin",    time: new Date(Date.now() - 4*60*1000),   msg: "logged in" },
    { id: 2, type: "sync",     code: "NAHATAL",   name: "Nahatal Alloys",    user: "System",   time: new Date(Date.now() - 8*60*1000),   msg: "data synced" },
    { id: 3, type: "login",    code: "PRIMECAST", name: "Primecast",         user: "Pratheep", time: new Date(Date.now() - 14*60*1000),  msg: "logged in" },
    { id: 4, type: "warning",  code: "CROWNCAST", name: "Crown Castings",    user: "Tunnel",   time: new Date(Date.now() - 32*60*1000),  msg: "tunnel reconnecting" },
    { id: 5, type: "login",    code: "ANIMS001",  name: "Anims Infocare",    user: "Sabarish", time: new Date(Date.now() - 45*60*1000),  msg: "logged in" },
    { id: 6, type: "disconnect",code:"STELLARMC", name: "Stellar Machine",   user: "Tunnel",   time: new Date(Date.now() - 3*60*60*1000),msg: "tunnel disconnected" },
    { id: 7, type: "sync",     code: "PRIMECAST", name: "Primecast",         user: "System",   time: new Date(Date.now() - 30*60*1000),  msg: "data synced" },
    { id: 8, type: "login",    code: "NAHATAL",   name: "Nahatal Alloys",    user: "Pranesh",  time: new Date(Date.now() - 22*60*1000),  msg: "logged in" },
];

/* ── Helpers ────────────────────────────────────────────────── */
function timeAgo(date) {
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function useTick(ms = 30000) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), ms);
        return () => clearInterval(t);
    }, [ms]);
}

/* ── Tunnel badge ─────────────────────────────────────────────*/
function TunnelBadge({ status }) {
    const map = {
        connected:    { label: "Connected",    cls: "au-tunnel--ok"   },
        disconnected: { label: "Offline",      cls: "au-tunnel--off"  },
        reconnecting: { label: "Reconnecting", cls: "au-tunnel--warn" },
    };
    const { label, cls } = map[status] || map.disconnected;
    return (
        <span className={`au-tunnel ${cls}`}>
            <span className="au-tunnel__dot" />
            {label}
        </span>
    );
}

/* ── Health bar ───────────────────────────────────────────────*/
function HealthBar({ pct }) {
    const color = pct >= 90 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
    return (
        <div className="au-health">
            <div className="au-health__track">
                <div
                    className="au-health__fill"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
            <span className="au-health__label" style={{ color }}>{pct}%</span>
        </div>
    );
}

/* ── Stat card ────────────────────────────────────────────────*/
function StatCard({ icon, label, value, sub, color, delay, pulse }) {
    return (
        <div className="au-stat" style={{ "--sc": color, animationDelay: delay }}>
            <div className="au-stat__icon" style={{ background: color + "18" }}>
                {pulse && <span className="au-stat__pulse" style={{ "--pc": color }} />}
                <span>{icon}</span>
            </div>
            <div className="au-stat__body">
                <span className="au-stat__value">{value}</span>
                <span className="au-stat__label">{label}</span>
            </div>
            {sub && <span className="au-stat__sub">{sub}</span>}
            <div className="au-stat__glow" />
        </div>
    );
}

/* ── Activity type icon ───────────────────────────────────────*/
function ActivityIcon({ type }) {
    const icons = {
        login:      { icon: "→", color: "#3b82f6" },
        sync:       { icon: "↻", color: "#10b981" },
        warning:    { icon: "⚠", color: "#f59e0b" },
        disconnect: { icon: "✕", color: "#ef4444" },
    };
    const { icon, color } = icons[type] || icons.login;
    return (
        <span className="au-act-icon" style={{ background: color + "18", color }}>
            {icon}
        </span>
    );
}

/* ── Detail drawer ────────────────────────────────────────────*/
function ClientDrawer({ client, onClose }) {
    useTick(60000);
    useEffect(() => {
        const h = e => e.key === "Escape" && onClose();
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [onClose]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    if (!client) return null;

    return (
        <div className="au-drawer-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="au-drawer">
                <div className="au-drawer__accent" style={{ background: client.color }} />

                {/* Header */}
                <div className="au-drawer__hd">
                    <div className="au-drawer__avatar" style={{ "--ac": client.color }}>
                        {client.avatar}
                    </div>
                    <div className="au-drawer__hd-info">
                        <h3 className="au-drawer__name">{client.name}</h3>
                        <p className="au-drawer__code">{client.code} · {client.industry}</p>
                    </div>
                    <div className="au-drawer__hd-right">
                        <TunnelBadge status={client.tunnel} />
                        <button className="au-drawer__close" onClick={onClose}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="au-drawer__kpis">
                    {[
                        { label: "Active Users",  value: client.activeUsers },
                        { label: "Total Users",   value: client.totalUsers  },
                        { label: "API Calls",     value: client.apiCalls.toLocaleString() },
                        { label: "Sync Health",   value: `${client.syncHealth}%` },
                    ].map(k => (
                        <div key={k.label} className="au-drawer__kpi">
                            <span className="au-drawer__kpi-val">{k.value}</span>
                            <span className="au-drawer__kpi-lbl">{k.label}</span>
                        </div>
                    ))}
                </div>

                {/* Detail rows */}
                <div className="au-drawer__section">
                    <h4 className="au-drawer__sec-title">Company Details</h4>
                    <div className="au-drawer__rows">
                        {[
                            ["Plan",         client.plan],
                            ["Location",     client.location],
                            ["Joined",       client.joinedDate],
                            ["Last Login",   timeAgo(client.lastLogin)],
                            ["Last Sync",    timeAgo(client.lastSync)],
                            ["Tunnel",       client.tunnel.charAt(0).toUpperCase() + client.tunnel.slice(1)],
                        ].map(([k, v]) => (
                            <div key={k} className="au-drawer__row">
                                <span className="au-drawer__row-key">{k}</span>
                                <span className="au-drawer__row-val">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modules */}
                <div className="au-drawer__section">
                    <h4 className="au-drawer__sec-title">Licensed Modules</h4>
                    <div className="au-drawer__modules">
                        {["Dashboard","Approvals","Charts","Reports","MIS","Dispatch","Utility"].map(m => (
                            <span
                                key={m}
                                className={`au-drawer__module ${client.modules.includes(m) ? "au-drawer__module--on" : "au-drawer__module--off"}`}
                            >
                                {client.modules.includes(m) ? "✓" : "✕"} {m}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Sync health bar */}
                <div className="au-drawer__section">
                    <h4 className="au-drawer__sec-title">Data Sync Health</h4>
                    <HealthBar pct={client.syncHealth} />
                </div>

                {/* Actions */}
                <div className="au-drawer__actions">
                    <button className="au-drawer-btn au-drawer-btn--ghost">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                        </svg>
                        Force Sync
                    </button>
                    <button className="au-drawer-btn au-drawer-btn--blue">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit Client
                    </button>
                    {client.status === "inactive" ? (
                        <button className="au-drawer-btn au-drawer-btn--green">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20,6 9,17 4,12"/>
                            </svg>
                            Activate
                        </button>
                    ) : (
                        <button className="au-drawer-btn au-drawer-btn--red">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Suspend
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function AnimsUtility() {
    useTick(30000); // re-render every 30s to refresh "time ago"

    const [search,   setSearch]   = useState("");
    const [filter,   setFilter]   = useState("all");   // all | active | inactive | warning
    const [view,     setView]     = useState("grid");  // grid | table
    const [selected, setSelected] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const refreshTimer = useRef(null);

    /* ── Counts ── */
    const total      = MOCK_CLIENTS.length;
    const active     = MOCK_CLIENTS.filter(c => c.status === "active").length;
    const inactive   = MOCK_CLIENTS.filter(c => c.status === "inactive").length;
    const warning    = MOCK_CLIENTS.filter(c => c.status === "warning").length;
    const liveUsers  = MOCK_CLIENTS.reduce((a, c) => a + c.activeUsers, 0);

    /* ── Filtered ── */
    const visible = MOCK_CLIENTS.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                            c.code.toLowerCase().includes(search.toLowerCase()) ||
                            c.location.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || c.status === filter;
        return matchSearch && matchFilter;
    });

    /* ── Manual refresh (stub) ── */
    const handleRefresh = () => {
        setLastRefresh(new Date());
        clearTimeout(refreshTimer.current);
    };

    /* ── Filter pills ── */
    const FILTERS = [
        { key: "all",      label: "All",      count: total   },
        { key: "active",   label: "Active",   count: active  },
        { key: "warning",  label: "Warning",  count: warning },
        { key: "inactive", label: "Offline",  count: inactive},
    ];

    return (
        <div className="au-root">

            {/* ── Page title ── */}
            <div className="au-header">
                <div className="au-header__left">
                    <h2 className="au-header__title">Client Monitor</h2>
                    <p className="au-header__sub">
                        Multi-tenant ERP · Cloudflare Tunnel · Django REST
                    </p>
                </div>
                <div className="au-header__right">
                    <span className="au-last-refresh">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                        </svg>
                        {timeAgo(lastRefresh)}
                    </span>
                    <button className="au-refresh-btn" onClick={handleRefresh} title="Refresh">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10"/>
                            <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="au-stats">
                <StatCard icon="🏢" label="Total Clients"   value={total}    color="#3b82f6" delay="0s"    />
                <StatCard icon="🟢" label="Active Now"      value={active}   color="#10b981" delay=".07s"  pulse />
                <StatCard icon="⚠️" label="Warning"         value={warning}  color="#f59e0b" delay=".14s"  />
                <StatCard icon="🔴" label="Offline"         value={inactive} color="#ef4444" delay=".21s"  />
                <StatCard icon="👤" label="Live Users"      value={liveUsers} color="#8b5cf6" delay=".28s" pulse sub="across all tenants" />
            </div>

            {/* ── Toolbar ── */}
            <div className="au-toolbar">
                {/* Search */}
                <div className="au-search-wrap">
                    <svg className="au-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        className="au-search"
                        placeholder="Search company, code, location…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="au-search-clear" onClick={() => setSearch("")}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Filter pills */}
                <div className="au-filters">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            className={`au-filter-pill ${filter === f.key ? "au-filter-pill--active" : ""} au-filter-pill--${f.key}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                            <span className="au-filter-pill__count">{f.count}</span>
                        </button>
                    ))}
                </div>

                {/* View toggle */}
                <div className="au-view-toggle">
                    <button
                        className={`au-view-btn ${view === "grid" ? "au-view-btn--active" : ""}`}
                        onClick={() => setView("grid")}
                        title="Grid view"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                        </svg>
                    </button>
                    <button
                        className={`au-view-btn ${view === "table" ? "au-view-btn--active" : ""}`}
                        onClick={() => setView("table")}
                        title="Table view"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Main content: clients + activity ── */}
            <div className="au-body">

                {/* Left: client list */}
                <div className="au-clients">

                    {visible.length === 0 ? (
                        <div className="au-empty">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.2">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <p>No clients match <strong>"{search}"</strong></p>
                        </div>
                    ) : view === "grid" ? (

                        /* ── GRID VIEW ── */
                        <div className="au-grid">
                            {visible.map((c, i) => (
                                <div
                                    key={c.id}
                                    className={`au-client-card au-client-card--${c.status}`}
                                    style={{ animationDelay: `${0.04 + i * 0.06}s` }}
                                    onClick={() => setSelected(c)}
                                >
                                    <div className="au-client-card__stripe" style={{ background: c.color }} />

                                    <div className="au-client-card__top">
                                        <div className="au-avatar" style={{ "--ac": c.color }}>
                                            {c.avatar}
                                            <span className={`au-avatar__dot au-avatar__dot--${c.status}`} />
                                        </div>
                                        <div className="au-client-card__info">
                                            <span className="au-client-card__name">{c.name}</span>
                                            <span className="au-client-card__code">{c.code} · {c.industry}</span>
                                        </div>
                                        <span className={`au-plan au-plan--${c.plan.toLowerCase()}`}>{c.plan}</span>
                                    </div>

                                    <div className="au-client-card__mid">
                                        <TunnelBadge status={c.tunnel} />
                                        <span className="au-client-card__loc">📍 {c.location}</span>
                                    </div>

                                    <div className="au-client-card__metrics">
                                        <div className="au-metric">
                                            <span className="au-metric__val" style={{ color: c.activeUsers > 0 ? "#10b981" : "#94a3b8" }}>
                                                {c.activeUsers}
                                            </span>
                                            <span className="au-metric__lbl">Live Users</span>
                                        </div>
                                        <div className="au-metric">
                                            <span className="au-metric__val">{c.apiCalls.toLocaleString()}</span>
                                            <span className="au-metric__lbl">API Calls</span>
                                        </div>
                                        <div className="au-metric">
                                            <span className="au-metric__val">{timeAgo(c.lastLogin)}</span>
                                            <span className="au-metric__lbl">Last Login</span>
                                        </div>
                                    </div>

                                    <HealthBar pct={c.syncHealth} />

                                    <div className="au-client-card__footer">
                                        <span className="au-client-card__joined">Joined {c.joinedDate}</span>
                                        <button className="au-card-detail-btn">
                                            Details →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    ) : (

                        /* ── TABLE VIEW ── */
                        <div className="au-table-wrap">
                            <table className="au-table">
                                <thead>
                                    <tr>
                                        <th>Company</th>
                                        <th>Code</th>
                                        <th>Plan</th>
                                        <th>Tunnel</th>
                                        <th>Live Users</th>
                                        <th>Last Login</th>
                                        <th>Sync Health</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((c, i) => (
                                        <tr
                                            key={c.id}
                                            className="au-table__row"
                                            style={{ animationDelay: `${0.04 + i * 0.05}s` }}
                                        >
                                            <td>
                                                <div className="au-table__company">
                                                    <div className="au-avatar au-avatar--sm" style={{ "--ac": c.color }}>
                                                        {c.avatar}
                                                        <span className={`au-avatar__dot au-avatar__dot--${c.status}`} />
                                                    </div>
                                                    <div>
                                                        <span className="au-table__name">{c.name}</span>
                                                        <span className="au-table__loc">📍 {c.location}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><code className="au-code">{c.code}</code></td>
                                            <td><span className={`au-plan au-plan--${c.plan.toLowerCase()}`}>{c.plan}</span></td>
                                            <td><TunnelBadge status={c.tunnel} /></td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: c.activeUsers > 0 ? "#10b981" : "#94a3b8" }}>
                                                    {c.activeUsers} / {c.totalUsers}
                                                </span>
                                            </td>
                                            <td className="au-table__time">{timeAgo(c.lastLogin)}</td>
                                            <td style={{ minWidth: 140 }}><HealthBar pct={c.syncHealth} /></td>
                                            <td>
                                                <button className="au-tbl-btn" onClick={() => setSelected(c)}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right: Activity feed */}
                <div className="au-activity">
                    <div className="au-activity__hd">
                        <h3 className="au-activity__title">Live Activity</h3>
                        <span className="au-activity__live">
                            <span className="au-activity__dot" />
                            Live
                        </span>
                    </div>
                    <div className="au-activity__feed">
                        {ACTIVITY_FEED.map((ev, i) => (
                            <div
                                key={ev.id}
                                className="au-act-item"
                                style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                            >
                                <ActivityIcon type={ev.type} />
                                <div className="au-act-item__body">
                                    <p className="au-act-item__text">
                                        <strong>{ev.user}</strong> {ev.msg}
                                    </p>
                                    <span className="au-act-item__company">{ev.name}</span>
                                </div>
                                <span className="au-act-item__time">{timeAgo(ev.time)}</span>
                            </div>
                        ))}
                    </div>

                    {/* System status */}
                    <div className="au-sys-status">
                        <h4 className="au-sys-status__title">System Health</h4>
                        {[
                            { label: "Django API",        ok: true },
                            { label: "Cloudflare Tunnel", ok: true },
                            { label: "Cloud MSSQL DB",    ok: true },
                            { label: "Redis Cache",       ok: true },
                            { label: "GoDaddy Hosting",   ok: true },
                        ].map(s => (
                            <div key={s.label} className="au-sys-row">
                                <span className={`au-sys-dot ${s.ok ? "au-sys-dot--ok" : "au-sys-dot--err"}`} />
                                <span className="au-sys-label">{s.label}</span>
                                <span className={`au-sys-status-txt ${s.ok ? "" : "au-sys-status-txt--err"}`}>
                                    {s.ok ? "Operational" : "Down"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Client detail drawer (portal-like, via state) ── */}
            {selected && (
                <ClientDrawer client={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}