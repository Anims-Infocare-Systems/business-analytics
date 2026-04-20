/**
 * UserRights.jsx  —  User Access Management
 * Prefix: ur-
 */
import { useState, useRef } from "react";
import "./UserRights.css";

/* ── Modules ─────────────────────────────────────────────── */
const MODULES = [
    { key: "Enable Login", icon: "🔐", color: "#6366f1" },
    { key: "Dashboard",    icon: "📊", color: "#3b82f6" },
    { key: "Approvals",    icon: "✅", color: "#10b981" },
    { key: "Charts",       icon: "📈", color: "#f97316" },
    { key: "Reports",      icon: "📋", color: "#8b5cf6" },
    { key: "MIS",          icon: "🏭", color: "#06b6d4" },
    { key: "Utility",      icon: "⚙️", color: "#ec4899" },
];

/* ── Initial users ───────────────────────────────────────── */
const INITIAL_USERS = [
    {
        name: "Admin",
        role: "Super Admin",
        avatar: "AD",
        color: "#3b82f6",
        rights: { "Enable Login": true,  "Dashboard": true,  "Approvals": true,  "Charts": true,  "Reports": true,  "MIS": true,  "Utility": true  },
    },
    {
        name: "Pratheep",
        role: "Manager",
        avatar: "PR",
        color: "#10b981",
        rights: { "Enable Login": true,  "Dashboard": true,  "Approvals": true,  "Charts": false, "Reports": true,  "MIS": true,  "Utility": false },
    },
    {
        name: "Sabarish",
        role: "Analyst",
        avatar: "SA",
        color: "#f97316",
        rights: { "Enable Login": false, "Dashboard": false, "Approvals": false, "Charts": false, "Reports": true,  "MIS": true,  "Utility": false },
    },
    {
        name: "Pranesh",
        role: "Analyst",
        avatar: "PN",
        color: "#8b5cf6",
        rights: { "Enable Login": false, "Dashboard": false, "Approvals": false, "Charts": false, "Reports": true,  "MIS": true,  "Utility": false },
    },
];

/* ── Avatar colour pool ──────────────────────────────────── */
const COLORS = ["#3b82f6","#10b981","#f97316","#8b5cf6","#06b6d4","#ec4899","#6366f1","#14b8a6"];

/* ── Animated toggle ─────────────────────────────────────── */
function Toggle({ checked, onChange, color }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`ur-toggle ${checked ? "ur-toggle--on" : ""}`}
            style={{ "--tc": color }}
            onClick={onChange}
        >
            <span className="ur-toggle__thumb" />
        </button>
    );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ label, value, icon, color, delay }) {
    return (
        <div className="ur-stat" style={{ "--sc": color, animationDelay: delay }}>
            <div className="ur-stat__icon">{icon}</div>
            <div className="ur-stat__body">
                <span className="ur-stat__value">{value}</span>
                <span className="ur-stat__label">{label}</span>
            </div>
            <div className="ur-stat__ring" />
        </div>
    );
}

/* ── Main ────────────────────────────────────────────────── */
export default function UserRights() {
    const [users,    setUsers]    = useState(INITIAL_USERS);
    const [search,   setSearch]   = useState("");
    const [saved,    setSaved]    = useState(false);
    const [addModal, setAddModal] = useState(false);
    const [newUser,  setNewUser]  = useState({ name: "", role: "" });
    const saveTimer = useRef(null);

    /* ── Stats ── */
    const totalUsers   = users.length;
    const activeLogins = users.filter(u => u.rights["Enable Login"]).length;
    const totalGrants  = users.reduce((acc, u) =>
        acc + Object.values(u.rights).filter(Boolean).length, 0);
    const avgAccess = totalUsers
        ? Math.round((totalGrants / (totalUsers * MODULES.length)) * 100)
        : 0;

    /* ── Toggle ── */
    const handleToggle = (userIdx, mod) => {
        setUsers(prev =>
            prev.map((u, i) =>
                i === userIdx
                    ? { ...u, rights: { ...u.rights, [mod]: !u.rights[mod] } }
                    : u
            )
        );
    };

    /* ── Grant all / revoke all for a user ── */
    const handleGrantAll = (userIdx) => {
        setUsers(prev =>
            prev.map((u, i) => {
                if (i !== userIdx) return u;
                const allOn = MODULES.every(m => u.rights[m.key]);
                const newRights = {};
                MODULES.forEach(m => { newRights[m.key] = !allOn; });
                return { ...u, rights: newRights };
            })
        );
    };

    /* ── Reset ── */
    const handleReset = () => {
        setUsers(INITIAL_USERS);
        setSearch("");
    };

    /* ── Save ── */
    const handleSave = () => {
        setSaved(true);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaved(false), 2400);
    };

    /* ── Add user ── */
    const handleAddUser = () => {
        if (!newUser.name.trim()) return;
        const initials = newUser.name.trim().slice(0, 2).toUpperCase();
        const color    = COLORS[users.length % COLORS.length];
        const rights   = {};
        MODULES.forEach(m => { rights[m.key] = false; });
        setUsers(prev => [...prev, {
            name: newUser.name.trim(),
            role: newUser.role.trim() || "User",
            avatar: initials,
            color,
            rights,
        }]);
        setNewUser({ name: "", role: "" });
        setAddModal(false);
    };

    /* ── Delete user ── */
    const handleDelete = (userIdx) => {
        setUsers(prev => prev.filter((_, i) => i !== userIdx));
    };

    /* ── Filter ── */
    const filtered = users
        .map((u, i) => ({ ...u, origIdx: i }))
        .filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="ur-root">

            {/* ── Stat row ── */}
            <div className="ur-stats">
                <StatCard label="Total Users"    value={totalUsers}   icon="👥" color="#3b82f6" delay="0s"    />
                <StatCard label="Active Logins"  value={activeLogins} icon="🔐" color="#10b981" delay=".06s"  />
                <StatCard label="Rights Granted" value={totalGrants}  icon="✅" color="#f97316" delay=".12s"  />
                <StatCard label="Avg Access"     value={`${avgAccess}%`} icon="📊" color="#8b5cf6" delay=".18s" />
            </div>

            {/* ── Toolbar ── */}
            <div className="ur-toolbar">
                <div className="ur-search-wrap">
                    <svg className="ur-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        className="ur-search"
                        placeholder="Search username or role…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="ur-search-clear" onClick={() => setSearch("")} type="button">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}
                </div>

                <div className="ur-toolbar__actions">
                    <button className="ur-btn ur-btn--ghost" onClick={handleReset}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg>
                        Reset
                    </button>
                    <button className="ur-btn ur-btn--add" onClick={() => setAddModal(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add User
                    </button>
                    <button
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""}`}
                        onClick={handleSave}
                    >
                        {saved ? (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20,6 9,17 4,12"/>
                                </svg>
                                Saved!
                            </>
                        ) : (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                    <polyline points="17,21 17,13 7,13 7,21"/>
                                    <polyline points="7,3 7,8 15,8"/>
                                </svg>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="ur-card">
                <div className="ur-table-wrap">
                    <table className="ur-table">
                        <thead>
                            <tr>
                                <th className="ur-th ur-th--user">
                                    <span>User</span>
                                </th>
                                {MODULES.map(m => (
                                    <th key={m.key} className="ur-th">
                                        <div className="ur-th__inner">
                                            <span className="ur-th__icon" style={{ background: m.color + "22", color: m.color }}>{m.icon}</span>
                                            <span className="ur-th__label">{m.key}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="ur-th ur-th--actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((user, rowIdx) => {
                                const allOn = MODULES.every(m => user.rights[m.key]);
                                const onCount = MODULES.filter(m => user.rights[m.key]).length;
                                return (
                                    <tr
                                        key={user.name}
                                        className="ur-row"
                                        style={{ animationDelay: `${0.05 + rowIdx * 0.06}s` }}
                                    >
                                        {/* User cell */}
                                        <td className="ur-td ur-td--user">
                                            <div className="ur-user">
                                                <div className="ur-avatar" style={{ "--ac": user.color }}>
                                                    {user.avatar}
                                                    <span className={`ur-avatar__status ${user.rights["Enable Login"] ? "ur-avatar__status--on" : ""}`} />
                                                </div>
                                                <div className="ur-user__info">
                                                    <span className="ur-user__name">{user.name}</span>
                                                    <span className="ur-user__role">{user.role}</span>
                                                </div>
                                                <div className="ur-user__pill" style={{
                                                    background: `hsl(${Math.round((onCount / MODULES.length) * 120)}, 70%, 94%)`,
                                                    color: `hsl(${Math.round((onCount / MODULES.length) * 120)}, 60%, 38%)`
                                                }}>
                                                    {onCount}/{MODULES.length}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Toggle cells */}
                                        {MODULES.map(m => (
                                            <td key={m.key} className="ur-td">
                                                <Toggle
                                                    checked={user.rights[m.key]}
                                                    onChange={() => handleToggle(user.origIdx, m.key)}
                                                    color={m.color}
                                                />
                                            </td>
                                        ))}

                                        {/* Actions cell */}
                                        <td className="ur-td ur-td--actions">
                                            <div className="ur-row-actions">
                                                <button
                                                    className={`ur-row-btn ${allOn ? "ur-row-btn--revoke" : "ur-row-btn--grant"}`}
                                                    onClick={() => handleGrantAll(user.origIdx)}
                                                    title={allOn ? "Revoke all" : "Grant all"}
                                                >
                                                    {allOn ? "Revoke All" : "Grant All"}
                                                </button>
                                                <button
                                                    className="ur-row-btn ur-row-btn--del"
                                                    onClick={() => handleDelete(user.origIdx)}
                                                    title="Delete user"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="3,6 5,6 21,6"/>
                                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                        <path d="M10 11v6M14 11v6"/>
                                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={MODULES.length + 2} className="ur-empty">
                                        <div className="ur-empty__inner">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.2">
                                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                            </svg>
                                            <p>No users match <strong>"{search}"</strong></p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer bar */}
                <div className="ur-card-footer">
                    <span className="ur-footer-info">
                        Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users
                    </span>
                    <button
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""}`}
                        onClick={handleSave}
                    >
                        {saved
                            ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg> Saved!</>
                            : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg> Save Rights</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Add User Modal ── */}
            {addModal && (
                <div className="ur-modal" onMouseDown={e => e.target === e.currentTarget && setAddModal(false)}>
                    <div className="ur-modal__box">
                        <div className="ur-modal__accent" />
                        <div className="ur-modal__hd">
                            <h3 className="ur-modal__title">Add New User</h3>
                            <button className="ur-modal__close" onClick={() => setAddModal(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div className="ur-modal__body">
                            <label className="ur-label">Username <span>*</span></label>
                            <input
                                className="ur-input"
                                placeholder="e.g. Ramesh"
                                value={newUser.name}
                                onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && handleAddUser()}
                                autoFocus
                            />
                            <label className="ur-label" style={{ marginTop: ".9rem" }}>Role</label>
                            <input
                                className="ur-input"
                                placeholder="e.g. Analyst"
                                value={newUser.role}
                                onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                                onKeyDown={e => e.key === "Enter" && handleAddUser()}
                            />
                        </div>
                        <div className="ur-modal__footer">
                            <button className="ur-btn ur-btn--ghost" onClick={() => setAddModal(false)}>Cancel</button>
                            <button className="ur-btn ur-btn--save" onClick={handleAddUser} disabled={!newUser.name.trim()}>
                                Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}