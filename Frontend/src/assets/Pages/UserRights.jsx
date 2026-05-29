/**
 * UserRights.jsx  —  User Access Management (ERP Users table)
 * Prefix: ur-
 */
import { useState, useRef, useEffect, useCallback } from "react";
import "./UserRights.css";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#6366f1", "#14b8a6"];

const MODULES = [
    { key: "Dashboard", label: "Dashboard", icon: "📊", color: "#3b82f6" },
    { key: "Approvals", label: "Approvals", icon: "✅", color: "#10b981" },
    { key: "Reports",   label: "Reports",   icon: "📋", color: "#8b5cf6" },
    { key: "MIS",       label: "MIS",       icon: "🏭", color: "#06b6d4" },
    { key: "Charts",    label: "Charts",    icon: "📈", color: "#f97316" },
    { key: "Utility",   label: "Utility",   icon: "⚙️", color: "#ec4899" },
];

function assignColors(users) {
    return users.map((u, i) => ({
        ...u,
        color: u.color || COLORS[i % COLORS.length],
    }));
}

function allRightsOn(on) {
    const rights = {};
    MODULES.forEach(m => { rights[m.key] = on; });
    return rights;
}

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

export default function UserRights() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const saveTimer = useRef(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`${API}/user-rights/list/`, { credentials: "include" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Failed to load users (${res.status})`);
            }
            setUsers(assignColors((data.users || []).map(u => ({
                userId: u.userId,
                name: u.userName,
                role: u.designation,
                avatar: u.avatar || (u.userName || "??").slice(0, 2).toUpperCase(),
                rights: { ...u.rights },
            }))));
        } catch (e) {
            setError(e.message || "Could not load user rights.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const totalUsers = users.length;
    const activeUsers = users.filter(u => MODULES.some(m => u.rights?.[m.key])).length;
    const totalGrants = users.reduce((acc, u) =>
        acc + MODULES.filter(m => u.rights?.[m.key]).length, 0);
    const avgAccess = totalUsers
        ? Math.round((totalGrants / (totalUsers * MODULES.length)) * 100)
        : 0;

    const handleToggle = (userIdx, modKey) => {
        setUsers(prev => prev.map((u, i) => {
            if (i !== userIdx) return u;
            return {
                ...u,
                rights: { ...u.rights, [modKey]: !u.rights[modKey] },
            };
        }));
    };

    const handleGrantAll = (userIdx) => {
        setUsers(prev => prev.map((u, i) => {
            if (i !== userIdx) return u;
            const allOn = MODULES.every(m => u.rights[m.key]);
            return { ...u, rights: allRightsOn(!allOn) };
        }));
    };

    const handleReset = () => {
        setSearch("");
        loadUsers();
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const payload = {
                users: users.map(u => ({
                    userId: u.userId,
                    rights: u.rights,
                })),
            };
            const res = await fetch(`${API}/user-rights/bulk-save/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Save failed (${res.status})`);
            }
            if (data.errors?.length) {
                throw new Error(data.errors.map(e => e.error || JSON.stringify(e)).join("; "));
            }
            setSaved(true);
            clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => setSaved(false), 2400);
        } catch (e) {
            setError(e.message || "Could not save user rights.");
        } finally {
            setSaving(false);
        }
    };

    const filtered = users
        .map((u, i) => ({ ...u, origIdx: i }))
        .filter(u => {
            const q = search.toLowerCase();
            return (
                u.name.toLowerCase().includes(q) ||
                (u.role || "").toLowerCase().includes(q)
            );
        });

    return (
        <div className="ur-root">
            {error && (
                <div className="ur-banner ur-banner--error" role="alert">
                    {error}
                    <button type="button" className="ur-banner__close" onClick={() => setError("")}>×</button>
                </div>
            )}

            <div className="ur-stats">
                <StatCard label="Total Users" value={loading ? "…" : totalUsers} icon="👥" color="#3b82f6" delay="0s" />
                <StatCard label="Active Users" value={loading ? "…" : activeUsers} icon="🔐" color="#10b981" delay=".06s" />
                <StatCard label="Rights Granted" value={loading ? "…" : totalGrants} icon="✅" color="#f97316" delay=".12s" />
                <StatCard label="Avg Access" value={loading ? "…" : `${avgAccess}%`} icon="📊" color="#8b5cf6" delay=".18s" />
            </div>

            <div className="ur-toolbar">
                <div className="ur-search-wrap">
                    <svg className="ur-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        className="ur-search"
                        placeholder="Search username or designation…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={loading}
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
                    <button className="ur-btn ur-btn--ghost" onClick={handleReset} disabled={loading || saving} type="button">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                        </svg>
                        Reload
                    </button>
                    <button
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""}`}
                        onClick={handleSave}
                        disabled={loading || saving || !users.length}
                        type="button"
                    >
                        {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="ur-card">
                {loading ? (
                    <div className="ur-loading">
                        <div className="ur-loading__spinner" />
                        <p>Loading users from ERP…</p>
                    </div>
                ) : (
                    <div className="ur-table-wrap">
                        <table className="ur-table">
                            <thead>
                                <tr>
                                    <th className="ur-th ur-th--user"><span>User</span></th>
                                    {MODULES.map(m => (
                                        <th key={m.key} className="ur-th ur-th--compact" title={m.label}>
                                            <div className="ur-th__inner">
                                                <span className="ur-th__icon" style={{ background: m.color + "22", color: m.color }}>{m.icon}</span>
                                                <span className="ur-th__label">{m.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="ur-th ur-th--actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length > 0 ? filtered.map((user, rowIdx) => {
                                    const onCount = MODULES.filter(m => user.rights[m.key]).length;
                                    const allOn = MODULES.every(m => user.rights[m.key]);
                                    const hasAccess = onCount > 0;

                                    return (
                                        <tr
                                            key={user.userId ?? user.name}
                                            className="ur-row"
                                            style={{ animationDelay: `${0.05 + rowIdx * 0.04}s` }}
                                        >
                                            <td className="ur-td ur-td--user">
                                                <div className="ur-user">
                                                    <div className="ur-avatar" style={{ "--ac": user.color }}>
                                                        {user.avatar}
                                                        <span className={`ur-avatar__status ${hasAccess ? "ur-avatar__status--on" : ""}`} />
                                                    </div>
                                                    <div className="ur-user__info">
                                                        <span className="ur-user__name">{user.name}</span>
                                                        <span className="ur-user__role">{user.role}</span>
                                                    </div>
                                                    <div className="ur-user__pill" style={{
                                                        background: `hsl(${Math.round((onCount / MODULES.length) * 120)}, 70%, 94%)`,
                                                        color: `hsl(${Math.round((onCount / MODULES.length) * 120)}, 60%, 38%)`,
                                                    }}>
                                                        {onCount}/{MODULES.length}
                                                    </div>
                                                </div>
                                            </td>

                                            {MODULES.map(m => (
                                                <td key={m.key} className="ur-td">
                                                    <Toggle
                                                        checked={!!user.rights[m.key]}
                                                        onChange={() => handleToggle(user.origIdx, m.key)}
                                                        color={m.color}
                                                    />
                                                </td>
                                            ))}

                                            <td className="ur-td ur-td--actions">
                                                <div className="ur-row-actions">
                                                    <button
                                                        type="button"
                                                        className={`ur-row-btn ${allOn ? "ur-row-btn--revoke" : "ur-row-btn--grant"}`}
                                                        onClick={() => handleGrantAll(user.origIdx)}
                                                        title={allOn ? "Revoke all rights" : "Grant all rights"}
                                                    >
                                                        {allOn ? "Revoke All" : "Grant All"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={MODULES.length + 2} className="ur-empty">
                                            <div className="ur-empty__inner">
                                                <p>{users.length ? <>No users match <strong>"{search}"</strong></> : "No users found in ERP."}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="ur-card-footer">
                    <span className="ur-footer-info">
                        Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users
                    </span>
                    <button
                        type="button"
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""}`}
                        onClick={handleSave}
                        disabled={loading || saving || !users.length}
                    >
                        {saving ? "Saving…" : saved ? "Saved!" : "Save Rights"}
                    </button>
                </div>
            </div>
        </div>
    );
}
