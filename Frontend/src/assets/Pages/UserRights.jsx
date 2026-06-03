/**
 * UserRights.jsx  —  User Access Management (ERP Users table)
 * Prefix: ur-
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./UserRights.css";
import { resolveApiBase } from "../../apiBase";

const API = resolveApiBase();

const IconToastSuccess = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const IconToastError = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
);

const IconToastInfo = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

function UserRightsToastContent({ variant, title, message }) {
    return (
        <div className={`ur-toast ur-toast--${variant}`}>
            <span className="ur-toast__accent" aria-hidden="true" />
            <span className={`ur-toast__icon-wrap ur-toast__icon-wrap--${variant}`}>
                {variant === "success" ? <IconToastSuccess /> : variant === "error" ? <IconToastError /> : <IconToastInfo />}
            </span>
            <div className="ur-toast__content">
                <p className="ur-toast__title">{title}</p>
                <p className="ur-toast__message">{message}</p>
            </div>
        </div>
    );
}

const TOAST_OPTS = {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    icon: false,
    className: "ur-toast-item",
    bodyClassName: "ur-toast-body",
    progressClassName: "ur-toast-progress",
};

const showToast = (variant, title, message) => {
    toast(
        <UserRightsToastContent variant={variant} title={title} message={message} />,
        {
            ...TOAST_OPTS,
            className: `ur-toast-item ur-toast-item--${variant}`,
            closeButton: ({ closeToast }) => (
                <button
                    type="button"
                    className="ur-toast__close"
                    onClick={closeToast}
                    aria-label="Dismiss notification"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5" stroke="currentColor"
                            strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                </button>
            ),
        }
    );
};

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#6366f1", "#14b8a6"];

const MODULES = [
    { key: "Dashboard", label: "Dashboard", icon: "📊", color: "#3b82f6" },
    { key: "Approvals", label: "Approvals", icon: "✅", color: "#10b981" },
    { key: "Reports", label: "Reports", icon: "📋", color: "#8b5cf6" },
    { key: "MIS", label: "MIS", icon: "🏭", color: "#06b6d4" },
    { key: "Charts", label: "Charts", icon: "📈", color: "#f97316" },
    { key: "Utility", label: "Utility", icon: "⚙️", color: "#ec4899" },
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
    const [maxUsers, setMaxUsers] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const saveTimer = useRef(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [addForm, setAddForm] = useState({
        userName: "",
        designation: "",
        password: "",
        confirmPassword: ""
    });
    const [addError, setAddError] = useState("");
    const [adding, setAdding] = useState(false);

    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setAddError("");

        const { userName, designation, password, confirmPassword } = addForm;

        if (!userName.trim()) {
            setAddError("Username is required.");
            return;
        }
        if (!password) {
            setAddError("Password is required.");
            return;
        }
        if (password.length < 6) {
            setAddError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setAddError("Passwords do not match.");
            return;
        }

        setAdding(true);
        try {
            const res = await fetch(`${API}/user-rights/add-user/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userName: userName.trim(),
                    designation: designation.trim(),
                    password: password
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Request failed with status ${res.status}`);
            }

            setShowAddModal(false);
            setAddForm({ userName: "", designation: "", password: "", confirmPassword: "" });
            loadUsers();
            showToast("success", "Success", `User "${userName}" added successfully.`);
        } catch (err) {
            setAddError(err.message || "Failed to add user.");
        } finally {
            setAdding(false);
        }
    };

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
                isSuperAdmin: !!u.isSuperAdmin,
            }))));
            setMaxUsers(data.stats?.maxUsers || 0);
        } catch (e) {
            showToast("error", "Error", e.message || "Could not load user rights.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        const contentEl = document.querySelector(".dl-content");
        if (showAddModal || deleteConfirm) {
            document.body.style.overflow = "hidden";
            if (contentEl) contentEl.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            if (contentEl) contentEl.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
            if (contentEl) contentEl.style.overflow = "";
        };
    }, [showAddModal, deleteConfirm]);

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

    const handleDeleteUser = (userId, userName) => {
        const u = users.find(usr => usr.userId === userId);
        if (u?.isSuperAdmin) {
            showToast("error", "Error", "Superadmin accounts cannot be deleted.");
            return;
        }
        setDeleteConfirm({ userId, userName });
    };

    const confirmDeleteUser = async (userId, userName) => {
        setDeleteConfirm(null);
        try {
            const res = await fetch(`${API}/user-rights/delete/${userId}/`, {
                method: "DELETE",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Failed to delete user (${res.status})`);
            }

            // Remove user from local state
            setUsers(prev => prev.filter(u => u.userId !== userId));
            showToast("success", "Success", `User "${userName}" deleted successfully.`);
        } catch (err) {
            showToast("error", "Error", err.message || "Failed to delete user.");
        }
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
            showToast("success", "Saved", "User rights saved successfully.");
        } catch (e) {
            showToast("error", "Error", e.message || "Could not save user rights.");
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


            <div className="ur-stats">
                <StatCard label="Total Users" value={loading ? "…" : `${totalUsers}/${maxUsers || "—"}`} icon="👥" color="#3b82f6" delay="0s" />
                <StatCard label="Active Users" value={loading ? "…" : activeUsers} icon="🔐" color="#10b981" delay=".06s" />
                <StatCard label="Rights Granted" value={loading ? "…" : totalGrants} icon="✅" color="#f97316" delay=".12s" />
                <StatCard label="Avg Access" value={loading ? "…" : `${avgAccess}%`} icon="📊" color="#8b5cf6" delay=".18s" />
            </div>

            <div className="ur-toolbar">
                <div className="ur-search-wrap">
                    <svg className="ur-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="ur-toolbar__actions">
                    <button
                        className="ur-btn ur-btn--add"
                        onClick={() => setShowAddModal(true)}
                        disabled={loading || saving || (maxUsers > 0 && totalUsers >= maxUsers)}
                        type="button"
                        title={maxUsers > 0 && totalUsers >= maxUsers ? "User limit reached. Cannot add more users." : "Add User"}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add User
                    </button>
                    <button className="ur-btn ur-btn--ghost" onClick={handleReset} disabled={loading || saving} type="button">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
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
                        <p>Loading users…</p>
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
                                                    <button
                                                        type="button"
                                                        className="ur-row-btn ur-row-btn--del"
                                                        onClick={() => handleDeleteUser(user.userId, user.name)}
                                                        disabled={user.isSuperAdmin}
                                                        title={user.isSuperAdmin ? "Superadmin accounts cannot be deleted" : "Delete user"}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
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

            {showAddModal && createPortal(
                <div className="ur-modal" role="dialog" aria-modal="true">
                    <div className="ur-modal__box">
                        <div className="ur-modal__accent" />
                        <div className="ur-modal__hd">
                            <h3 className="ur-modal__title">Add New User</h3>
                            <button
                                type="button"
                                className="ur-modal__close"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setAddError("");
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAddUserSubmit}>
                            <div className="ur-modal__body">
                                {addError && (
                                    <div className="ur-banner ur-banner--error" style={{ marginBottom: "1rem" }} role="alert">
                                        {addError}
                                    </div>
                                )}
                                <div className="ur-form-group">
                                    <label className="ur-label">Username <span>*</span></label>
                                    <input
                                        type="text"
                                        className="ur-input"
                                        placeholder="Enter username"
                                        value={addForm.userName}
                                        onChange={e => setAddForm(prev => ({ ...prev, userName: e.target.value }))}
                                        disabled={adding}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Designation</label>
                                    <input
                                        type="text"
                                        className="ur-input"
                                        placeholder="Enter designation (e.g., Manager)"
                                        value={addForm.designation}
                                        onChange={e => setAddForm(prev => ({ ...prev, designation: e.target.value }))}
                                        disabled={adding}
                                    />
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Password <span>*</span></label>
                                    <input
                                        type="password"
                                        className="ur-input"
                                        placeholder="Min 6 characters"
                                        value={addForm.password}
                                        onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                                        disabled={adding}
                                        required
                                    />
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Confirm Password <span>*</span></label>
                                    <input
                                        type="password"
                                        className="ur-input"
                                        placeholder="Re-enter password"
                                        value={addForm.confirmPassword}
                                        onChange={e => setAddForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        disabled={adding}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="ur-modal__footer">
                                <button
                                    type="button"
                                    className="ur-btn ur-btn--ghost"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setAddError("");
                                    }}
                                    disabled={adding}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="ur-btn ur-btn--add"
                                    disabled={adding}
                                >
                                    {adding ? "Adding..." : "Add User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {deleteConfirm && createPortal(
                <div className="ur-modal" role="dialog" aria-modal="true">
                    <div className="ur-modal__box ur-modal__box--warning">
                        <div className="ur-modal__accent ur-modal__accent--warning" />
                        <div className="ur-modal__hd">
                            <h3 className="ur-modal__title ur-modal__title--warning">Confirm Deletion</h3>
                            <button
                                type="button"
                                className="ur-modal__close"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="ur-modal__body ur-modal__body--confirm">
                            <div className="ur-confirm-icon-wrap">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ur-confirm-icon">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <p className="ur-confirm-text">
                                Are you sure you want to delete user <strong>"{deleteConfirm.userName}"</strong>?
                            </p>
                            <p className="ur-confirm-subtext">
                                This action cannot be undone and will revoke all access privileges.
                            </p>
                        </div>
                        <div className="ur-modal__footer">
                            <button
                                type="button"
                                className="ur-btn ur-btn--ghost"
                                onClick={() => setDeleteConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="ur-btn ur-btn--danger"
                                onClick={() => confirmDeleteUser(deleteConfirm.userId, deleteConfirm.userName)}
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ToastContainer />
        </div>
    );
}
