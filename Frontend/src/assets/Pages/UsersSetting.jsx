/**
 * UsersSetting.jsx
 * Sub-menu under Utility — Superadmin Exclusive
 * Ultra-Premium, State-of-the-Art User Settings Hub with Multi-Category Tabs,
 * Micro-animations, Rich Interactive Controls, and Portal Modals.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { resolveApiBase } from "../../apiBase";
import "./UsersSetting.css";
import {
    ShieldCheck,
    Users,
    Sliders,
    Save,
    RotateCcw,
    Search,
    Filter,
    CheckCircle2,
    Lock,
    HelpCircle,
    Info,
    Sparkles,
    ArrowUpDown,
    Check,
    X,
    SlidersHorizontal,
    TrendingUp,
    ShieldAlert,
    FileCheck2,
    Wrench,
    Mail,
    SlidersVertical,
    UserCheck,
    UserX,
    Laptop,
    Layers,
    Eye,
    EyeOff,
    ArrowLeft,
    LayoutGrid
} from "lucide-react";

const API = resolveApiBase();
const STORAGE_KEY = "eapproval_po_user_limits";
const HIDE_UNDER_1000_KEY = "eapproval_filter_hide_under_1000";

// Tabs definition
const TABS = [
    { id: "eapproval", label: "E-Approval PO Limits", icon: FileCheck2 },
    { id: "technical", label: "T & M Approvals", icon: Wrench, disabled: true },
];

// Quick amount presets (in INR)
const PRESETS = [
    { label: "10K", value: 10000 },
    { label: "15K", value: 15000 },
    { label: "25K", value: 25000 },
    { label: "50K", value: 50000 },
    { label: "1L", value: 100000 },
    { label: "5L", value: 500000 },
    { label: "10L", value: 1000000 },
];

const COLORS = [
    "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "linear-gradient(135deg, #10b981, #047857)",
    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "linear-gradient(135deg, #06b6d4, #0e7490)",
    "linear-gradient(135deg, #f97316, #c2410c)",
    "linear-gradient(135deg, #ec4899, #be185d)",
    "linear-gradient(135deg, #6366f1, #4338ca)",
    "linear-gradient(135deg, #14b8a6, #0f766e)"
];

// Helper to convert number to Indian currency format string (e.g. 15,000)
const fmtINR = (val) => {
    if (val === null || val === undefined || val === "" || isNaN(val)) return "0";
    return Number(val).toLocaleString("en-IN");
};

// Helper for human-readable Indian amount in words
const numberToWordsINR = (num) => {
    num = Number(num);
    if (!num || isNaN(num) || num <= 0) return "Zero Rupees";
    if (num >= 10000000) return `${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Crore Rupees`;
    if (num >= 100000) return `${(num / 100000).toFixed(2).replace(/\.00$/, '')} Lakh Rupees`;
    if (num >= 1000) return `${(num / 1000).toFixed(2).replace(/\.00$/, '')} Thousand Rupees`;
    return `${num} Rupees`;
};

// Fallback mock users when offline / testing
const DEFAULT_MOCK_USERS = [
    { userId: "1", userName: "Admin", designation: "System Administrator", isSuperAdmin: true },
    { userId: "2", userName: "Pranesh", designation: "Purchase Manager", isSuperAdmin: false },
    { userId: "3", userName: "Sabarish", designation: "Operations Lead", isSuperAdmin: false },
    { userId: "4", userName: "Ramkumar", designation: "Store Incharge", isSuperAdmin: false },
    { userId: "5", userName: "Kavitha", designation: "Quality Inspector", isSuperAdmin: false },
];

export default function UsersSetting() {
    const [activeTab, setActiveTab] = useState(null); // null by default (Overview Hub)
    const [users, setUsers] = useState([]);
    const [limits, setLimits] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'limited' | 'unlimited'
    const [toastMessage, setToastMessage] = useState(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkLimit, setBulkLimit] = useState(15000);
    const [bulkApplyTo, setBulkApplyTo] = useState("all"); // 'all' | 'non-admin'

    // Policy: Hide POs with Total Amount <= ₹1,000 (Disabled by default)
    const [hideUnder1000, setHideUnder1000] = useState(() => {
        try {
            return localStorage.getItem(HIDE_UNDER_1000_KEY) === "true";
        } catch {
            return false;
        }
    });

    const handleToggleHideUnder1000 = () => {
        const nextVal = !hideUnder1000;
        setHideUnder1000(nextVal);
        localStorage.setItem(HIDE_UNDER_1000_KEY, String(nextVal));
        showToast(
            nextVal
                ? "Active: POs with Amount ≤ ₹1,000 will be hidden in E-Approval"
                : "Disabled: All POs including ≤ ₹1,000 will now show in E-Approval",
            nextVal ? "success" : "info"
        );
    };

    // Notification toast helper
    const showToast = useCallback((msg, type = "success") => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    }, []);

    // Auto-open E-Approval limits tab when navigated via Spotlight
    useEffect(() => {
        const handleSpotlight = (e) => {
            if (e.detail && (e.detail.id === "us-po-limits" || e.detail.id === "us-threshold-policy")) {
                setActiveTab("eapproval");
            }
        };
        window.addEventListener("spotlight-section-selected", handleSpotlight);
        return () => window.removeEventListener("spotlight-section-selected", handleSpotlight);
    }, []);

    // Load initial user limits from localStorage
    const loadStoredLimits = useCallback(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, []);

    // Fetch users list from API and load persisted database limits
    useEffect(() => {
        let isMounted = true;
        const fetchUsers = async () => {
            setIsLoading(true);
            const savedLimits = loadStoredLimits();
            try {
                const res = await fetch(`${API}/user-rights/list/`, { credentials: "include" });
                const data = await res.json();

                // Fetch saved limits from backend database
                let backendLimits = {};
                try {
                    const limRes = await fetch(`${API}/eapproval/user-limits/`, { credentials: "include" });
                    if (limRes.ok) {
                        const limData = await limRes.json();
                        if (limData && limData.limits) {
                            backendLimits = limData.limits;
                        }
                    }
                } catch {
                    // Fallback to localStorage
                }

                if (res.ok && data.users && data.users.length > 0) {
                    if (isMounted) {
                        setUsers(data.users);
                        // Initialize user limits mapping (backend DB > localStorage > default)
                        const initialLimits = {};
                        data.users.forEach(u => {
                            const uid = String(u.userId || u.userName);
                            const bLim = backendLimits[u.userName];
                            if (bLim) {
                                initialLimits[uid] = {
                                    isUnlimited: Boolean(bLim.isUnlimited),
                                    limit: bLim.isUnlimited ? 0 : (bLim.limit || 15000),
                                    eapproval: true,
                                };
                            } else if (savedLimits[uid]) {
                                initialLimits[uid] = savedLimits[uid];
                            } else {
                                initialLimits[uid] = {
                                    isUnlimited: u.isSuperAdmin ? true : false,
                                    limit: u.isSuperAdmin ? 0 : 15000,
                                    eapproval: true,
                                    tapproval: false,
                                    mapproval: false,
                                };
                            }
                        });
                        setLimits(initialLimits);
                    }
                } else {
                    throw new Error("API fallback");
                }
            } catch (err) {
                if (isMounted) {
                    setUsers(DEFAULT_MOCK_USERS);
                    const initialLimits = {};
                    DEFAULT_MOCK_USERS.forEach(u => {
                        const uid = String(u.userId || u.userName);
                        initialLimits[uid] = savedLimits[uid] || {
                            isUnlimited: u.isSuperAdmin ? true : false,
                            limit: u.isSuperAdmin ? 0 : 15000,
                            eapproval: true,
                            tapproval: false,
                            mapproval: false,
                        };
                    });
                    setLimits(initialLimits);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchUsers();
        return () => { isMounted = false; };
    }, [loadStoredLimits]);

    // Handle limit toggle (Unlimited vs Custom Limit)
    const handleToggleMode = (uid, mode) => {
        setLimits(prev => {
            const current = prev[uid] || { limit: 15000, isUnlimited: false, eapproval: true };
            return {
                ...prev,
                [uid]: {
                    ...current,
                    isUnlimited: mode === "unlimited",
                    limit: mode === "unlimited" ? 0 : (current.limit > 0 ? current.limit : 15000),
                }
            };
        });
    };

    // Handle numeric limit change
    const handleLimitChange = (uid, val) => {
        const num = Math.max(0, parseInt(val, 10) || 0);
        setLimits(prev => {
            const current = prev[uid] || { isUnlimited: false, eapproval: true };
            return {
                ...prev,
                [uid]: {
                    ...current,
                    isUnlimited: false,
                    limit: num,
                }
            };
        });
    };

    // Quick preset click
    const handleApplyPreset = (uid, val) => {
        handleLimitChange(uid, val);
    };

    // Save configuration to backend database and localStorage
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Attach userName for database mapping
            const payloadLimits = {};
            users.forEach(u => {
                const uid = String(u.userId || u.userName);
                const lim = limits[uid] || {};
                payloadLimits[u.userName] = {
                    userName: u.userName,
                    limit: lim.isUnlimited ? 0 : (lim.limit || 15000),
                    isUnlimited: Boolean(lim.isUnlimited),
                    eapproval: true,
                };
            });

            // Save locally
            localStorage.setItem(STORAGE_KEY, JSON.stringify(limits));
            localStorage.setItem(HIDE_UNDER_1000_KEY, String(hideUnder1000));

            // Persist to backend database
            const res = await fetch(`${API}/eapproval/user-limits/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    limits: payloadLimits,
                    hideUnder1000: hideUnder1000,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Save failed");
            }

            showToast("Users Setting configuration saved to database successfully!", "success");
        } catch (e) {
            console.error("Save error:", e);
            showToast("Failed to save settings — please try again", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Reset all limits to defaults
    const handleResetAll = () => {
        const resetObj = {};
        users.forEach(u => {
            const uid = String(u.userId || u.userName);
            resetObj[uid] = {
                isUnlimited: u.isSuperAdmin ? true : false,
                limit: u.isSuperAdmin ? 0 : 15000,
                eapproval: true,
                tapproval: false,
                mapproval: false,
            };
        });
        setLimits(resetObj);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resetObj));
        showToast("All user limits reset to default (₹15,000 for standard users)", "info");
    };

    // Bulk apply limit
    const handleApplyBulk = () => {
        setLimits(prev => {
            const next = { ...prev };
            users.forEach(u => {
                if (bulkApplyTo === "non-admin" && u.isSuperAdmin) return;
                const uid = String(u.userId || u.userName);
                next[uid] = {
                    ...(next[uid] || { eapproval: true }),
                    isUnlimited: false,
                    limit: bulkLimit,
                };
            });
            return next;
        });
        setBulkModalOpen(false);
        showToast(`Applied limit of ₹${fmtINR(bulkLimit)} to ${bulkApplyTo === "all" ? "all users" : "standard users"}`, "success");
    };

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const uid = String(u.userId || u.userName);
            const userLim = limits[uid] || { isUnlimited: false, limit: 15000 };
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (u.userName || "").toLowerCase().includes(q) || (u.designation || "").toLowerCase().includes(q);

            if (!matchesSearch) return false;
            if (filterStatus === "limited") return !userLim.isUnlimited;
            if (filterStatus === "unlimited") return userLim.isUnlimited;
            return true;
        });
    }, [users, limits, searchQuery, filterStatus]);

    // Summary KPIs
    const stats = useMemo(() => {
        let total = users.length;
        let limited = 0;
        let unlimited = 0;
        let totalLimitedSum = 0;

        users.forEach(u => {
            const uid = String(u.userId || u.userName);
            const cfg = limits[uid];
            if (cfg?.isUnlimited) {
                unlimited++;
            } else {
                limited++;
                totalLimitedSum += (cfg?.limit || 15000);
            }
        });

        const avgLimit = limited > 0 ? Math.round(totalLimitedSum / limited) : 0;
        return { total, limited, unlimited, avgLimit };
    }, [users, limits]);

    return (
        <div className="us-root">

            {/* ── Toast Notification ── */}
            {toastMessage && (
                <div className={`us-toast us-toast--${toastMessage.type}`}>
                    <CheckCircle2 size={18} />
                    <span>{toastMessage.msg}</span>
                </div>
            )}

            {/* ── Top Header ── */}
            <div className="us-header" data-spotlight="us-hub">
                <div className="us-header__left">
                    <div className="us-header__icon-box">
                        <SlidersHorizontal size={26} />
                    </div>
                    <div className="us-header__title-wrap">
                        <h1>
                            Users Setting Hub
                            {/*  */}
                        </h1>
                        <p className="us-header__desc">
                            Centralized administration for user-level PO approval thresholds, technical rights, automated alerts, plant assignment, and security policies.
                        </p>
                    </div>
                </div>

                <div className="us-header__actions">
                    {activeTab === "eapproval" && (
                        <>
                            <button
                                type="button"
                                className={`us-btn us-btn--hide-threshold ${hideUnder1000 ? 'us-btn--hide-active' : 'us-btn--hide-inactive'}`}
                                data-spotlight="us-threshold-policy"
                                onClick={handleToggleHideUnder1000}
                                title="When enabled, POs with Total Amount ≤ ₹1,000 will not be shown in E-Approval"
                            >
                                <span className="us-btn__icon-wrap">
                                    {hideUnder1000 ? <EyeOff size={16} /> : <Eye size={16} />}
                                </span>
                                <span className="us-btn__label">Hide POs ≤ ₹1,000</span>
                                <span className={`us-switch-pill ${hideUnder1000 ? 'us-switch-pill--on' : ''}`}>
                                    <span className="us-switch-pill__knob" />
                                </span>
                            </button>

                            <button
                                type="button"
                                className="us-btn us-btn--outline"
                                onClick={() => setBulkModalOpen(true)}
                                title="Apply uniform limit across multiple users"
                            >
                                <Sliders size={15} />
                                <span className="us-btn__label">Bulk Set Limit</span>
                            </button>
                        </>
                    )}

                    {activeTab && (
                        <button
                            type="button"
                            className="us-btn us-btn--primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save size={15} />
                            <span className="us-btn__label">{isSaving ? "Saving…" : "Save Configuration"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Modular Tab Navigation Bar ── */}
            <div className="us-tab-bar">
                {TABS.map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    const isDisabled = t.disabled;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            className={`us-tab-btn ${isActive ? "us-tab-btn--active" : ""} ${isDisabled ? "us-tab-btn--disabled" : ""}`}
                            onClick={() => !isDisabled && setActiveTab(t.id)}
                            disabled={isDisabled}
                            title={isDisabled ? "Currently inactive" : ""}
                        >
                            <Icon size={16} />
                            <span>{t.label}</span>
                            {t.badge && <span className="us-tab-badge">{t.badge}</span>}
                        </button>
                    );
                })}

                {activeTab !== null && (
                    <button
                        type="button"
                        className="us-back-btn"
                        onClick={() => setActiveTab(null)}
                        title="Deselect and return to settings launcher"
                    >
                        <ArrowLeft size={14} />
                        All Modules
                    </button>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* DEFAULT LANDING: MINIMALIST SETTING STARTER STATE           */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === null && (
                <div className="us-empty-state">
                    <div className="us-empty-state__icon-ring">
                        <div className="us-empty-state__icon-core">
                            <SlidersHorizontal size={30} />
                        </div>
                    </div>
                    <h2 className="us-empty-state__title">Select a Setting Module</h2>
                    <p className="us-empty-state__desc">
                        Choose a configuration category from the menu above to manage user authorization rules and purchase approval limits.
                    </p>

                    <div className="us-empty-state__quick-pills">
                        <button
                            type="button"
                            className="us-quick-launch-pill us-quick-launch-pill--active"
                            onClick={() => setActiveTab("eapproval")}
                        >
                            <FileCheck2 size={16} />
                            <span>E-Approval PO Limits</span>
                            <span className="us-quick-launch-pill__arrow">→</span>
                        </button>

                        <div className="us-quick-launch-pill us-quick-launch-pill--inactive" title="Coming soon in future release">
                            <Wrench size={16} />
                            <span>T & M Approvals</span>
                            <span className="us-quick-launch-pill__tag">Inactive</span>
                        </div>
                    </div>

                    <div className="us-empty-state__future-hint">
                        <Sparkles size={13} style={{ color: "#6366f1" }} />
                        <span>Extensible authorization architecture ready for future enterprise rules & modules</span>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 1: E-APPROVAL PO LIMITS (ACTIVE CORE FEATURE)           */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "eapproval" && (
                <>
                    {/* KPI Summary Grid */}
                    <div className="us-kpi-grid">
                        <div className="us-kpi-card">
                            <div className="us-kpi-card__icon us-kpi-card__icon--indigo">
                                <Users size={24} />
                            </div>
                            <div className="us-kpi-card__body">
                                <span className="us-kpi-card__label">Total Users</span>
                                <span className="us-kpi-card__val">{stats.total}</span>
                                <span className="us-kpi-card__hint">Registered ERP accounts</span>
                            </div>
                        </div>

                        <div className="us-kpi-card">
                            <div className="us-kpi-card__icon us-kpi-card__icon--amber">
                                <ShieldAlert size={24} />
                            </div>
                            <div className="us-kpi-card__body">
                                <span className="us-kpi-card__label">Restricted PO Limit</span>
                                <span className="us-kpi-card__val">{stats.limited}</span>
                                <span className="us-kpi-card__hint">Users capped to specific amount</span>
                            </div>
                        </div>

                        <div className="us-kpi-card">
                            <div className="us-kpi-card__icon us-kpi-card__icon--emerald">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="us-kpi-card__body">
                                <span className="us-kpi-card__label">Unlimited Approvers</span>
                                <span className="us-kpi-card__val">{stats.unlimited}</span>
                                <span className="us-kpi-card__hint">Full access to all PO amounts</span>
                            </div>
                        </div>

                        <div className="us-kpi-card">
                            <div className="us-kpi-card__icon us-kpi-card__icon--violet">
                                <TrendingUp size={24} />
                            </div>
                            <div className="us-kpi-card__body">
                                <span className="us-kpi-card__label">Average Limit Cap</span>
                                <span className="us-kpi-card__val">₹ {fmtINR(stats.avgLimit)}</span>
                                <span className="us-kpi-card__hint">Across restricted users</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="us-filter-bar">
                        <div className="us-filter-bar__left">
                            <div className="us-search-box">
                                <Search size={16} className="us-search-box__icon" />
                                <input
                                    type="text"
                                    className="us-search-box__input"
                                    placeholder="Search by username, designation, role…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="us-search-box__clear"
                                        onClick={() => setSearchQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="us-filter-chips">
                                <button
                                    type="button"
                                    className={`us-chip ${filterStatus === "all" ? "us-chip--active" : ""}`}
                                    onClick={() => setFilterStatus("all")}
                                >
                                    All ({users.length})
                                </button>
                                <button
                                    type="button"
                                    className={`us-chip ${filterStatus === "limited" ? "us-chip--active" : ""}`}
                                    onClick={() => setFilterStatus("limited")}
                                >
                                    Limited ({stats.limited})
                                </button>
                                <button
                                    type="button"
                                    className={`us-chip ${filterStatus === "unlimited" ? "us-chip--active" : ""}`}
                                    onClick={() => setFilterStatus("unlimited")}
                                >
                                    Unlimited ({stats.unlimited})
                                </button>
                            </div>
                        </div>

                        <div
                            className={`us-filter-policy-badge ${hideUnder1000 ? 'us-filter-policy-badge--active' : ''}`}
                            data-spotlight="us-threshold-policy"
                            onClick={handleToggleHideUnder1000}
                            title="Click to toggle filtering of POs with Amount ≤ ₹1,000"
                        >
                            <span className={hideUnder1000 ? 'us-pulse-dot--emerald' : 'us-pulse-dot--neutral'} />
                            <span className="us-filter-policy-label">
                                POs ≤ ₹1,000: {hideUnder1000 ? <span className="us-filter-policy-status--active">Hidden</span> : <span className="us-filter-policy-status--inactive">Shown</span>}
                            </span>
                            <span className="us-filter-policy-tag">
                                {hideUnder1000 ? "Filtering On" : "Show All"}
                            </span>
                        </div>
                    </div>

                    {/* User Limits Table */}
                    <div className="us-table-wrap" data-spotlight="us-po-limits">
                        <table className="us-table">
                            <thead>
                                <tr>
                                    <th>User Profile</th>
                                    <th>Access Mode</th>
                                    <th>PO Amount Limit (Threshold)</th>
                                    <th>Active Scope</th>
                                    <th>Effective Permission Rule</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
                                            No users found matching "{searchQuery}"
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u, idx) => {
                                        const uid = String(u.userId || u.userName);
                                        const userCfg = limits[uid] || { isUnlimited: false, limit: 15000, eapproval: true };
                                        const isUnl = !!userCfg.isUnlimited;
                                        const avatarGrad = COLORS[idx % COLORS.length];
                                        const initials = (u.userName || "U").slice(0, 2).toUpperCase();

                                        return (
                                            <tr key={uid} className="us-table-row">
                                                {/* User Cell */}
                                                <td data-label="User Profile" className="us-td us-td--profile">
                                                    <div className="us-user-cell">
                                                        <div className="us-avatar" style={{ background: avatarGrad }}>
                                                            {initials}
                                                        </div>
                                                        <div className="us-user-info">
                                                            <span className="us-user-name">
                                                                {u.userName}
                                                                {u.isSuperAdmin && (
                                                                    <span className="us-admin-tag">Admin</span>
                                                                )}
                                                            </span>
                                                            <span className="us-user-role">{u.designation || "General User"}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Mode Switcher */}
                                                <td data-label="Access Mode" className="us-td us-td--mode">
                                                    <div className="us-mode-toggle">
                                                        <button
                                                            type="button"
                                                            className={`us-mode-btn ${!isUnl ? "us-mode-btn--active-limited" : ""}`}
                                                            onClick={() => handleToggleMode(uid, "limited")}
                                                        >
                                                            Set Limit (₹)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`us-mode-btn ${isUnl ? "us-mode-btn--active" : ""}`}
                                                            onClick={() => handleToggleMode(uid, "unlimited")}
                                                        >
                                                            Unlimited
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Limit Control */}
                                                <td data-label="PO Amount Limit" className="us-td us-td--limit">
                                                    {isUnl ? (
                                                        <span className="us-status-pill us-status-pill--unlimited">
                                                            <Check size={14} />
                                                            No Amount Cap (All POs)
                                                        </span>
                                                    ) : (
                                                        <div className="us-limit-box">
                                                            <div className="us-input-group">
                                                                <span className="us-currency-symbol">₹</span>
                                                                <input
                                                                    type="number"
                                                                    className="us-amount-input"
                                                                    value={userCfg.limit || 0}
                                                                    onChange={e => handleLimitChange(uid, e.target.value)}
                                                                    min={0}
                                                                    step={1000}
                                                                />
                                                            </div>

                                                            {/* Quick Presets */}
                                                            <div className="us-presets-wrap">
                                                                {PRESETS.map(p => (
                                                                    <button
                                                                        key={p.label}
                                                                        type="button"
                                                                        className={`us-preset-tag ${userCfg.limit === p.value ? "us-preset-tag--active" : ""}`}
                                                                        onClick={() => handleApplyPreset(uid, p.value)}
                                                                    >
                                                                        ₹{p.label}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            {/* Slider */}
                                                            <input
                                                                type="range"
                                                                className="us-range-slider"
                                                                min={1000}
                                                                max={500000}
                                                                step={5000}
                                                                value={userCfg.limit || 15000}
                                                                onChange={e => handleLimitChange(uid, e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Active Scope */}
                                                <td data-label="Active Scope" className="us-td us-td--scope">
                                                    <span className="us-status-pill us-status-pill--limited">
                                                        E-Approval Workflow
                                                    </span>
                                                </td>

                                                {/* Explanation Rule */}
                                                <td data-label="Effective Rule" className="us-td us-td--rule">
                                                    {isUnl ? (
                                                        <span className="us-rule-badge us-rule-badge--unlimited">
                                                            <Check size={14} />
                                                            Full access to all Purchase Orders
                                                        </span>
                                                    ) : (
                                                        <span className="us-rule-badge us-rule-badge--limited">
                                                            Display POs with Total Amount ≤ <strong>₹ {fmtINR(userCfg.limit)}</strong>{" "}
                                                            <span className="us-rule-words">({numberToWordsINR(userCfg.limit)})</span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 2: T & M APPROVALS (TECHNICAL / MAINTENANCE)           */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === "technical" && (
                <div className="us-panel">
                    <div className="us-panel-card">
                        <h3 className="us-panel-card__title">
                            <Wrench size={20} style={{ color: "#6366f1" }} />
                            Technical & Material Approval Limits
                        </h3>
                        <p className="us-panel-card__desc">
                            Configure authorization thresholds for T-Approval (Technical POs) and M-Approval (Maintenance & Capital Expenses).
                        </p>

                        <div className="us-settings-list">
                            <div className="us-setting-row">
                                <div className="us-setting-info">
                                    <h4>T-Approval Technical Threshold</h4>
                                    <p>Require Chief Engineer sign-off when technical scope modifications exceed this value</p>
                                </div>
                                <div className="us-input-group">
                                    <span className="us-currency-symbol">₹</span>
                                    <input type="number" className="us-amount-input" defaultValue={50000} />
                                </div>
                            </div>

                            <div className="us-setting-row">
                                <div className="us-setting-info">
                                    <h4>M-Approval Emergency Maintenance Cap</h4>
                                    <p>Maximum direct approval limit without Plant Head escalation</p>
                                </div>
                                <div className="us-input-group">
                                    <span className="us-currency-symbol">₹</span>
                                    <input type="number" className="us-amount-input" defaultValue={25000} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modern Bulk Limit Setting Modal (Portalled to body to prevent clipping) ── */}
            {bulkModalOpen && createPortal(
                <div className="us-modal-overlay" onClick={() => setBulkModalOpen(false)}>
                    <div className="us-modal" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="us-modal__hd">
                            <div className="us-modal__title-wrap">
                                <div className="us-modal__icon-badge">
                                    <SlidersHorizontal size={22} />
                                </div>
                                <div>
                                    <h3 className="us-modal__title">Bulk Set PO Approval Limit</h3>
                                    <p className="us-modal__subtitle">Configure uniform maximum purchase order threshold across user accounts</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="us-modal__close"
                                onClick={() => setBulkModalOpen(false)}
                                aria-label="Close modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="us-modal__body">

                            {/* Section 1: Hero Amount Input */}
                            <div>
                                <div className="us-modal__section-label">
                                    <TrendingUp size={13} style={{ color: "#6366f1" }} />
                                    01. Target PO Threshold
                                </div>

                                <div className="us-modal__hero-box">
                                    <div className="us-modal__input-row">
                                        <span className="us-modal__currency-icon">₹</span>
                                        <input
                                            type="number"
                                            className="us-modal__amount-input"
                                            value={bulkLimit}
                                            onChange={e => setBulkLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                            step={1000}
                                        />
                                        <div className="us-modal__stepper-wrap">
                                            <button
                                                type="button"
                                                className="us-modal__step-btn"
                                                onClick={() => setBulkLimit(prev => Math.max(0, prev - 5000))}
                                            >
                                                -5K
                                            </button>
                                            <button
                                                type="button"
                                                className="us-modal__step-btn"
                                                onClick={() => setBulkLimit(prev => prev + 5000)}
                                            >
                                                +5K
                                            </button>
                                        </div>
                                    </div>

                                    <div className="us-modal__words-row">
                                        <div className="us-modal__words-pill">
                                            <Sparkles size={13} />
                                            <span>{numberToWordsINR(bulkLimit)}</span>
                                        </div>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="us-presets-wrap">
                                        {PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                className={`us-preset-tag ${bulkLimit === p.value ? "us-preset-tag--active" : ""}`}
                                                onClick={() => setBulkLimit(p.value)}
                                            >
                                                ₹{p.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Range Slider */}
                                    <input
                                        type="range"
                                        className="us-range-slider us-modal__range-slider"
                                        min={1000}
                                        max={500000}
                                        step={5000}
                                        value={bulkLimit}
                                        onChange={e => setBulkLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Target Audience Radio Cards */}
                            <div>
                                <div className="us-modal__section-label">
                                    <Users size={13} style={{ color: "#6366f1" }} />
                                    02. Select Target Audience
                                </div>

                                <div className="us-radio-cards">
                                    {/* Card A: All Users */}
                                    <div
                                        className={`us-radio-card ${bulkApplyTo === "all" ? "us-radio-card--selected" : ""}`}
                                        onClick={() => setBulkApplyTo("all")}
                                    >
                                        <div className="us-radio-card__top">
                                            <div className="us-radio-card__icon-box us-radio-card__icon-box--blue">
                                                <Users size={18} />
                                            </div>
                                            <div className="us-radio-card__check">
                                                {bulkApplyTo === "all" && <Check size={13} />}
                                            </div>
                                        </div>
                                        <div className="us-radio-card__title">All ERP Accounts</div>
                                        <div className="us-radio-card__desc">Enforces the ₹{fmtINR(bulkLimit)} limit across every user including administrators.</div>
                                    </div>

                                    {/* Card B: Standard Users */}
                                    <div
                                        className={`us-radio-card ${bulkApplyTo === "non-admin" ? "us-radio-card--selected" : ""}`}
                                        onClick={() => setBulkApplyTo("non-admin")}
                                    >
                                        <div className="us-radio-card__top">
                                            <div className="us-radio-card__icon-box us-radio-card__icon-box--emerald">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <div className="us-radio-card__check">
                                                {bulkApplyTo === "non-admin" && <Check size={13} />}
                                            </div>
                                        </div>
                                        <div className="us-radio-card__title">
                                            Standard Users
                                            <span className="us-radio-card__rec-tag">Recommended</span>
                                        </div>
                                        <div className="us-radio-card__desc">Restricts standard approvers while retaining unlimited access for Superadmins.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="us-modal__footer">
                            <div className="us-modal__footer-left">
                                <Info size={14} style={{ color: "#6366f1" }} />
                                Overwrites current limits for selected users
                            </div>
                            <div className="us-modal__footer-right">
                                <button
                                    type="button"
                                    className="us-btn us-btn--ghost"
                                    onClick={() => setBulkModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="us-btn us-btn--primary"
                                    onClick={handleApplyBulk}
                                >
                                    Apply Limit (₹ {fmtINR(bulkLimit)}) →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
