/**
 * UserRights.jsx  —  User Access Management (ERP Users table)
 * Prefix: ur-
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
    LayoutDashboard, 
    ClipboardCheck, 
    FileText, 
    Factory, 
    TrendingUp, 
    Settings,
    Users,
    Lock,
    CheckSquare,
    BarChart3,
    User,
    Briefcase,
    KeyRound,
    X,
    AlertTriangle,
    Eye,
    EyeOff
} from "lucide-react";
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

const showToast = (variant, title, message, toastId) => {
    toast(
        <UserRightsToastContent variant={variant} title={title} message={message} />,
        {
            ...TOAST_OPTS,
            toastId: toastId || `ur-${variant}-${title}`,
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

// Modules that are restricted to superadmin only — cannot be toggled for normal users
const ADMIN_ONLY_MODULES = ["Utility"];

const MODULES = [
    { key: "Dashboard", label: "Dashboard", icon: LayoutDashboard, color: "#3b82f6" },
    { key: "Approvals", label: "Approvals", icon: ClipboardCheck, color: "#10b981" },
    { key: "Reports", label: "Reports", icon: FileText, color: "#8b5cf6" },
    { key: "MIS", label: "MIS", icon: Factory, color: "#06b6d4" },
    { key: "Charts", label: "Charts", icon: TrendingUp, color: "#f97316" },
    { key: "Utility", label: "Utility", icon: Settings, color: "#ec4899" },
];

const SUB_MENUS = {
    Dashboard: ["Top Management Dashboard", "Plant Performance Dashboard"],
    Approvals: ["E-Approval", "T-Approval"],
    Reports: [
        "Sales Analysis",
        "Purchase Analysis",
        "Quality Analysis",
        "Production Analysis",
    ],
    MIS: ["Idle Time Report", "Efficiency Report"],
    Utility: ["User Rights"],
};

function assignColors(users) {
    return users.map((u, i) => ({
        ...u,
        color: u.color || COLORS[i % COLORS.length],
    }));
}

function allRightsOn(on) {
    const rights = {};
    MODULES.forEach(m => {
        rights[m.key] = on;
        if (SUB_MENUS[m.key]) {
            SUB_MENUS[m.key].forEach(sub => {
                rights[sub] = on;
            });
        }
    });
    return rights;
}

function Toggle({ checked, onChange, color, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`ur-toggle ${checked ? "ur-toggle--on" : ""} ${disabled ? "ur-toggle--disabled" : ""}`}
            style={{ "--tc": color }}
            onClick={disabled ? undefined : onChange}
            disabled={disabled}
            aria-disabled={disabled}
        >
            <span className="ur-toggle__thumb" />
        </button>
    );
}

function StatCard({ label, value, icon: Icon, color, delay }) {
    return (
        <div className="ur-stat" style={{ "--sc": color, animationDelay: delay }}>
            <div className="ur-stat__icon">
                {Icon && <Icon size={20} />}
            </div>
            <div className="ur-stat__body">
                <span className="ur-stat__value">{value}</span>
                <span className="ur-stat__label">{label}</span>
            </div>
            <div className="ur-stat__ring" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   Sub-Menu Modal — centered modal for granular access
   ═══════════════════════════════════════════════════════ */
function SubMenuModal({ isOpen, module, userName, currentRights, onApply, onCancel }) {
    const [localRights, setLocalRights] = useState({});

    useEffect(() => {
        if (isOpen && module) {
            const initial = {};
            (SUB_MENUS[module.key] || []).forEach(sub => {
                initial[sub] = !!currentRights[sub];
            });
            setLocalRights(initial);
        }
    }, [isOpen, module, currentRights]);

    if (!isOpen || !module) return null;

    const subList = SUB_MENUS[module.key] || [];
    const allOn = subList.every(s => localRights[s]);
    const anyOn = subList.some(s => localRights[s]);

    const handleToggleAll = () => {
        const next = !allOn;
        const updated = {};
        subList.forEach(s => { updated[s] = next; });
        setLocalRights(updated);
    };

    const handleApply = () => {
        const anyEnabled = subList.some(s => localRights[s]);
        onApply(localRights, anyEnabled);
    };

    return createPortal(
        <div className="ur-submodal-overlay" role="dialog" aria-modal="true" aria-label={`Configure ${module.label} sub-menu rights`}>
            <div className="ur-submodal">
                {/* Accent stripe */}
                <div className="ur-submodal__accent" style={{ background: `linear-gradient(90deg, ${module.color}, ${module.color}99)` }} />

                {/* Header */}
                <div className="ur-submodal__header">
                    <div className="ur-submodal__title-group">
                        <span className="ur-submodal__icon" style={{ background: module.color + "22", color: module.color }}>
                            {(() => {
                                const Icon = module.icon;
                                return <Icon size={18} />;
                            })()}
                        </span>
                        <div>
                            <h3 className="ur-submodal__title">{module.label} — Sub-menu Access</h3>
                            <p className="ur-submodal__subtitle">
                                Configure individual sub-menu rights for <strong>{userName}</strong>
                            </p>
                        </div>
                    </div>
                    <button type="button" className="ur-submodal__close" onClick={onCancel} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                {/* Toggle All */}
                <div className="ur-submodal__select-all">
                    <span className="ur-submodal__select-label">
                        {anyOn ? `${subList.filter(s => localRights[s]).length} of ${subList.length} enabled` : "None enabled"}
                    </span>
                    <button
                        type="button"
                        className={`ur-submodal__all-btn ${allOn ? "ur-submodal__all-btn--off" : "ur-submodal__all-btn--on"}`}
                        onClick={handleToggleAll}
                        style={{ "--mc": module.color }}
                    >
                        {allOn ? "Disable All" : "Enable All"}
                    </button>
                </div>

                {/* Sub-menu list */}
                <div className="ur-submodal__body">
                    {subList.map((sub, idx) => (
                        <div
                            key={sub}
                            className={`ur-submodal__item ${localRights[sub] ? "ur-submodal__item--on" : ""}`}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className="ur-submodal__item-info">
                                <span
                                    className="ur-submodal__item-dot"
                                    style={{ background: localRights[sub] ? module.color : "#cbd5e1" }}
                                />
                                <span className="ur-submodal__item-label">{sub}</span>
                            </div>
                            <Toggle
                                checked={!!localRights[sub]}
                                onChange={() => setLocalRights(prev => ({ ...prev, [sub]: !prev[sub] }))}
                                color={module.color}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="ur-submodal__footer">
                    <button type="button" className="ur-btn ur-btn--ghost" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ur-btn ur-btn--save"
                        onClick={handleApply}
                        style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Apply Rights
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function rightsSnapshot(rights) {
    return JSON.stringify(rights || {});
}

export default function UserRights() {
    const [users, setUsers] = useState([]);
    const [maxUsers, setMaxUsers] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveVersion, setSaveVersion] = useState(0);
    const [error, setError] = useState("");
    const saveTimer = useRef(null);
    const saveInFlightRef = useRef(false);
    const originalRightsRef = useRef(new Map());

    // Sub-menu modal state
    const [subModal, setSubModal] = useState(null); // { userIdx, module, rights }

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const syncOriginalRights = useCallback((userList) => {
        originalRightsRef.current = new Map(
            userList.map((u) => [u.userId, rightsSnapshot(u.rights)]),
        );
    }, []);

    const mapApiUsers = useCallback((rawUsers) => assignColors((rawUsers || []).map(u => ({
        userId: u.userId,
        name: u.userName,
        role: u.designation,
        avatar: u.avatar || (u.userName || "??").slice(0, 2).toUpperCase(),
        rights: { ...u.rights },
        isSuperAdmin: !!u.isSuperAdmin,
    }))), []);

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

            const trimmedName = userName.trim();
            const trimmedRole = designation.trim() || "—";
            const newUser = {
                userId: data.userId,
                name: trimmedName,
                role: trimmedRole,
                avatar: trimmedName.slice(0, 2).toUpperCase(),
                rights: allRightsOn(false),
                isSuperAdmin: false,
                color: COLORS[users.length % COLORS.length],
            };
            setUsers((prev) => {
                const next = assignColors([...prev, newUser]);
                originalRightsRef.current.set(data.userId, rightsSnapshot(newUser.rights));
                return next;
            });
            showToast("success", "Success", `User "${trimmedName}" added successfully.`);
        } catch (err) {
            setAddError(err.message || "Failed to add user.");
        } finally {
            setAdding(false);
        }
    };

    const loadUsers = useCallback(async ({ silent = false } = {}) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError("");
        try {
            const res = await fetch(`${API}/user-rights/list/`, { credentials: "include" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Failed to load users (${res.status})`);
            }
            const mapped = mapApiUsers(data.users);
            setUsers(mapped);
            syncOriginalRights(mapped);
            setMaxUsers(data.stats?.maxUsers || 0);
        } catch (e) {
            showToast("error", "Error", e.message || "Could not load user rights.");
            setUsers([]);
            originalRightsRef.current = new Map();
        } finally {
            if (silent) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [mapApiUsers, syncOriginalRights]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (!showAddModal) {
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
    }, [showAddModal]);

    useEffect(() => {
        const contentEl = document.querySelector(".dl-content");
        const anyOpen = showAddModal || !!deleteConfirm || !!subModal;
        if (anyOpen) {
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
    }, [showAddModal, deleteConfirm, subModal]);

    const dirtyUsers = useMemo(
        () => users.filter((u) => {
            if (u.isSuperAdmin) return false;
            return rightsSnapshot(u.rights) !== originalRightsRef.current.get(u.userId);
        }),
        [users, saveVersion],
    );
    const hasUnsavedChanges = dirtyUsers.length > 0;

    const stats = useMemo(() => {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => MODULES.some(m => u.rights?.[m.key])).length;
        const totalGrants = users.reduce(
            (acc, u) => acc + MODULES.filter(m => u.rights?.[m.key]).length,
            0,
        );
        const avgAccess = totalUsers
            ? Math.round((totalGrants / (totalUsers * MODULES.length)) * 100)
            : 0;
        return { totalUsers, activeUsers, totalGrants, avgAccess };
    }, [users]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return users
            .map((u, i) => ({ ...u, origIdx: i }))
            .filter(u =>
                !q ||
                u.name.toLowerCase().includes(q) ||
                (u.role || "").toLowerCase().includes(q),
            );
    }, [users, search]);

    /* ── Handle toggling parent menus ─────────────────────── */
    const handleToggle = (userIdx, modKey) => {
        const hasSub = !!SUB_MENUS[modKey];
        const user = users[userIdx];
        const currentVal = !!user.rights[modKey];

        if (hasSub) {
            if (currentVal) {
                // Already ON → open modal to reconfigure sub-menus
                const module = MODULES.find(m => m.key === modKey);
                setSubModal({ userIdx, module, rights: { ...user.rights } });
            } else {
                // Turning ON → open modal to pick sub-menus
                const module = MODULES.find(m => m.key === modKey);
                // Pre-enable all sub-menus as default
                const preRights = { ...user.rights };
                (SUB_MENUS[modKey] || []).forEach(sub => { preRights[sub] = true; });
                setSubModal({ userIdx, module, rights: preRights });
            }
        } else {
            // No sub-menus, just toggle directly
            setUsers(prev => prev.map((u, i) => {
                if (i !== userIdx) return u;
                return { ...u, rights: { ...u.rights, [modKey]: !u.rights[modKey] } };
            }));
        }
    };

    /* ── Apply sub-menu modal result ──────────────────────── */
    const handleSubModalApply = (subRights, anyEnabled) => {
        if (!subModal) return;
        const { userIdx, module } = subModal;
        setUsers(prev => prev.map((u, i) => {
            if (i !== userIdx) return u;
            const updatedRights = { ...u.rights, ...subRights };
            updatedRights[module.key] = anyEnabled;
            return { ...u, rights: updatedRights };
        }));
        setSubModal(null);
    };

    /* ── Revoke all (parent OFF, all sub-menus OFF) ───────── */
    const handleGrantAll = (userIdx) => {
        setUsers(prev => prev.map((u, i) => {
            if (i !== userIdx) return u;
            const allowedModules = MODULES.filter(m => u.isSuperAdmin || !ADMIN_ONLY_MODULES.includes(m.key));
            const allOn = allowedModules.every(m => u.rights[m.key]);
            
            const nextVal = !allOn;
            const nextRights = { ...u.rights };
            
            MODULES.forEach(m => {
                const isAdminOnly = ADMIN_ONLY_MODULES.includes(m.key);
                if (u.isSuperAdmin || !isAdminOnly) {
                    nextRights[m.key] = nextVal;
                    if (SUB_MENUS[m.key]) {
                        SUB_MENUS[m.key].forEach(sub => {
                            nextRights[sub] = nextVal;
                        });
                    }
                } else {
                    nextRights[m.key] = false;
                    if (SUB_MENUS[m.key]) {
                        SUB_MENUS[m.key].forEach(sub => {
                            nextRights[sub] = false;
                        });
                    }
                }
            });
            return { ...u, rights: nextRights };
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

            setUsers(prev => {
                const next = prev.filter(u => u.userId !== userId);
                originalRightsRef.current.delete(userId);
                return next;
            });
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
        if (!hasUnsavedChanges || saveInFlightRef.current) {
            if (!hasUnsavedChanges) {
                showToast("info", "No Changes", "There are no unsaved rights changes.");
            }
            return;
        }

        const toSave = dirtyUsers.map(u => ({
            userId: u.userId,
            rights: u.rights,
        }));
        const count = toSave.length;
        const rollbackOrigins = new Map(
            toSave.map(u => [u.userId, originalRightsRef.current.get(u.userId)]),
        );

        saveInFlightRef.current = true;
        toSave.forEach(u => {
            originalRightsRef.current.set(u.userId, rightsSnapshot(u.rights));
        });
        setSaveVersion(v => v + 1);
        setSaved(true);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaved(false), 2400);
        showToast(
            "success",
            "Saved",
            count === 1
                ? "User rights saved successfully."
                : `Saved rights for ${count} users.`,
            "ur-save-success",
        );

        try {
            let res;
            if (count === 1) {
                res = await fetch(`${API}/user-rights/update/`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: toSave[0].userId,
                        rights: toSave[0].rights,
                    }),
                });
            } else {
                res = await fetch(`${API}/user-rights/bulk-save/`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ users: toSave }),
                });
            }

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `Save failed (${res.status})`);
            }
            if (data.errors?.length) {
                throw new Error(data.errors.map(e => e.error || JSON.stringify(e)).join("; "));
            }
        } catch (e) {
            rollbackOrigins.forEach((snap, userId) => {
                if (snap !== undefined) {
                    originalRightsRef.current.set(userId, snap);
                }
            });
            setSaveVersion(v => v + 1);
            setSaved(false);
            toast.dismiss("ur-save-success");
            showToast("error", "Save Failed", e.message || "Could not save user rights.", "ur-save-error");
        } finally {
            saveInFlightRef.current = false;
        }
    };

    return (
        <div className="ur-root">

            <div className="ur-stats">
                <StatCard label="Total Users" value={loading ? "…" : `${stats.totalUsers}/${maxUsers || "—"}`} icon={Users} color="#3b82f6" delay="0s" />
                <StatCard label="Active Users" value={loading ? "…" : stats.activeUsers} icon={Lock} color="#10b981" delay=".06s" />
                <StatCard label="Rights Granted" value={loading ? "…" : stats.totalGrants} icon={CheckSquare} color="#f97316" delay=".12s" />
                <StatCard label="Avg Access" value={loading ? "…" : `${stats.avgAccess}%`} icon={BarChart3} color="#8b5cf6" delay=".18s" />
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
                        disabled={loading || (maxUsers > 0 && stats.totalUsers >= maxUsers)}
                        type="button"
                        title={maxUsers > 0 && stats.totalUsers >= maxUsers ? "User limit reached. Cannot add more users." : "Add User"}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add User
                    </button>
                    <button className="ur-btn ur-btn--ghost" onClick={handleReset} disabled={loading || refreshing} type="button">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                        </svg>
                        {refreshing ? "Reloading…" : "Reload"}
                    </button>
                    <button
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""} ${hasUnsavedChanges ? "ur-btn--pending" : ""}`}
                        onClick={handleSave}
                        disabled={loading || !users.length || !hasUnsavedChanges}
                        type="button"
                        title={hasUnsavedChanges ? `Save ${dirtyUsers.length} changed user(s)` : "No changes to save"}
                    >
                        {saved ? "Saved!" : hasUnsavedChanges ? `Save Changes (${dirtyUsers.length})` : "Save Changes"}
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
                                    {MODULES.map(m => {
                                        const Icon = m.icon;
                                        return (
                                            <th key={m.key} className="ur-th ur-th--compact" title={m.label}>
                                                <div className="ur-th__inner">
                                                    <span className="ur-th__icon">
                                                        <Icon size={14} />
                                                    </span>
                                                    <span className="ur-th__label">{m.label}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th className="ur-th ur-th--actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length > 0 ? filtered.map((user, rowIdx) => {
                                    const allowedModules = MODULES.filter(m => user.isSuperAdmin || !ADMIN_ONLY_MODULES.includes(m.key));
                                    const onCount = MODULES.filter(m => user.rights[m.key]).length;
                                    const allOn = allowedModules.every(m => user.rights[m.key]);
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

                                            {MODULES.map(m => {
                                                const hasSub = !!SUB_MENUS[m.key];
                                                const isOn = !!user.rights[m.key];
                                                const isAdminOnly = ADMIN_ONLY_MODULES.includes(m.key);
                                                const isDisabled = isAdminOnly && !user.isSuperAdmin;
                                                const activeSubCount = hasSub
                                                    ? (SUB_MENUS[m.key] || []).filter(s => !!user.rights[s]).length
                                                    : 0;
                                                return (
                                                    <td key={m.key} className={`ur-td ${isDisabled ? "ur-td--locked" : ""}`}>
                                                        <div className="ur-cell-wrap">
                                                            {isDisabled ? (
                                                                <div className="ur-locked-cell" title="Utility access is reserved for admin users only">
                                                                    <Toggle
                                                                        checked={false}
                                                                        onChange={undefined}
                                                                        color="#94a3b8"
                                                                        disabled={true}
                                                                    />
                                                                    <span className="ur-locked-badge" title="Admin only">
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Toggle
                                                                        checked={isOn}
                                                                        onChange={() => handleToggle(user.origIdx, m.key)}
                                                                        color={m.color}
                                                                    />
                                                                    {hasSub && isOn && (
                                                                        <span
                                                                            className="ur-sub-badge"
                                                                            style={{ background: m.color + "22", color: m.color }}
                                                                            onClick={() => {
                                                                                const module = MODULES.find(mod => mod.key === m.key);
                                                                                setSubModal({ userIdx: user.origIdx, module, rights: { ...user.rights } });
                                                                            }}
                                                                            title={`${activeSubCount} sub-menu(s) enabled — click to configure`}
                                                                        >
                                                                            {activeSubCount}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}

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
                        {hasUnsavedChanges && (
                            <> · <strong>{dirtyUsers.length}</strong> unsaved</>
                        )}
                    </span>
                    <button
                        type="button"
                        className={`ur-btn ur-btn--save ${saved ? "ur-btn--saved" : ""} ${hasUnsavedChanges ? "ur-btn--pending" : ""}`}
                        onClick={handleSave}
                        disabled={loading || !users.length || !hasUnsavedChanges}
                    >
                        {saved ? "Saved!" : hasUnsavedChanges ? `Save Rights (${dirtyUsers.length})` : "Save Rights"}
                    </button>
                </div>
            </div>

            {/* ── Sub-menu Modal ── */}
            <SubMenuModal
                isOpen={!!subModal}
                module={subModal?.module}
                userName={subModal ? users[subModal.userIdx]?.name : ""}
                currentRights={subModal?.rights || {}}
                onApply={handleSubModalApply}
                onCancel={() => setSubModal(null)}
            />

            {/* ── Add User Modal ── */}
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
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUserSubmit} autoComplete="off">
                            <div className="ur-modal__body">
                                {addError && (
                                    <div className="ur-banner ur-banner--error" style={{ marginBottom: "1rem" }} role="alert">
                                        {addError}
                                    </div>
                                )}
                                <div className="ur-form-group">
                                    <label className="ur-label">Username <span className="ur-required">*</span></label>
                                    <div className="ur-input-wrapper">
                                        <User className="ur-input-icon" size={16} />
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
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Designation</label>
                                    <div className="ur-input-wrapper">
                                        <Briefcase className="ur-input-icon" size={16} />
                                        <input
                                            type="text"
                                            className="ur-input"
                                            placeholder="Enter designation (e.g., Manager)"
                                            value={addForm.designation}
                                            onChange={e => setAddForm(prev => ({ ...prev, designation: e.target.value }))}
                                            disabled={adding}
                                        />
                                    </div>
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Password <span className="ur-required">*</span></label>
                                    <div className="ur-input-wrapper">
                                        <KeyRound className="ur-input-icon" size={16} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="ur-input ur-input--password"
                                            placeholder="Min 6 characters"
                                            value={addForm.password}
                                            onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                                            disabled={adding}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="ur-password-toggle"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={adding}
                                            tabIndex={-1}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="ur-form-group">
                                    <label className="ur-label">Confirm Password <span className="ur-required">*</span></label>
                                    <div className="ur-input-wrapper">
                                        <KeyRound className="ur-input-icon" size={16} />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            className="ur-input ur-input--password"
                                            placeholder="Re-enter password"
                                            value={addForm.confirmPassword}
                                            onChange={e => setAddForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            disabled={adding}
                                            required
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="ur-password-toggle"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            disabled={adding}
                                            tabIndex={-1}
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
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

            {/* ── Delete Confirm Modal ── */}
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
                                aria-label="Close confirmation"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="ur-modal__body ur-modal__body--confirm">
                            <div className="ur-confirm-icon-wrap">
                                <AlertTriangle className="ur-confirm-icon" size={32} />
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

            {createPortal(
                <ToastContainer
                    className="ur-toast-container"
                    toastClassName="ur-toast-item"
                    bodyClassName="ur-toast-body"
                    progressClassName="ur-toast-progress"
                    position="top-right"
                    newestOnTop
                />,
                document.body,
            )}
        </div>
    );
}
