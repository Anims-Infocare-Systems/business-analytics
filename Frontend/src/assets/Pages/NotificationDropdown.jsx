import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    Bell,
    Sparkles,
    Wrench,
    Rocket,
    AlertTriangle,
    Megaphone,
    CheckCheck,
    Clock,
    Shield,
    X,
    Check,
    Inbox
} from "lucide-react";
import { resolveApiBase } from "../../apiBase";
import "./NotificationDropdown.css";

const API = resolveApiBase();

export default function NotificationDropdown({ companyCode, userName }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    // Read IDs storage key per user
    const storageKey = useMemo(() => {
        const c = String(companyCode || "global").trim().toUpperCase();
        const u = String(userName || "user").trim().toLowerCase();
        return `ba_read_notifications_${c}_${u}`;
    }, [companyCode, userName]);

    const [readIds, setReadIds] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Save read IDs to localStorage
    const saveReadIds = useCallback((newSet) => {
        setReadIds(newSet);
        try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
        } catch (err) {
            console.error("Failed to save read notification IDs:", err);
        }
    }, [storageKey]);

    // Fetch active notifications
    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/notifications/active/?_t=${Date.now()}`, {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error("Error loading active notifications:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load & periodic background polling every 90 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 90000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    // Unread count
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !readIds.has(n.id)).length;
    }, [notifications, readIds]);

    // Mark single notification as read
    const handleMarkAsRead = (e, id) => {
        e.stopPropagation();
        const next = new Set(readIds);
        next.add(id);
        saveReadIds(next);
    };

    // Mark all as read
    const handleMarkAllAsRead = () => {
        const allIds = new Set([...readIds, ...notifications.map(n => n.id)]);
        saveReadIds(allIds);
    };

    // Helper for category metadata
    const getCategoryMeta = (cat) => {
        switch (cat) {
            case "maintenance":
                return {
                    label: "Maintenance",
                    icon: Wrench,
                    cls: "nd-cat-chip--maintenance",
                    color: "#f59e0b"
                };
            case "alert":
                return {
                    label: "Alert",
                    icon: AlertTriangle,
                    cls: "nd-cat-chip--alert",
                    color: "#ef4444"
                };
            case "general":
                return {
                    label: "General Notice",
                    icon: Megaphone,
                    cls: "nd-cat-chip--general",
                    color: "#8b5cf6"
                };
            case "update":
            default:
                return {
                    label: "System Update",
                    icon: Rocket,
                    cls: "nd-cat-chip--update",
                    color: "#0ea5e9"
                };
        }
    };

    return (
        <div className="nd-wrapper" ref={containerRef}>
            {/* ── Bell Icon Button ── */}
            <button
                type="button"
                className={`nd-bell-btn ${isOpen ? "nd-bell-btn--active" : ""} ${unreadCount > 0 ? "nd-bell-btn--unread" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                title={unreadCount > 0 ? `${unreadCount} Unread System Broadcasts` : "System Notifications"}
                aria-label="System Notifications"
            >
                <Bell size={18} className="nd-bell-icon" />

                {/* Pulse wave & numeric badge if unread notifications exist */}
                {unreadCount > 0 && (
                    <>
                        <span className="nd-badge-pulse" />
                        <span className="nd-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    </>
                )}
            </button>

            {/* ── Flyout Dropdown ── */}
            {isOpen && (
                <>
                    <div className="nd-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />
                    <div className="nd-dropdown" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="nd-dropdown__header">
                        <div className="nd-dropdown__header-left">
                            <div className="nd-header-icon-box">
                                <Sparkles size={16} />
                            </div>
                            <div className="nd-header-title-group">
                                <h4 className="nd-header-title">
                                    Announcements
                                    {unreadCount > 0 && (
                                        <span className="nd-header-count-pill">{unreadCount} new</span>
                                    )}
                                </h4>
                                <p className="nd-header-subtitle">
                                    Broadcast notices from Anims
                                </p>
                            </div>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="nd-mark-all-btn"
                                onClick={handleMarkAllAsRead}
                                title="Mark all notifications as read"
                            >
                                <CheckCheck size={13} />
                                <span>Mark read</span>
                            </button>
                        )}
                    </div>

                    {/* Notification Cards List */}
                    <div className="nd-list">
                        {loading && notifications.length === 0 ? (
                            <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "0.8rem" }}>
                                Loading broadcasts…
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="nd-empty">
                                <div className="nd-empty-icon-wrap">
                                    <Inbox size={24} />
                                </div>
                                <div className="nd-empty-title">All Caught Up!</div>
                                <p className="nd-empty-desc">
                                    No active announcements right now.
                                </p>
                            </div>
                        ) : (
                            notifications.map((item, idx) => {
                                const isUnread = !readIds.has(item.id);
                                const meta = getCategoryMeta(item.category);
                                const IconComp = meta.icon;

                                return (
                                    <div
                                        key={item.id}
                                        className={`nd-card ${isUnread ? "nd-card--unread" : ""} ${item.priority === "urgent" ? "nd-card--urgent" : ""}`}
                                        style={{ "--card-index": idx, "--cat-color": meta.color }}
                                        onClick={(e) => {
                                            if (isUnread) handleMarkAsRead(e, item.id);
                                        }}
                                    >
                                        <div
                                            className="nd-card__accent"
                                            style={{ background: meta.color }}
                                        />

                                        <div className="nd-card__top">
                                            <div className="nd-card__tags">
                                                <span className={`nd-cat-chip ${meta.cls}`}>
                                                    <IconComp size={10} />
                                                    {meta.label}
                                                </span>
                                                {item.priority === "urgent" && (
                                                    <span className="nd-urgent-pill">
                                                        <AlertTriangle size={9} />
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>

                                            <div className="nd-card__meta-right">
                                                <span className="nd-time-tag">{item.time_ago}</span>
                                                {isUnread && <span className="nd-unread-dot" title="Unread notice" />}
                                            </div>
                                        </div>

                                        <h5 className="nd-card__title">{item.title}</h5>
                                        <p className="nd-card__msg">{item.message}</p>

                                        <div className="nd-card__footer">
                                            <span className="nd-expiry-pill" title="Auto-purged after 15 days">
                                                <Clock size={11} />
                                                {item.expiry_label || `${item.days_remaining}d remaining`}
                                            </span>
                                            {isUnread && (
                                                <button
                                                    type="button"
                                                    className="nd-mark-card-btn"
                                                    onClick={(e) => handleMarkAsRead(e, item.id)}
                                                    title="Mark this announcement as read"
                                                >
                                                    <Check size={12} />
                                                    <span>Mark as read</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Policy Guarantee */}
                    <div className="nd-dropdown__footer">
                        <Shield size={12} style={{ color: "#3b82f6" }} />
                        <span>System notices automatically purge after <strong>15 days</strong></span>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
