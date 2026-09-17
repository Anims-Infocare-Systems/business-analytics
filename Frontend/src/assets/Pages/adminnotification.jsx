import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { 
    MdCampaign, 
    MdNotificationsActive, 
    MdSend, 
    MdDelete, 
    MdRefresh, 
    MdSearch, 
    MdSchedule, 
    MdInfoOutline, 
    MdCheckCircle, 
    MdWarning, 
    MdBuild, 
    MdRocketLaunch, 
    MdPriorityHigh, 
    MdShield, 
    MdFiberManualRecord,
    MdNotificationsNone,
    MdClose,
    MdDeleteForever
} from "react-icons/md";
import { resolveApiBase } from "../../apiBase";
import { adminFetch } from "../../adminAuth";
import "./adminnotification.css";

const API = resolveApiBase();

export default function AdminNotification({ onAuthLost }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        maintenance: 0,
        updates: 0,
        alerts: 0,
        retention_policy: "15 Days Auto-Purge"
    });

    // Form State
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [category, setCategory] = useState("maintenance"); // 'maintenance', 'update', 'alert', 'general'
    const [priority, setPriority] = useState("normal"); // 'normal', 'urgent'
    const [targetAudience, setTargetAudience] = useState("all");

    // Table Filter & Search
    const [filterCategory, setFilterCategory] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Notifications
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminFetch(`${API}/admin/notifications/`);
            if (res.status === 401 || res.status === 403) {
                if (typeof onAuthLost === "function") onAuthLost();
                return;
            }
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }
            const data = await res.json();
            setNotifications(data.items || []);
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (err) {
            console.error("Failed to load notifications:", err);
            toast.error("Failed to load broadcast notifications.");
        } finally {
            setLoading(false);
        }
    }, [onAuthLost]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Handle Publish
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        const trimmedMsg = message.trim();

        if (!trimmedTitle) {
            toast.warning("Please enter a broadcast notification title.");
            return;
        }
        if (!trimmedMsg) {
            toast.warning("Please enter the notification message body.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await adminFetch(`${API}/admin/notifications/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: trimmedTitle,
                    message: trimmedMsg,
                    category,
                    priority,
                    target_audience: targetAudience
                })
            });

            if (res.status === 401 || res.status === 403) {
                if (typeof onAuthLost === "function") onAuthLost();
                return;
            }

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Broadcast published to all users! Auto-deletes in 15 days.");
                handleClearForm();
                fetchNotifications();

                // Instantly notify Dashboard across all open browser tabs to update count automatically
                try {
                    if (typeof window !== "undefined") {
                        if ("BroadcastChannel" in window) {
                            const bc = new BroadcastChannel("ba_system_broadcasts");
                            bc.postMessage({ type: "BROADCAST_PUBLISHED", timestamp: Date.now() });
                            bc.close();
                        }
                        localStorage.setItem("ba_broadcast_ping", String(Date.now()));
                    }
                } catch (err) {
                    console.error("Broadcast signal error:", err);
                }
            } else {
                toast.error(data.error || "Failed to publish broadcast.");
            }
        } catch (err) {
            console.error("Publish error:", err);
            toast.error("Network error while publishing broadcast.");
        } finally {
            setSubmitting(false);
        }
    };

    // Clear form fields
    const handleClearForm = () => {
        setTitle("");
        setMessage("");
        setCategory("maintenance");
        setPriority("normal");
        setTargetAudience("all");
    };

    // Handle Delete via Modern UI Modal
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;

        setDeletingId(id);
        try {
            const res = await adminFetch(`${API}/admin/notifications/${id}/`, {
                method: "DELETE"
            });

            if (res.status === 401 || res.status === 403) {
                if (typeof onAuthLost === "function") onAuthLost();
                return;
            }

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Broadcast #${id} marked as deleted.`);
                setNotifications(prev => prev.map(item => item.id === id ? { ...item, deleted: true, is_active: false } : item));
                setStats(prev => ({
                    ...prev,
                    active: Math.max(0, prev.active - 1)
                }));
                setDeleteTarget(null);

                // Instantly notify Dashboard across all open browser tabs to update count automatically
                try {
                    if (typeof window !== "undefined") {
                        if ("BroadcastChannel" in window) {
                            const bc = new BroadcastChannel("ba_system_broadcasts");
                            bc.postMessage({ type: "BROADCAST_DELETED", timestamp: Date.now() });
                            bc.close();
                        }
                        localStorage.setItem("ba_broadcast_ping", String(Date.now()));
                    }
                } catch (err) {
                    console.error("Broadcast signal error:", err);
                }
            } else {
                toast.error(data.error || "Failed to delete notification.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete notification.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleCancelDelete = () => {
        if (deletingId) return;
        setDeleteTarget(null);
    };

    // Close modal on Escape key press
    useEffect(() => {
        if (!deleteTarget) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && !deletingId) {
                handleCancelDelete();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [deleteTarget, deletingId]);

    // Filtered notifications list (supports all, active, deleted, and categories)
    const filteredNotifications = useMemo(() => {
        return notifications.filter(item => {
            const matchesCat = filterCategory === "all" || 
                (filterCategory === "active" ? (item.is_active && !item.deleted) : filterCategory === "deleted" ? item.deleted : item.category === filterCategory);
            const matchesSearch = !searchTerm.trim() || 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sender_admin.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [notifications, filterCategory, searchTerm]);

    // Category styling helper
    const getCategoryDetails = (cat) => {
        switch (cat) {
            case "maintenance":
                return { label: "Maintenance", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", icon: MdBuild };
            case "update":
                return { label: "Release Update", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", icon: MdRocketLaunch };
            case "alert":
                return { label: "Urgent Alert", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", icon: MdPriorityHigh };
            case "general":
            default:
                return { label: "General Notice", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", icon: MdCampaign };
        }
    };

    const currentCatMeta = getCategoryDetails(category);

    return (
        <div className="an-root">
            {/* KPI Metrics Strip */}
            <div className="an-kpi-grid">
                <div className="an-kpi-card" style={{ "--kpi-glow": "#3b82f6", "--kpi-icon-bg": "rgba(59, 130, 246, 0.14)" }}>
                    <div className="an-kpi-icon-box">
                        <MdNotificationsActive size={24} />
                    </div>
                    <div className="an-kpi-info">
                        <span className="an-kpi-val">{stats.active}</span>
                        <span className="an-kpi-lbl">Active Broadcasts</span>
                    </div>
                </div>

                <div className="an-kpi-card" style={{ "--kpi-glow": "#10b981", "--kpi-icon-bg": "rgba(16, 185, 129, 0.14)" }}>
                    <div className="an-kpi-icon-box" style={{ color: "#34d399" }}>
                        <MdSchedule size={24} />
                    </div>
                    <div className="an-kpi-info">
                        <span className="an-kpi-val">15 Days</span>
                        <span className="an-kpi-lbl">Auto-Purge TTL</span>
                    </div>
                </div>

                <div className="an-kpi-card" style={{ "--kpi-glow": "#f59e0b", "--kpi-icon-bg": "rgba(245, 158, 11, 0.14)" }}>
                    <div className="an-kpi-icon-box" style={{ color: "#fbbf24" }}>
                        <MdBuild size={24} />
                    </div>
                    <div className="an-kpi-info">
                        <span className="an-kpi-val">{stats.maintenance}</span>
                        <span className="an-kpi-lbl">Maintenance Notices</span>
                    </div>
                </div>

                <div className="an-kpi-card" style={{ "--kpi-glow": "#8b5cf6", "--kpi-icon-bg": "rgba(139, 92, 246, 0.14)" }}>
                    <div className="an-kpi-icon-box" style={{ color: "#a78bfa" }}>
                        <MdCampaign size={24} />
                    </div>
                    <div className="an-kpi-info">
                        <span className="an-kpi-val">{stats.total}</span>
                        <span className="an-kpi-lbl">Total Dispatched</span>
                    </div>
                </div>
            </div>

            {/* Split Composer & Live Preview */}
            <div className="an-split-row">
                {/* Form Card */}
                <div className="an-card">
                    <div className="an-card-header">
                        <div className="an-card-header__title-row">
                            <div className="an-card-header__icon">
                                <MdCampaign size={20} />
                            </div>
                            <div>
                                <h3 className="an-card-header__title">Broadcast Notice to All Users</h3>
                                <p className="an-card-header__sub">Send maintenance notices, version updates, or alerts instantly to user topbars</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="an-form">
                        {/* Title */}
                        <div className="an-fg">
                            <label className="an-fl">
                                <span>Notification Title <span style={{ color: "#ef4444" }}>*</span></span>
                                <span className="an-fl-sub">{title.length}/100</span>
                            </label>
                            <input 
                                type="text" 
                                className="an-input"
                                placeholder="e.g. Scheduled Server Maintenance & Performance Upgrade"
                                value={title}
                                maxLength={100}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Category Selector Tiles */}
                        <div className="an-fg">
                            <label className="an-fl">Notification Category</label>
                            <div className="an-cat-tiles">
                                <div 
                                    className={`an-cat-tile ${category === "maintenance" ? "an-cat-tile--active" : ""}`}
                                    style={{ "--tile-color": "#f59e0b", "--tile-active-border": "#f59e0b", "--tile-active-bg": "rgba(245, 158, 11, 0.14)", "--tile-active-glow": "rgba(245, 158, 11, 0.35)" }}
                                    onClick={() => setCategory("maintenance")}
                                >
                                    <div className="an-cat-tile-icon-wrap">
                                        <MdBuild size={18} className="an-cat-tile-icon" />
                                    </div>
                                    <div className="an-cat-tile-text-wrap">
                                        <span className="an-cat-tile-name">Maintenance</span>
                                        <span className="an-cat-tile-desc">Downtime & server upkeep</span>
                                    </div>
                                </div>

                                <div 
                                    className={`an-cat-tile ${category === "update" ? "an-cat-tile--active" : ""}`}
                                    style={{ "--tile-color": "#3b82f6", "--tile-active-border": "#3b82f6", "--tile-active-bg": "rgba(59, 130, 246, 0.14)", "--tile-active-glow": "rgba(59, 130, 246, 0.35)" }}
                                    onClick={() => setCategory("update")}
                                >
                                    <div className="an-cat-tile-icon-wrap">
                                        <MdRocketLaunch size={18} className="an-cat-tile-icon" />
                                    </div>
                                    <div className="an-cat-tile-text-wrap">
                                        <span className="an-cat-tile-name">Release Update</span>
                                        <span className="an-cat-tile-desc">New version & features</span>
                                    </div>
                                </div>

                                <div 
                                    className={`an-cat-tile ${category === "alert" ? "an-cat-tile--active" : ""}`}
                                    style={{ "--tile-color": "#ef4444", "--tile-active-border": "#ef4444", "--tile-active-bg": "rgba(239, 68, 68, 0.14)", "--tile-active-glow": "rgba(239, 68, 68, 0.35)" }}
                                    onClick={() => setCategory("alert")}
                                >
                                    <div className="an-cat-tile-icon-wrap">
                                        <MdPriorityHigh size={18} className="an-cat-tile-icon" />
                                    </div>
                                    <div className="an-cat-tile-text-wrap">
                                        <span className="an-cat-tile-name">Urgent Alert</span>
                                        <span className="an-cat-tile-desc">Critical instructions</span>
                                    </div>
                                </div>

                                <div 
                                    className={`an-cat-tile ${category === "general" ? "an-cat-tile--active" : ""}`}
                                    style={{ "--tile-color": "#a855f7", "--tile-active-border": "#a855f7", "--tile-active-bg": "rgba(168, 85, 247, 0.14)", "--tile-active-glow": "rgba(168, 85, 247, 0.35)" }}
                                    onClick={() => setCategory("general")}
                                >
                                    <div className="an-cat-tile-icon-wrap">
                                        <MdCampaign size={18} className="an-cat-tile-icon" />
                                    </div>
                                    <div className="an-cat-tile-text-wrap">
                                        <span className="an-cat-tile-name">General Notice</span>
                                        <span className="an-cat-tile-desc">Company-wide news</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Priority & Target Audience */}
                        <div className="an-options-row">
                            <div className="an-fg">
                                <label className="an-fl">Priority Level</label>
                                <select 
                                    className="an-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="normal">Normal (Standard Notification)</option>
                                    <option value="urgent">Urgent (Highlighted & Pinned First)</option>
                                </select>
                            </div>

                            <div className="an-fg">
                                <label className="an-fl">Target Audience</label>
                                <select 
                                    className="an-select"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                >
                                    <option value="all">All Organizations & Users (Universal)</option>
                                    <option value="admins">Admin & Manager Accounts Only</option>
                                    <option value="active">Active Plan Subscribers</option>
                                </select>
                            </div>
                        </div>

                        {/* Message Body */}
                        <div className="an-fg">
                            <label className="an-fl">
                                <span>Message Content <span style={{ color: "#ef4444" }}>*</span></span>
                                <span className="an-fl-sub">{message.length}/1000</span>
                            </label>
                            <textarea 
                                className="an-textarea"
                                placeholder="Explain the upcoming maintenance downtime window, feature highlights, or urgent instructions..."
                                value={message}
                                maxLength={1000}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />
                        </div>

                        {/* 15-Day Auto-Purge Guarantee Banner */}
                        <div className="an-guarantee-banner">
                            <MdCheckCircle size={18} style={{ color: "#34d399", flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <strong>15-Day Automatic Deletion Guarantee:</strong> This broadcast is automatically stamped with an expiration date 15 days from creation (`expires_at = DATEADD(day, 15, GETDATE())`). The system auto-purges expired records from the database and user dropdowns without any manual maintenance needed.
                            </div>
                        </div>

                        {/* Action Buttons: Submit + Clear */}
                        <div className="an-form-actions">
                            <button 
                                type="submit" 
                                className="an-submit-btn"
                                disabled={submitting}
                            >
                                <MdSend size={18} className="an-submit-icon" />
                                <span>{submitting ? "Broadcasting to All Users..." : "Send Broadcast to All Users"}</span>
                            </button>
                            {(title || message) && (
                                <button
                                    type="button"
                                    className="an-clear-btn"
                                    onClick={handleClearForm}
                                    title="Clear form fields"
                                >
                                    <MdDelete size={16} />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Live Preview Panel */}
                <div className="an-preview-panel">
                    <div className="an-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <div className="an-card-header">
                            <div className="an-card-header__title-row">
                                <div className="an-card-header__icon" style={{ background: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.3)", color: "#34d399" }}>
                                    <MdInfoOutline size={20} />
                                </div>
                                <div>
                                    <h3 className="an-card-header__title">User Experience Live Preview</h3>
                                    <p className="an-card-header__sub">How this notice will appear in the topbar dropdown</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <div className="an-preview-card" style={{ "--prev-strip": currentCatMeta.color }}>
                                <div className="an-preview-tag-strip" />
                                <div className="an-preview-label">
                                    <span style={{ 
                                        display: "inline-flex", 
                                        alignItems: "center", 
                                        gap: "5px", 
                                        background: currentCatMeta.bg, 
                                        color: currentCatMeta.color, 
                                        padding: "3px 9px", 
                                        borderRadius: "7px",
                                        fontWeight: 750,
                                        fontSize: "0.68rem"
                                    }}>
                                        <currentCatMeta.icon size={12} />
                                        <span>{currentCatMeta.label}</span>
                                    </span>
                                    {priority === "urgent" && (
                                        <span style={{ 
                                            background: "rgba(239, 68, 68, 0.15)", 
                                            color: "#ef4444", 
                                            padding: "2px 8px", 
                                            borderRadius: "6px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}>
                                            <MdFiberManualRecord size={8} /> URGENT
                                        </span>
                                    )}
                                </div>

                                <div className="an-preview-title">
                                    {title.trim() || "Notification Title Appears Here"}
                                </div>

                                <div className="an-preview-body">
                                    {message.trim() || "Detailed broadcast message content will be displayed here for all logged-in users across the ERP system..."}
                                </div>

                                <div className="an-preview-footer">
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <MdSchedule size={13} /> Just now • By System Admin
                                    </span>
                                    <span style={{ color: "#2563eb", fontWeight: 700 }}>
                                        Auto-deletes in 15d
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: "16px", padding: "12px", background: "rgba(11, 15, 25, 0.6)", borderRadius: "10px", fontSize: "0.74rem", color: "#94a3b8", display: "flex", gap: "8px", alignItems: "center" }}>
                            <MdShield size={16} style={{ color: "#3b82f6", flexShrink: 0 }} />
                            <span>Audience: <strong>{targetAudience === "all" ? "All Connected Users" : targetAudience}</strong>. Users will see a glowing pulse dot on the topbar bell until read.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Broadcasts Ledger Table */}
            <div className="an-table-card">
                <div className="an-table-toolbar">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="an-filter-tabs">
                            <button 
                                className={`an-filter-tab ${filterCategory === "all" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("all")}
                            >
                                All ({notifications.length})
                            </button>
                            <button 
                                className={`an-filter-tab ${filterCategory === "active" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("active")}
                            >
                                Active ({stats.active})
                            </button>
                            <button 
                                className={`an-filter-tab ${filterCategory === "deleted" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("deleted")}
                            >
                                Deleted ({notifications.filter(n => n.deleted).length})
                            </button>
                            <button 
                                className={`an-filter-tab ${filterCategory === "maintenance" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("maintenance")}
                            >
                                Maintenance
                            </button>
                            <button 
                                className={`an-filter-tab ${filterCategory === "update" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("update")}
                            >
                                Updates
                            </button>
                            <button 
                                className={`an-filter-tab ${filterCategory === "alert" ? "an-filter-tab--active" : ""}`}
                                onClick={() => setFilterCategory("alert")}
                            >
                                Alerts
                            </button>
                        </div>

                        <button 
                            className="an-filter-tab"
                            onClick={fetchNotifications}
                            disabled={loading}
                            title="Refresh Broadcasts"
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                            <MdRefresh size={16} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    <div className="an-search-box">
                        <MdSearch size={18} className="an-search-icon" />
                        <input 
                            type="text"
                            className="an-search-input"
                            placeholder="Search broadcasts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="an-table-wrap">
                    <table className="an-table">
                        <thead>
                            <tr>
                                <th style={{ width: "60px" }}>ID</th>
                                <th>Broadcast Title & Message</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Sent By</th>
                                <th>Created</th>
                                <th>15-Day TTL</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNotifications.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                                        <MdNotificationsNone size={36} style={{ marginBottom: "8px", opacity: 0.5 }} />
                                        <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>No Broadcast Notifications Found</div>
                                        <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                                            {searchTerm ? "No broadcasts match your search criteria." : "Create your first broadcast notification above."}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredNotifications.map((item) => {
                                    const catMeta = getCategoryDetails(item.category);
                                    return (
                                        <tr key={item.id} style={item.deleted ? { opacity: 0.65 } : undefined}>
                                            <td style={{ fontWeight: 700, color: "#64748b" }}>#{item.id}</td>
                                            <td>
                                                <div style={{ fontWeight: 750, color: "#f8fafc", marginBottom: "4px", fontSize: "0.86rem", textDecoration: item.deleted ? "line-through" : "none" }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5, maxWidth: "540px", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                                                    {item.message}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ 
                                                    display: "inline-flex", 
                                                    alignItems: "center", 
                                                    gap: "5px", 
                                                    fontSize: "0.72rem", 
                                                    fontWeight: 700, 
                                                    padding: "3px 9px", 
                                                    borderRadius: "7px", 
                                                    background: catMeta.bg, 
                                                    color: catMeta.color 
                                                }}>
                                                    <catMeta.icon size={13} />
                                                    <span>{catMeta.label}</span>
                                                </span>
                                            </td>
                                            <td>
                                                {item.priority === "urgent" ? (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: "#ef4444", fontWeight: 750, fontSize: "0.72rem" }}>
                                                        <MdPriorityHigh size={14} /> URGENT
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>Normal</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>{item.sender_admin}</span>
                                            </td>
                                            <td>
                                                <div style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>{item.time_ago}</div>
                                                <div style={{ color: "#64748b", fontSize: "0.7rem" }}>{item.created_at_formatted}</div>
                                            </td>
                                            <td>
                                                <span className="an-ttl-pill">
                                                    <MdSchedule size={12} />
                                                    <span>{item.days_remaining}d remaining</span>
                                                </span>
                                            </td>
                                            <td>
                                                {item.deleted ? (
                                                    <span className="an-status-pill an-status-pill--deleted" title="deleted = true">
                                                        Deleted
                                                    </span>
                                                ) : item.is_active ? (
                                                    <span className="an-status-pill an-status-pill--active">
                                                        <MdFiberManualRecord size={7} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="an-status-pill an-status-pill--expired">
                                                        Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                {item.deleted ? (
                                                    <span className="an-deleted-badge" title="Broadcast marked as deleted (deleted = true)">
                                                        Deleted
                                                    </span>
                                                ) : (
                                                    <button 
                                                        className="an-delete-btn"
                                                        onClick={() => setDeleteTarget(item)}
                                                        disabled={deletingId === item.id}
                                                        title="Delete notification (marks deleted = true)"
                                                    >
                                                        <MdDelete size={14} />
                                                        <span>{deletingId === item.id ? "Deleting..." : "Delete"}</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modern UI Delete Confirmation Modal */}
            {deleteTarget && createPortal(
                <div className="an-modal-backdrop" onClick={handleCancelDelete}>
                    <div 
                        className="an-modal-card" 
                        onClick={e => e.stopPropagation()} 
                        role="dialog" 
                        aria-modal="true"
                        aria-labelledby="an-modal-title-id"
                    >
                        {/* Glowing neon top accent line */}
                        <div className="an-modal-glow-line" />

                        {/* Top-right close button */}
                        <button 
                            type="button" 
                            className="an-modal-close-btn" 
                            onClick={handleCancelDelete}
                            disabled={deletingId !== null}
                            aria-label="Close modal"
                        >
                            <MdClose size={18} />
                        </button>

                        {/* Pulsing warning/trash icon badge */}
                        <div className="an-modal-icon-badge">
                            <MdDeleteForever size={32} />
                        </div>

                        {/* Modal Header */}
                        <h3 className="an-modal-title" id="an-modal-title-id">
                            Delete Broadcast Notice?
                        </h3>
                        <p className="an-modal-subtitle">
                            Are you sure you want to delete this broadcast notice? It will be updated with <code>deleted = true</code> and immediately removed from user dashboards.
                        </p>

                        {/* Target Preview Card */}
                        <div className="an-modal-preview">
                            <div className="an-modal-preview-top">
                                <span className="an-modal-preview-id">#{deleteTarget.id}</span>
                                {(() => {
                                    const cat = getCategoryDetails(deleteTarget.category);
                                    return (
                                        <span 
                                            className="an-modal-preview-badge"
                                            style={{ background: cat.bg, color: cat.color }}
                                        >
                                            <cat.icon size={12} />
                                            <span>{cat.label}</span>
                                        </span>
                                    );
                                })()}
                                {deleteTarget.priority === "urgent" && (
                                    <span className="an-modal-preview-urgent">
                                        <MdPriorityHigh size={12} /> URGENT
                                    </span>
                                )}
                            </div>
                            <div className="an-modal-preview-title">
                                {deleteTarget.title}
                            </div>
                            <div className="an-modal-preview-message">
                                {deleteTarget.message}
                            </div>
                            <div className="an-modal-preview-meta">
                                <span><MdSchedule size={12} /> {deleteTarget.days_remaining}d remaining</span>
                                <span>•</span>
                                <span>Sent by {deleteTarget.sender_admin || "admin"}</span>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="an-modal-actions">
                            <button 
                                type="button" 
                                className="an-modal-cancel-btn"
                                onClick={handleCancelDelete}
                                disabled={deletingId !== null}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="an-modal-confirm-btn"
                                onClick={handleConfirmDelete}
                                disabled={deletingId !== null}
                            >
                                {deletingId === deleteTarget.id ? (
                                    <>
                                        <span className="an-modal-spinner" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <MdDeleteForever size={18} />
                                        <span>Confirm Delete</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
