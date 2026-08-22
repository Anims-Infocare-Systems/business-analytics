import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { MdVisibility as MdEye, MdVisibilityOff as MdEyeOff, MdLockReset, MdArrowBack, MdCheckCircle, MdShield, MdAccessTime, MdPeople, MdPersonAdd, MdDelete, MdPerson } from "react-icons/md";
import { resolveApiBase } from "../../apiBase";
import { adminFetch, setAdminToken } from "../../adminAuth";
import "./adminpannel.css";
import AnimsUtility from "./AnimsUtility";
import UserTransactionReport from "./UserTransactionReport";


const API = resolveApiBase();
const ADMIN_AUTH_CODE = "admin_auth_required";

function getSeriesPlanName(companyCode, dbPlanName) {
    const code = String(companyCode || "").trim().toUpperCase();
    if (code.startsWith("T")) return "Testing Details (T)";
    if (code.startsWith("D")) return "Demo Details (D)";
    if (code.startsWith("P")) return "Programming Details (P)";
    return dbPlanName || "Free";
}

function CustomSingleDatePicker({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const parsedDate = value ? new Date(value) : null;
    const initialViewDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();
    
    const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
    const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());

    const getFormattedDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplay = (val) => {
        if (!val) return "Select End Date";
        const parts = val.split("-");
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
        }
        return val;
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const d = value ? new Date(value) : new Date();
            if (!isNaN(d.getTime())) {
                setViewMonth(d.getMonth());
                setViewYear(d.getFullYear());
            }
        }
    }, [isOpen, value]);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleDayClick = (dayNum) => {
        const selected = new Date(viewYear, viewMonth, dayNum);
        onChange(getFormattedDate(selected));
        setIsOpen(false);
    };

    const calendarCells = [];
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        calendarCells.push({
            dayNum: prevMonthDays - i,
            isCurrentMonth: false,
            key: `prev-${prevMonthDays - i}`
        });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarCells.push({
            dayNum: i,
            isCurrentMonth: true,
            key: `curr-${i}`
        });
    }
    const totalCells = 42;
    const nextMonthPadding = totalCells - calendarCells.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
        calendarCells.push({
            dayNum: i,
            isCurrentMonth: false,
            key: `next-${i}`
        });
    }

    return (
        <div className="ap-custom-datepicker-container" ref={containerRef}>
            <button 
                type="button"
                className={`ap-custom-datepicker-trigger ${isOpen ? "ap-custom-datepicker-trigger--open" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="ap-datepicker-trigger-text">{formatDisplay(value)}</span>
                <span className="ap-datepicker-trigger-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="ap-custom-datepicker-dropdown">
                    <div className="ap-datepicker-header">
                        <button type="button" className="ap-datepicker-nav-btn" onClick={handlePrevMonth}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className="ap-datepicker-month-year">
                            {monthNames[viewMonth]} {viewYear}
                        </span>
                        <button type="button" className="ap-datepicker-nav-btn" onClick={handleNextMonth}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>

                    <div className="ap-datepicker-weekdays">
                        {dayNames.map(day => (
                            <span key={day} className="ap-datepicker-weekday">{day}</span>
                        ))}
                    </div>

                    <div className="ap-datepicker-grid">
                        {calendarCells.map(cell => {
                            if (!cell.isCurrentMonth) {
                                return (
                                    <span key={cell.key} className="ap-datepicker-day ap-datepicker-day--disabled">
                                        {cell.dayNum}
                                    </span>
                                );
                            }

                            const cellDateObj = new Date(viewYear, viewMonth, cell.dayNum);
                            const cellStr = getFormattedDate(cellDateObj);
                            const isSelected = value === cellStr;

                            return (
                                <button
                                    type="button"
                                    key={cell.key}
                                    className={`ap-datepicker-day ${isSelected ? "ap-datepicker-day--selected" : ""}`}
                                    onClick={() => handleDayClick(cell.dayNum)}
                                >
                                    <span>{cell.dayNum}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomDropdown({ value, onChange, options, placeholder, isWide }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || { label: placeholder || "Select...", value };
    const isActive = value !== "all";

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleSelectOption = (optValue) => {
        onChange({ target: { value: optValue } });
        setIsOpen(false);
    };

    return (
        <div className={`ap-custom-select-container ${isWide ? "ap-custom-select-container--wide" : ""}`} ref={dropdownRef}>
            <button 
                type="button"
                className={`ap-custom-select-trigger ${isOpen ? "ap-custom-select-trigger--open" : ""} ${isActive ? "ap-custom-select-trigger--active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="ap-custom-select-val-wrap">
                    <span className="ap-custom-select-text">{selectedOption.label}</span>
                    {selectedOption.count !== undefined && (
                        <span className="ap-custom-select-count">{selectedOption.count}</span>
                    )}
                </div>
                <span className="ap-custom-select-arrow">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="ap-custom-select-dropdown">
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <button
                                type="button"
                                key={opt.value}
                                className={`ap-custom-select-option ${isSelected ? "ap-custom-select-option--selected" : ""}`}
                                onClick={() => handleSelectOption(opt.value)}
                            >
                                <span className="ap-custom-select-option-text">{opt.label}</span>
                                {opt.count !== undefined ? (
                                    <span className="ap-custom-select-option-badge">{opt.count}</span>
                                ) : isSelected ? (
                                    <span className="ap-custom-select-option-check">✓</span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const IconToastSuccess = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
            d="M10 1.667 3.333 4.167v5c0 3.5 2.917 6.775 6.667 7.5 3.75-.725 6.667-4 6.667-7.5v-5L10 1.667Z"
            stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"
        />
        <path d="M7.5 10 9.167 11.667 12.5 8.333" stroke="currentColor" strokeWidth="1.35"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconToastError = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.35" />
        <path d="M10 6.25v4.5M10 13.75h.008" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" />
    </svg>
);

function AdminToastContent({ variant, title, message }) {
    return (
        <div className={`ap-toast ap-toast--${variant}`}>
            <span className="ap-toast__accent" aria-hidden="true" />
            <span className={`ap-toast__icon-wrap ap-toast__icon-wrap--${variant}`}>
                {variant === "success" ? <IconToastSuccess /> : <IconToastError />}
            </span>
            <div className="ap-toast__content">
                <p className="ap-toast__title">{title}</p>
                <p className="ap-toast__message">{message}</p>
            </div>
        </div>
    );
}

const ADMIN_TOAST_OPTS = {
    position: "top-right",
    autoClose: 4500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    icon: false,
    className: "ap-toast-item",
    bodyClassName: "ap-toast-body",
    progressClassName: "ap-toast-progress",
};

function showAdminToast(variant, title, message) {
    toast(
        <AdminToastContent variant={variant} title={title} message={message} />,
        {
            ...ADMIN_TOAST_OPTS,
            toastId: `admin-${variant}-${title}-${message}`.slice(0, 120),
            className: `ap-toast-item ap-toast-item--${variant}`,
            closeButton: ({ closeToast }) => (
                <button
                    type="button"
                    className="ap-toast__close"
                    onClick={closeToast}
                    aria-label="Dismiss notification"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3.5 3.5 10.5 10.5M10.5 3.5 3.5 10.5" stroke="currentColor"
                            strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                </button>
            ),
        },
    );
}

const formatDate = (val) => {
    if (!val) return "—";
    const parts = val.split(" ")[0].split("-");
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
};

export default function AdminPanel() {
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem("ap_active_tab") || "admin_pannel";
    });
    const [authLoading, setAuthLoading] = useState(true);
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);
    const [currentAdminUser, setCurrentAdminUser] = useState(() => localStorage.getItem("ap_admin_user") || "");

    // Tenants State
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [seriesFilter, setSeriesFilter] = useState("all");

    // Modal / Form States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTenant, setEditTenant] = useState(null);
    const [formBusy, setFormBusy] = useState(false);
    const [formError, setFormError] = useState("");

    // Form inputs (shared for create/edit)
    const [compCode, setCompCode] = useState("");
    const [compName, setCompName] = useState("");
    const [busName, setBusName] = useState("");
    const [persName, setPersName] = useState("");
    const [emailId, setEmailId] = useState("");
    const [phoneNo, setPhoneNo] = useState("");
    const [gstNo, setGstNo] = useState("");
    const [empCount, setEmpCount] = useState("");
    const [usersCount, setUsersCount] = useState(5);
    const [planId, setPlanId] = useState("free");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [modulesState, setModulesState] = useState({
        dashboard: true,
        approvals: true,
        charts: true,
        reports: true,
        mis: true,
        utility: true,
    });
    
    // DB credentials
    const [erpServer, setErpServer] = useState("");
    const [erpDatabase, setErpDatabase] = useState("");
    const [erpUser, setErpUser] = useState("");
    const [erpPassword, setErpPassword] = useState("");
    const [erpPort, setErpPort] = useState(1433);

    // Admin Credentials (for creation only)
    const [adminUser, setAdminUser] = useState("admin");
    const [adminPass, setAdminPass] = useState("12345678");

    // Drawer State (Tenant Users)
    const [showUserDrawer, setShowUserDrawer] = useState(false);
    const [drawerCompany, setDrawerCompany] = useState(null);
    const [drawerUsers, setDrawerUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showPasswordMap, setShowPasswordMap] = useState({}); // { [userId]: boolean }
    const [togglingIds, setTogglingIds] = useState(() => new Set());

    // Delete Confirmation Modal State
    const [deleteConfirm, setDeleteConfirm] = useState({
        show: false,
        type: "", // "tenant" or "user"
        target: null,
        title: "",
        message: "",
        confirmBtnText: "Delete"
    });

    // Login & Forgot Password States
    const [showLoginPass, setShowLoginPass] = useState(false);
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
    const [forgotUsername, setForgotUsername] = useState("");
    const [forgotNewPass, setForgotNewPass] = useState("");
    const [forgotConfirmPass, setForgotConfirmPass] = useState("");
    const [showForgotPass, setShowForgotPass] = useState(false);
    const [forgotBusy, setForgotBusy] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");

    // 60-Day Security Rotation States
    const [securityInfo, setSecurityInfo] = useState(null);
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [changeNewPass, setChangeNewPass] = useState("");
    const [changeConfirmPass, setChangeConfirmPass] = useState("");
    const [changePassBusy, setChangePassBusy] = useState(false);
    const [changePassError, setChangePassError] = useState("");
    const [showChangePassEye, setShowChangePassEye] = useState(false);

    // Master Admin Controller Users State (Settings)
    const [adminCredentials, setAdminCredentials] = useState([]);
    const [loadingCredentials, setLoadingCredentials] = useState(false);
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdminUser, setNewAdminUser] = useState("");
    const [newAdminPass, setNewAdminPass] = useState("");
    const [newAdminConfirmPass, setNewAdminConfirmPass] = useState("");
    const [showNewAdminPassEye, setShowNewAdminPassEye] = useState(false);
    const [addAdminBusy, setAddAdminBusy] = useState(false);
    const [addAdminError, setAddAdminError] = useState("");

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    // Persist active tab across refreshes
    useEffect(() => {
        localStorage.setItem("ap_active_tab", activeTab);
    }, [activeTab]);

    // Ensure non-admin users cannot stay on settings_users tab
    useEffect(() => {
        if (String(currentAdminUser || "").trim().toLowerCase() !== "admin" && activeTab === "settings_users") {
            setActiveTab("admin_pannel");
            localStorage.removeItem("ap_active_tab");
        }
    }, [activeTab, currentAdminUser]);

    const handleAdminSessionLost = (message) => {
        const msg = message || "Admin session expired. Please sign in again.";
        setAdminToken("");
        setIsAuthenticated(false);
        setTenants([]);
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowUserDrawer(false);
        setDeleteConfirm((prev) => ({ ...prev, show: false }));
        setLoginUsername("");
        setLoginPassword("");
        setForgotUsername("");
        setForgotNewPass("");
        setForgotConfirmPass("");
        setIsForgotPasswordMode(false);
        setShowLoginPass(false);
        setShowForgotPass(false);
        setCurrentAdminUser("");
        localStorage.removeItem("ap_admin_user");
        setActiveTab("admin_pannel");
        localStorage.removeItem("ap_active_tab");
        setLoginError(msg);
        showAdminToast("error", "Session Expired", msg);
    };

    const isAdminAuthFailure = (res, data) =>
        (res.status === 403 && data?.code === ADMIN_AUTH_CODE) ||
        (res.status === 401 &&
            typeof data?.error === "string" &&
            data.error.toLowerCase().includes("admin"));

    const checkSession = async () => {
        try {
            const res = await adminFetch(`${API}/admin/check-session/`);
            const data = await res.json();
            if (data.authenticated) {
                if (data.admin_token) setAdminToken(data.admin_token);
                setIsAuthenticated(true);
                if (data.username) {
                    const user = data.username;
                    setCurrentAdminUser(user);
                    localStorage.setItem("ap_admin_user", user);
                    if (user.toLowerCase() !== "admin" && activeTab === "settings_users") {
                        setActiveTab("admin_pannel");
                        localStorage.removeItem("ap_active_tab");
                    }
                }
                fetchTenants();
            }
        } catch {
            /* session check fail */
        } finally {
            setAuthLoading(false);
        }
    };

    const fetchTenants = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoadingTenants(true);
            setErrorMsg("");
        }
        try {
            const res = await adminFetch(`${API}/admin/tenants/`);
            const data = await res.json();
            if (res.ok) {
                setTenants(data.tenants || []);
            } else if (isAdminAuthFailure(res, data)) {
                handleAdminSessionLost(data.error);
            } else if (!silent) {
                const msg = data.error || "Failed to load tenants.";
                setErrorMsg(msg);
                showAdminToast("error", "Load Failed", msg);
            }
        } catch {
            if (!silent) {
                const msg = "Network error. Could not connect to API.";
                setErrorMsg(msg);
                showAdminToast("error", "Network Error", msg);
            }
        } finally {
            if (!silent) setLoadingTenants(false);
        }
    }, []);

    const fetchAdminCredentials = useCallback(async () => {
        setLoadingCredentials(true);
        try {
            const res = await adminFetch(`${API}/admin/credentials/`);
            const data = await res.json();
            if (res.ok && data.success) {
                setAdminCredentials(data.admins || []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoadingCredentials(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && activeTab === "settings_users") {
            fetchAdminCredentials();
        }
    }, [isAuthenticated, activeTab, fetchAdminCredentials]);

    // Authenticate Admin
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        if (!loginUsername || !loginPassword) {
            const msg = "Please enter username and password.";
            setLoginError(msg);
            showAdminToast("error", "Missing Credentials", msg);
            return;
        }
        setLoginBusy(true);
        try {
            const res = await fetch(`${API}/admin/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (data.admin_token) setAdminToken(data.admin_token);
                setIsAuthenticated(true);
                const user = data.username || loginUsername || "";
                setCurrentAdminUser(user);
                localStorage.setItem("ap_admin_user", user);
                setActiveTab("admin_pannel");
                if (user.toLowerCase() !== "admin") {
                    localStorage.removeItem("ap_active_tab");
                }
                setLoginUsername("");
                setLoginPassword("");
                if (data.security_info) {
                    setSecurityInfo(data.security_info);
                    if (data.security_info.recommend_change) {
                        setShowSecurityModal(true);
                    }
                }
                fetchTenants();
                showAdminToast("success", "Welcome Admin", "Signed in successfully.");
            } else {
                const msg = data.error || "Invalid credentials.";
                setLoginError(msg);
                showAdminToast("error", "Login Failed", msg);
            }
        } catch {
            const msg = "Network error.";
            setLoginError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setLoginBusy(false);
        }
    };

    // Forgot Password Submit
    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");

        if (!forgotUsername || !forgotNewPass || !forgotConfirmPass) {
            const msg = "Please enter username, new password, and confirm password.";
            setForgotError(msg);
            showAdminToast("error", "Missing Fields", msg);
            return;
        }

        if (forgotNewPass !== forgotConfirmPass) {
            const msg = "New password and Confirm password do not match.";
            setForgotError(msg);
            showAdminToast("error", "Mismatch Error", msg);
            return;
        }

        if (forgotNewPass.length < 6) {
            const msg = "Password must be at least 6 characters long.";
            setForgotError(msg);
            showAdminToast("error", "Validation Error", msg);
            return;
        }

        setForgotBusy(true);
        try {
            const res = await fetch(`${API}/admin/forgot-password/reset/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: forgotUsername,
                    new_password: forgotNewPass,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setForgotSuccess(data.message || "Password reset successfully!");
                showAdminToast("success", "Password Reset", "Master admin password updated. You can now sign in.");
                setLoginUsername(forgotUsername);
                setLoginPassword("");
                setTimeout(() => {
                    setIsForgotPasswordMode(false);
                    setForgotNewPass("");
                    setForgotConfirmPass("");
                    setForgotSuccess("");
                }, 1200);
            } else {
                const msg = data.error || "Failed to reset password.";
                setForgotError(msg);
                showAdminToast("error", "Reset Failed", msg);
            }
        } catch {
            const msg = "Network error. Please try again.";
            setForgotError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setForgotBusy(false);
        }
    };

    // Change Master Admin Password Submit
    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setChangePassError("");

        if (!changeNewPass || !changeConfirmPass) {
            setChangePassError("Please enter new password and confirm password.");
            return;
        }
        if (changeNewPass !== changeConfirmPass) {
            setChangePassError("New password and Confirm password do not match.");
            return;
        }
        if (changeNewPass.length < 6) {
            setChangePassError("Password must be at least 6 characters long.");
            return;
        }

        setChangePassBusy(true);
        try {
            const res = await adminFetch(`${API}/admin/change-password/`, {
                method: "POST",
                body: JSON.stringify({
                    username: securityInfo?.username || "admin",
                    new_password: changeNewPass
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showAdminToast("success", "Password Rotation Complete", "Master admin password updated successfully.");
                setShowChangePasswordModal(false);
                setShowSecurityModal(false);
                setChangeNewPass("");
                setChangeConfirmPass("");
                setSecurityInfo(prev => ({
                    ...prev,
                    password_age_days: 0,
                    days_remaining: 60,
                    recommend_change: false,
                    last_changed_date: new Date().toLocaleDateString("en-GB")
                }));
            } else {
                const msg = data.error || "Failed to update password.";
                setChangePassError(msg);
                showAdminToast("error", "Update Failed", msg);
            }
        } catch {
            const msg = "Network error. Please try again.";
            setChangePassError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setChangePassBusy(false);
        }
    };

    // Add Master Admin User Submit (Settings)
    const handleAddAdminSubmit = async (e) => {
        e.preventDefault();
        setAddAdminError("");

        if (!newAdminUser || !newAdminPass || !newAdminConfirmPass) {
            setAddAdminError("Please fill in all fields.");
            return;
        }
        if (newAdminPass !== newAdminConfirmPass) {
            setAddAdminError("Passwords do not match.");
            return;
        }
        if (newAdminPass.length < 6) {
            setAddAdminError("Password must be at least 6 characters long.");
            return;
        }

        setAddAdminBusy(true);
        try {
            const res = await adminFetch(`${API}/admin/credentials/create/`, {
                method: "POST",
                body: JSON.stringify({ username: newAdminUser, password: newAdminPass })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showAdminToast("success", "User Created", `Master admin user '${newAdminUser}' created successfully.`);
                setShowAddAdminModal(false);
                setNewAdminUser("");
                setNewAdminPass("");
                setNewAdminConfirmPass("");
                fetchAdminCredentials();
            } else {
                const msg = data.error || "Failed to create admin user.";
                setAddAdminError(msg);
                showAdminToast("error", "Creation Failed", msg);
            }
        } catch {
            const msg = "Network error. Please try again.";
            setAddAdminError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setAddAdminBusy(false);
        }
    };

    const handleDeleteAdminUser = (admin) => {
        setDeleteConfirm({
            show: true,
            type: "admin_user",
            target: admin,
            title: "Delete Master Admin User",
            message: `Are you sure you want to delete master admin user '${admin.username}'?`,
            confirmBtnText: "Delete Admin User"
        });
    };

    // Logout Admin
    const handleLogout = async () => {
        try {
            await adminFetch(`${API}/admin/logout/`, { method: "POST" });
        } catch {
            /* ignore */
        }
        setAdminToken("");
        setIsAuthenticated(false);
        setTenants([]);
        setLoginUsername("");
        setLoginPassword("");
        setLoginError("");
        setForgotUsername("");
        setForgotNewPass("");
        setForgotConfirmPass("");
        setForgotError("");
        setForgotSuccess("");
        setIsForgotPasswordMode(false);
        setShowLoginPass(false);
        setShowForgotPass(false);
        setCurrentAdminUser("");
        localStorage.removeItem("ap_admin_user");
        setActiveTab("admin_pannel");
        localStorage.removeItem("ap_active_tab");
        showAdminToast("success", "Logged Out", "You have signed out of Admin Panel.");
    };

    // Toggle Active Status of Tenant
    const handleToggleStatus = async (tenant, currentVal) => {
        const tid = tenant.tenant_id;
        const newVal = currentVal ? 0 : 1;

        setTenants((prev) =>
            prev.map((t) =>
                t.tenant_id === tid
                    ? { ...t, active_status: newVal, tenant_status: newVal }
                    : t,
            ),
        );
        setTogglingIds((prev) => new Set(prev).add(tid));

        try {
            const res = await adminFetch(`${API}/admin/tenants/${tid}/status/`, {
                method: "PATCH",
                body: JSON.stringify({ active_status: newVal }),
            });
            if (!res.ok) {
                const data = await res.json();
                setTenants((prev) =>
                    prev.map((t) =>
                        t.tenant_id === tid
                            ? { ...t, active_status: currentVal, tenant_status: currentVal }
                            : t,
                    ),
                );
                if (isAdminAuthFailure(res, data)) {
                    handleAdminSessionLost(data.error);
                } else {
                    const msg = data.error || "Failed to update tenant status.";
                    showAdminToast("error", "Update Failed", msg);
                }
            } else {
                showAdminToast(
                    "success",
                    "Status Updated",
                    `${tenant.company_name} is now ${newVal ? "active" : "inactive"}.`,
                );
            }
        } catch {
            setTenants((prev) =>
                prev.map((t) =>
                    t.tenant_id === tid
                        ? { ...t, active_status: currentVal, tenant_status: currentVal }
                        : t,
                ),
            );
            showAdminToast("error", "Network Error", "Could not update tenant status.");
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(tid);
                return next;
            });
        }
    };

    // Open Modal for Create Tenant
    const openCreateModal = () => {
        setFormError("");
        setCompCode("");
        setCompName("");
        setBusName("");
        setPersName("");
        setEmailId("");
        setPhoneNo("");
        setGstNo("");
        setEmpCount("");
        setUsersCount(5);
        setPlanId("free");
        setStartDate(new Date().toISOString().split("T")[0]);
        setEndDate("");
        setCity("");
        setState("");
        setModulesState({
            dashboard: true,
            approvals: true,
            charts: true,
            reports: true,
            mis: true,
            utility: true,
        });
        setErpServer("");
        setErpDatabase("");
        setErpUser("");
        setErpPassword("");
        setErpPort(1433);
        setAdminUser("admin");
        setAdminPass("12345678");
        setShowCreateModal(true);
    };

    // Open Modal for Edit Tenant
    const openEditModal = (t) => {
        setFormError("");
        setEditTenant(t);
        setCompCode(t.company_code);
        setCompName(t.company_name);
        setBusName(t.business_name);
        setPersName(t.business_person_name);
        setEmailId(t.email_id);
        setPhoneNo(t.phone_number);
        setGstNo(t.gst_number || "");
        setEmpCount(t.no_of_employees || "");
        setUsersCount(t.no_of_users || 5);
        setPlanId(t.plan_id || "free");
        setStartDate(t.signup_date || t.start_date || "");
        setEndDate(t.end_date || "");
        setCity(t.city || "");
        setState(t.state || "");
        setModulesState(t.modules ? { ...t.modules } : {
            dashboard: true,
            approvals: true,
            charts: true,
            reports: true,
            mis: true,
            utility: true,
        });
        setErpServer(t.erp_server || "");
        setErpDatabase(t.erp_database || "");
        setErpUser(t.erp_user || "");
        setErpPassword(t.erp_password || "");
        setErpPort(t.erp_port || 1433);
        setShowEditModal(true);
    };

    // Form submits
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        if (!compCode || !compName) {
            const msg = "Company Code and Company Name are required.";
            setFormError(msg);
            showAdminToast("error", "Validation Error", msg);
            return;
        }
        setFormBusy(true);
        try {
            const plan_name = planId === "free" ? "Free Plan" : planId === "pro" ? "Pro Plan" : "Max Plan";
            const res = await adminFetch(`${API}/admin/tenants/create/`, {
                method: "POST",
                body: JSON.stringify({
                    company_code: compCode,
                    company_name: compName,
                    business_name: busName,
                    business_person_name: persName,
                    email_id: emailId,
                    phone_number: phoneNo,
                    no_of_employees: empCount,
                    no_of_users: usersCount,
                    plan_id: planId,
                    plan_name: plan_name,
                    signup_date: startDate,
                    end_date: endDate,
                    city: city,
                    state: state,
                    modules: modulesState,
                    erp_server: erpServer,
                    erp_database: erpDatabase,
                    erp_user: erpUser,
                    erp_password: erpPassword,
                    erp_port: erpPort,
                    admin_username: adminUser,
                    admin_password: adminPass
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setShowCreateModal(false);
                fetchTenants({ silent: true });
                showAdminToast("success", "Organization Created", `${compName} has been added successfully.`);
            } else if (isAdminAuthFailure(res, data)) {
                handleAdminSessionLost(data.error);
            } else {
                const msg = data.error || "Failed to create tenant.";
                setFormError(msg);
                showAdminToast("error", "Create Failed", msg);
            }
        } catch {
            const msg = "Network error.";
            setFormError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setFormBusy(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormBusy(true);
        try {
            const plan_name = planId === "free" ? "Free Plan" : planId === "pro" ? "Pro Plan" : "Max Plan";
            const res = await adminFetch(`${API}/admin/tenants/update/`, {
                method: "PUT",
                body: JSON.stringify({
                    tenant_id: editTenant.tenant_id,
                    company_code: compCode,
                    company_name: compName,
                    business_name: busName,
                    business_person_name: persName,
                    email_id: emailId,
                    phone_number: phoneNo,
                    gst_number: gstNo,
                    no_of_employees: empCount,
                    no_of_users: usersCount,
                    plan_id: planId,
                    plan_name: plan_name,
                    signup_date: startDate,
                    end_date: endDate,
                    active_status: editTenant.active_status,
                    city: city,
                    state: state,
                    modules: modulesState,
                    erp_server: erpServer,
                    erp_database: erpDatabase,
                    erp_user: erpUser,
                    erp_password: erpPassword,
                    erp_port: erpPort
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setShowEditModal(false);
                fetchTenants({ silent: true });
                showAdminToast("success", "Organization Updated", `${compName} settings were saved.`);
            } else if (isAdminAuthFailure(res, data)) {
                handleAdminSessionLost(data.error);
            } else {
                const msg = data.error || "Failed to update tenant details.";
                setFormError(msg);
                showAdminToast("error", "Update Failed", msg);
            }
        } catch {
            const msg = "Network error.";
            setFormError(msg);
            showAdminToast("error", "Network Error", msg);
        } finally {
            setFormBusy(false);
        }
    };

    // Delete Tenant
    const handleDeleteTenant = (tenant) => {
        setDeleteConfirm({
            show: true,
            type: "tenant",
            target: tenant,
            title: "Delete Tenant Organization",
            message: `Are you sure you want to hard delete the organization "${tenant.company_name}"? This deletes all associated signups, database credentials, and user rights forever!`,
            confirmBtnText: "Delete Organization"
        });
    };

    // User Management Side Drawer
    const openUserDrawer = async (tenant) => {
        setDrawerCompany(tenant);
        setDrawerUsers([]);
        setShowPasswordMap({}); // reset password toggles
        setShowUserDrawer(true);
        setLoadingUsers(true);
        try {
            const res = await adminFetch(`${API}/admin/tenants/${tenant.company_code}/users/`);
            const data = await res.json();
            if (res.ok) {
                setDrawerUsers(data.users || []);
            } else if (isAdminAuthFailure(res, data)) {
                handleAdminSessionLost(data.error);
            } else {
                showAdminToast("error", "Load Failed", data.error || "Could not load tenant users.");
            }
        } catch {
            showAdminToast("error", "Network Error", "Could not load tenant users.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswordMap(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleDeleteUser = (user) => {
        setDeleteConfirm({
            show: true,
            type: "user",
            target: user,
            title: "Delete Tenant User",
            message: `Are you sure you want to delete user "${user.username}"?`,
            confirmBtnText: "Delete User"
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm.target) return;
        setFormBusy(true);
        try {
            if (deleteConfirm.type === "tenant") {
                const tenant = deleteConfirm.target;
                const res = await adminFetch(`${API}/admin/tenants/delete/${tenant.tenant_id}/`, {
                    method: "DELETE",
                });
                if (res.ok) {
                    setTenants((prev) => prev.filter((t) => t.tenant_id !== tenant.tenant_id));
                    setDeleteConfirm((prev) => ({ ...prev, show: false }));
                    showAdminToast("success", "Organization Deleted", `"${tenant.company_name}" was permanently removed.`);
                } else {
                    const data = await res.json();
                    if (isAdminAuthFailure(res, data)) {
                        handleAdminSessionLost(data.error);
                    } else {
                        showAdminToast("error", "Delete Failed", data.error || "Failed to delete tenant.");
                    }
                }
            } else if (deleteConfirm.type === "user") {
                const user = deleteConfirm.target;
                const res = await adminFetch(`${API}/admin/tenants/users/${user.id}/`, {
                    method: "DELETE",
                });
                if (res.ok) {
                    setDrawerUsers((prev) => prev.filter((u) => u.id !== user.id));
                    setDeleteConfirm((prev) => ({ ...prev, show: false }));
                    showAdminToast("success", "User Deleted", `"${user.username}" was removed.`);
                } else {
                    const data = await res.json();
                    if (isAdminAuthFailure(res, data)) {
                        handleAdminSessionLost(data.error);
                    } else {
                        showAdminToast("error", "Delete Failed", data.error || "Failed to delete user.");
                    }
                }
            } else if (deleteConfirm.type === "admin_user") {
                const admin = deleteConfirm.target;
                const res = await adminFetch(`${API}/admin/credentials/delete/${admin.id}/`, {
                    method: "DELETE",
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showAdminToast("success", "User Deleted", data.message);
                    setDeleteConfirm((prev) => ({ ...prev, show: false }));
                    fetchAdminCredentials();
                } else {
                    if (isAdminAuthFailure(res, data)) {
                        handleAdminSessionLost(data.error);
                    } else {
                        showAdminToast("error", "Delete Failed", data.error || "Failed to delete user.");
                    }
                }
            }
        } catch {
            showAdminToast("error", "Network Error", "Delete request failed.");
        } finally {
            setFormBusy(false);
        }
    };

    const filteredTenants = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return tenants
            .filter((t) => {
                const matchesQuery = !query ||
                    t.company_name.toLowerCase().includes(query) ||
                    t.company_code.toLowerCase().includes(query) ||
                    t.business_person_name.toLowerCase().includes(query) ||
                    t.email_id.toLowerCase().includes(query);

                const matchesStatus = statusFilter === "all" ||
                    (statusFilter === "active" && t.active_status) ||
                    (statusFilter === "inactive" && !t.active_status);

                const matchesPlan = planFilter === "all" ||
                    t.plan_id === planFilter ||
                    (planFilter === "max" && t.plan_id === "enterprise") ||
                    (planFilter === "free" && !t.plan_id);

                const codeUpper = (t.company_code || "").trim().toUpperCase();
                const matchesSeries = seriesFilter === "all" || codeUpper.startsWith(seriesFilter);

                return matchesQuery && matchesStatus && matchesPlan && matchesSeries;
            })
            .sort((a, b) => {
                const codeA = (a.company_code || "").trim().toUpperCase();
                const codeB = (b.company_code || "").trim().toUpperCase();
                const getSeriesRank = (code) => {
                    if (code.startsWith("A")) return 1;
                    if (code.startsWith("D")) return 2;
                    if (code.startsWith("P")) return 3;
                    if (code.startsWith("T")) return 4;
                    return 5;
                };
                const rankDiff = getSeriesRank(codeA) - getSeriesRank(codeB);
                if (rankDiff !== 0) return rankDiff;
                return codeA.localeCompare(codeB);
            });
    }, [tenants, searchQuery, statusFilter, planFilter, seriesFilter]);

    const kpiCounts = useMemo(() => ({
        total: tenants.length,
        active: tenants.filter((t) => t.active_status).length,
        pro: tenants.filter((t) => t.plan_id === "pro").length,
        max: tenants.filter((t) => t.plan_id === "max" || t.plan_id === "enterprise").length,
        free: tenants.filter((t) => t.plan_id === "free" || !t.plan_id).length,
    }), [tenants]);

    const seriesOptions = useMemo(() => {
        const total = tenants.length;
        const countA = tenants.filter(t => (t.company_code || "").trim().toUpperCase().startsWith("A")).length;
        const countT = tenants.filter(t => (t.company_code || "").trim().toUpperCase().startsWith("T")).length;
        const countD = tenants.filter(t => (t.company_code || "").trim().toUpperCase().startsWith("D")).length;
        const countP = tenants.filter(t => (t.company_code || "").trim().toUpperCase().startsWith("P")).length;

        return [
            { label: "All Details / Series", value: "all", count: total },
            { label: "Client Details (A)", value: "A", count: countA },
            { label: "Testing Details (T)", value: "T", count: countT },
            { label: "Demo Details (D)", value: "D", count: countD },
            { label: "Programming Details (P)", value: "P", count: countP }
        ];
    }, [tenants]);

    const totalTenantsCount = kpiCounts.total;
    const activeCount = kpiCounts.active;
    const inactiveCount = totalTenantsCount - activeCount;
    const proCount = kpiCounts.pro;
    const maxCount = kpiCounts.max;
    const freeCount = kpiCounts.free;

    if (authLoading) {
        return (
            <div className="ap-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 16, color: "#9ca3af" }}>Checking secure admin session...</div>
            </div>
        );
    }

    return (
        <div className="ap-root">
            <ToastContainer
                className="ap-toast-container"
                toastClassName="ap-toast-item"
                bodyClassName="ap-toast-body"
                progressClassName="ap-toast-progress"
            />
            <div className="ap-glow" />
            <div className="ap-glow-alt" />

            {!isAuthenticated ? (
                /* ── LOGIN SECTION ── */
                <div className="ap-login-overlay">
                    <div className="ap-login-card">
                        <div className="ap-login-logo">
                            <div className="ap-login-logo-box">
                                <img src="/Images/logo.png" alt="Anims Logo" className="ap-login-logo-img" />
                            </div>
                        </div>

                        {isForgotPasswordMode ? (
                            /* ── FORGOT PASSWORD VIEW ── */
                            <>
                                <button 
                                    type="button" 
                                    className="ap-btn-back-link" 
                                    onClick={() => {
                                        setIsForgotPasswordMode(false);
                                        setForgotError("");
                                        setForgotSuccess("");
                                    }}
                                    title="Back to Admin Login"
                                >
                                    <MdArrowBack size={16} />
                                    <span>Back to Login</span>
                                </button>
                                <h2 className="ap-login-title">Reset Master Password</h2>
                                <p className="ap-login-subtitle">Update your master admin account credentials</p>

                                <form onSubmit={handleForgotPasswordSubmit}>
                                    {forgotError && <div className="ap-error-alert">{forgotError}</div>}
                                    {forgotSuccess && <div className="ap-success-alert"><MdCheckCircle size={16} /> <span>{forgotSuccess}</span></div>}

                                    <div className="ap-field">
                                        <label className="ap-label">Admin Username</label>
                                        <div className="ap-wrap">
                                            <input 
                                                type="text" 
                                                className="ap-input" 
                                                placeholder="Enter admin username"
                                                value={forgotUsername}
                                                onChange={e => setForgotUsername(e.target.value)}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="ap-field">
                                        <label className="ap-label">New Password</label>
                                        <div className="ap-wrap ap-wrap-password">
                                            <input 
                                                type={showForgotPass ? "text" : "password"} 
                                                className="ap-input" 
                                                placeholder="Enter new password (min 6 chars)"
                                                value={forgotNewPass}
                                                onChange={e => setForgotNewPass(e.target.value)}
                                                autoComplete="new-password"
                                            />
                                            <button 
                                                type="button" 
                                                className="ap-btn-eye-toggle"
                                                onClick={() => setShowForgotPass(!showForgotPass)}
                                                tabIndex={-1}
                                                title={showForgotPass ? "Hide Password" : "Show Password"}
                                            >
                                                {showForgotPass ? <MdEyeOff size={18} /> : <MdEye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ap-field">
                                        <label className="ap-label">Confirm New Password</label>
                                        <div className="ap-wrap ap-wrap-password">
                                            <input 
                                                type={showForgotPass ? "text" : "password"} 
                                                className="ap-input" 
                                                placeholder="Confirm new password"
                                                value={forgotConfirmPass}
                                                onChange={e => setForgotConfirmPass(e.target.value)}
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </div>

                                    <button type="submit" className="ap-btn ap-btn--reset" disabled={forgotBusy}>
                                        {forgotBusy ? (
                                            <>
                                                <svg className="ap-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                                                </svg>
                                                Updating Password...
                                            </>
                                        ) : (
                                            <>
                                                <MdLockReset size={18} />
                                                <span>Reset Password & Sign In</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* ── LOGIN VIEW ── */
                            <>
                                <h2 className="ap-login-title">Admin Controller</h2>
                                <p className="ap-login-subtitle">Enter your master admin account credentials</p>

                                <form onSubmit={handleLogin}>
                                    {loginError && <div className="ap-error-alert">{loginError}</div>}

                                    <div className="ap-field">
                                        <label className="ap-label">Username</label>
                                        <div className="ap-wrap">
                                            <input 
                                                type="text" 
                                                name="master_admin_username_field"
                                                className="ap-input" 
                                                placeholder="Enter admin username"
                                                value={loginUsername}
                                                onChange={e => setLoginUsername(e.target.value)}
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </div>

                                    <div className="ap-field">
                                        <label className="ap-label">Password</label>
                                        <div className="ap-wrap ap-wrap-password">
                                            <input 
                                                type={showLoginPass ? "text" : "password"} 
                                                name="master_admin_password_field"
                                                className="ap-input" 
                                                placeholder="••••••••"
                                                value={loginPassword}
                                                onChange={e => setLoginPassword(e.target.value)}
                                                autoComplete="new-password"
                                            />
                                            <button 
                                                type="button" 
                                                className="ap-btn-eye-toggle"
                                                onClick={() => setShowLoginPass(!showLoginPass)}
                                                tabIndex={-1}
                                                title={showLoginPass ? "Hide Password" : "Show Password"}
                                            >
                                                {showLoginPass ? <MdEyeOff size={18} /> : <MdEye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="ap-btn" disabled={loginBusy}>
                                        {loginBusy ? (
                                            <>
                                                <svg className="ap-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                                                </svg>
                                                Verifying Credentials...
                                            </>
                                        ) : "Authenticate"}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* ── DASHBOARD SECTION ── */
                <>
                    <div className="ap-dashboard-layout">
                    {/* Side Navbar */}
                    <aside className="ap-sidebar">
                        <div className="ap-sidebar-brand">
                            <div className="ap-sidebar-logo-box">
                                <img src="/Images/logo.png" alt="Anims Logo" className="ap-sidebar-logo-img" />
                            </div>
                            <span className="ap-sidebar-logo-text">Anims ERP</span>
                        </div>

                        <div className="ap-sidebar-menu">
                            <div className="ap-sidebar-section-title">Menu</div>

                            <button 
                                className={`ap-sidebar-item ${activeTab === "admin_pannel" ? "ap-sidebar-item--active" : ""}`}
                                onClick={() => setActiveTab("admin_pannel")}
                            >
                                <svg className="ap-sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="7" height="7" rx="1" />
                                </svg>
                                <span className="ap-sidebar-text">Admin Panel</span>
                            </button>

                            <button 
                                className={`ap-sidebar-item ${activeTab === "anims_utility" ? "ap-sidebar-item--active" : ""}`}
                                onClick={() => setActiveTab("anims_utility")}
                            >
                                <svg className="ap-sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                </svg>
                                <span className="ap-sidebar-text">Anims Utility</span>
                            </button>

                            <button 
                                className={`ap-sidebar-item ${activeTab === "user_transaction_report" ? "ap-sidebar-item--active" : ""}`}
                                onClick={() => setActiveTab("user_transaction_report")}
                            >
                                <svg className="ap-sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="4" y="4" width="16" height="16" rx="2" />
                                    <line x1="9" y1="9" x2="15" y2="9" />
                                    <line x1="9" y1="13" x2="15" y2="13" />
                                    <line x1="9" y1="17" x2="13" y2="17" />
                                </svg>
                                <span className="ap-sidebar-text">User Transaction Report</span>
                            </button>

                            {String(currentAdminUser || "").trim().toLowerCase() === "admin" && (
                                <>
                                    <div className="ap-sidebar-section-title" style={{ marginTop: "16px" }}>Settings</div>

                                    <button 
                                        className={`ap-sidebar-item ${activeTab === "settings_users" ? "ap-sidebar-item--active" : ""}`}
                                        onClick={() => setActiveTab("settings_users")}
                                    >
                                        <MdPeople className="ap-sidebar-icon" size={18} />
                                        <span className="ap-sidebar-text">Users</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="ap-sidebar-footer">
                            <button 
                                type="button" 
                                className={`ap-sidebar-item ap-sidebar-security-badge ${securityInfo?.recommend_change ? "ap-sidebar-security-badge--due" : ""}`}
                                onClick={() => setShowChangePasswordModal(true)}
                                title="Master Admin Security & Password Rotation Status"
                                style={{ marginBottom: "8px" }}
                            >
                                <MdShield className="ap-sidebar-icon" size={18} />
                                <span className="ap-sidebar-text">
                                    {securityInfo?.recommend_change ? `Password Rotation Due (${securityInfo?.password_age_days || 60}d)` : `Security: Good (${securityInfo?.password_age_days || 0}d)`}
                                </span>
                            </button>
                            <button className="ap-sidebar-logout-btn" onClick={handleLogout}>
                                <svg className="ap-sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16,17 21,12 16,7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span className="ap-sidebar-text">Logout Admin</span>
                            </button>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="ap-content-wrapper">
                        {activeTab === "admin_pannel" ? (
                            <main className="ap-main">
                                {/* KPI Grid */}
                                <div className="ap-stats-grid">
                                    <div className="ap-stat-card">
                                        <div className="ap-stat-title">Total Organizations</div>
                                        <div className="ap-stat-value">{totalTenantsCount}</div>
                                    </div>
                                    <div className="ap-stat-card ap-stat-card--success">
                                        <div className="ap-stat-title">Active Organizations</div>
                                        <div className="ap-stat-value">{activeCount}</div>
                                    </div>
                                    <div className="ap-stat-card ap-stat-card--warning">
                                        <div className="ap-stat-title">Blocked / Inactive</div>
                                        <div className="ap-stat-value">{inactiveCount}</div>
                                    </div>
                                    <div className="ap-stat-card ap-stat-card--cyan">
                                        <div className="ap-stat-title">Free Plan Tiers</div>
                                        <div className="ap-stat-value">{freeCount}</div>
                                    </div>
                                    <div className="ap-stat-card">
                                        <div className="ap-stat-title">Pro Plan Tiers</div>
                                        <div className="ap-stat-value">{proCount}</div>
                                    </div>
                                    <div className="ap-stat-card">
                                        <div className="ap-stat-title">Max Plan Tiers</div>
                                        <div className="ap-stat-value">{maxCount}</div>
                                    </div>
                                </div>

                                {/* Control Section */}
                                <div className="ap-table-section">
                                    <div className="ap-table-header">
                                        <h3 className="ap-section-title">Tenant Organizations Directory</h3>
                                        <button className="ap-btn" onClick={openCreateModal} style={{ width: "auto" }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                            Add Organization
                                        </button>
                                    </div>

                                    <div className="ap-controls-row">
                                        <div className="ap-search-wrap">
                                            <input 
                                                type="text" 
                                                className="ap-input" 
                                                placeholder="Search by name, code, contact person, or email..." 
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <CustomDropdown
                                            value={seriesFilter}
                                            onChange={e => setSeriesFilter(e.target.value)}
                                            options={seriesOptions}
                                            placeholder="All Details / Series"
                                            isWide={true}
                                        />
                                        <CustomDropdown
                                            value={statusFilter}
                                            onChange={e => setStatusFilter(e.target.value)}
                                            options={[
                                                { label: "All Statuses", value: "all" },
                                                { label: "Active Tiers", value: "active" },
                                                { label: "Blocked / Inactive", value: "inactive" }
                                            ]}
                                            placeholder="All Statuses"
                                        />
                                        <CustomDropdown
                                            value={planFilter}
                                            onChange={e => setPlanFilter(e.target.value)}
                                            options={[
                                                { label: "All Plans", value: "all" },
                                                { label: "Free Tiers", value: "free" },
                                                { label: "Pro Tiers", value: "pro" },
                                                { label: "Max Tiers", value: "max" }
                                            ]}
                                            placeholder="All Plans"
                                        />
                                        <button className="ap-icon-btn" onClick={fetchTenants} title="Refresh Table data">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Data Table */}
                                    {loadingTenants ? (
                                        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>Querying database rows...</div>
                                    ) : errorMsg ? (
                                        <div className="ap-error-alert" style={{ marginBottom: 0 }}>{errorMsg}</div>
                                    ) : filteredTenants.length === 0 ? (
                                        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>No organizations match the search criteria.</div>
                                    ) : (
                                        <div className="ap-table-wrapper">
                                            <table className="ap-table">
                                                <thead>
                                                    <tr>
                                                        <th className="ap-th">Organization</th>
                                                        <th className="ap-th">Contact Info</th>
                                                        <th className="ap-th">Plan</th>
                                                        <th className="ap-th">Onboard</th>
                                                        <th className="ap-th">Active / Access</th>
                                                        <th className="ap-th">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTenants.map(t => (
                                                        <tr className="ap-tr" key={t.id}>
                                                            <td className="ap-td">
                                                                <div className="ap-company-info">
                                                                    <span className="ap-company-name">{t.company_name}</span>
                                                                    <span className="ap-company-code">Code: {t.company_code}</span>
                                                                </div>
                                                            </td>
                                                            <td className="ap-td">
                                                                <div>{t.business_person_name}</div>
                                                                <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.email_id}</div>
                                                                <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.phone_number}</div>
                                                            </td>
                                                            <td className="ap-td">
                                                                <span className={`ap-badge ${(t.company_code || '').toUpperCase().startsWith('A') && t.plan_id === 'free' ? 'ap-badge--free' : 'ap-badge--plan'}`}>
                                                                    {getSeriesPlanName(t.company_code, t.plan_name)}
                                                                </span>
                                                                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                                                                    Limit: {t.no_of_users} User(s)
                                                                </div>
                                                            </td>
                                                            <td className="ap-td">
                                                                {formatDate(t.signup_date)}
                                                            </td>
                                                            <td className="ap-td">
                                                                <label className={`ap-switch${togglingIds.has(t.tenant_id) ? " ap-switch--busy" : ""}`}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={t.active_status}
                                                                        disabled={togglingIds.has(t.tenant_id)}
                                                                        onChange={() => handleToggleStatus(t, t.active_status)}
                                                                    />
                                                                    <span className="ap-slider"></span>
                                                                </label>
                                                            </td>
                                                            <td className="ap-td">
                                                                <div className="ap-actions">
                                                                    <button 
                                                                        className="ap-icon-btn ap-icon-btn--primary" 
                                                                        title="Edit details & database settings"
                                                                        onClick={() => openEditModal(t)}
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button 
                                                                        className="ap-icon-btn" 
                                                                        title="Manage Users"
                                                                        onClick={() => openUserDrawer(t)}
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                                                        </svg>
                                                                    </button>
                                                                    <button 
                                                                        className="ap-icon-btn ap-icon-btn--danger" 
                                                                        title="Delete organization"
                                                                        onClick={() => handleDeleteTenant(t)}
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                            <polyline points="3 6 5 6 21 6" />
                                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </main>
                        ) : activeTab === "anims_utility" ? (
                            <main className="ap-main-utility">
                                <AnimsUtility onAuthLost={handleAdminSessionLost} />
                            </main>
                        ) : activeTab === "user_transaction_report" ? (
                            <main className="ap-main-utility">
                                <UserTransactionReport onAuthLost={handleAdminSessionLost} />
                            </main>
                        ) : activeTab === "settings_users" && String(currentAdminUser || "").trim().toLowerCase() === "admin" ? (
                            <main className="ap-main ap-animate-fade-in">
                                {/* KPI Grid for Admin Security */}
                                <div className="ap-stats-grid ap-stats-grid--3col">
                                    <div className="ap-stat-card ap-stat-card--users">
                                        <div className="ap-stat-header">
                                            <div className="ap-stat-title">Total Admin Accounts</div>
                                            <div className="ap-stat-badge">Master Controller</div>
                                        </div>
                                        <div className="ap-stat-value">{adminCredentials.length}</div>
                                    </div>
                                    <div className="ap-stat-card ap-stat-card--success">
                                        <div className="ap-stat-header">
                                            <div className="ap-stat-title">Account Security</div>
                                            <div className="ap-stat-badge">SHA-256</div>
                                        </div>
                                        <div className="ap-stat-value" style={{ fontSize: "20px", marginTop: "4px" }}>
                                            Encrypted Credentials
                                        </div>
                                    </div>
                                    <div className="ap-stat-card ap-stat-card--warning">
                                        <div className="ap-stat-header">
                                            <div className="ap-stat-title">Password Rotation</div>
                                            <div className="ap-stat-badge">Compliance</div>
                                        </div>
                                        <div className="ap-stat-value" style={{ fontSize: "20px", marginTop: "4px" }}>
                                            60-Day Policy Active
                                        </div>
                                    </div>
                                </div>

                                {/* Master Admin Directory Table */}
                                <div className="ap-table-section">
                                    <div className="ap-table-header">
                                        <div>
                                            <h3 className="ap-section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="ap-title-icon-box">
                                                    <MdPeople size={20} />
                                                </div>
                                                <span>Admin Controller Users Directory</span>
                                            </h3>
                                            <p className="ap-section-subtitle">
                                                Manage master admin accounts, system access credentials, and security permissions.
                                            </p>
                                        </div>
                                        <button 
                                            className="ap-btn ap-btn--add-user" 
                                            onClick={() => {
                                                setAddAdminError("");
                                                setNewAdminUser("");
                                                setNewAdminPass("");
                                                setNewAdminConfirmPass("");
                                                setShowAddAdminModal(true);
                                            }} 
                                        >
                                            <MdPersonAdd size={18} />
                                            <span>Add Admin User</span>
                                        </button>
                                    </div>

                                    {loadingCredentials ? (
                                        <div className="ap-table-loading">
                                            <svg className="ap-spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                                            </svg>
                                            <span>Querying master admin credentials...</span>
                                        </div>
                                    ) : adminCredentials.length === 0 ? (
                                        <div className="ap-table-empty">No master admin users found.</div>
                                    ) : (
                                        <div className="ap-table-wrapper">
                                            <table className="ap-table">
                                                <thead>
                                                    <tr>
                                                        <th className="ap-th" style={{ width: "80px" }}>#</th>
                                                        <th className="ap-th" style={{ minWidth: "220px" }}>Admin User</th>
                                                        <th className="ap-th" style={{ minWidth: "140px" }}>Status</th>
                                                        <th className="ap-th" style={{ minWidth: "180px" }}>Last Login</th>
                                                        <th className="ap-th" style={{ minWidth: "180px" }}>Created Date</th>
                                                        <th className="ap-th" style={{ textAlign: "right", width: "100px" }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {adminCredentials.map((admin, idx) => (
                                                        <tr key={admin.id} className="ap-tr ap-table-row-animated" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                            <td className="ap-td">
                                                                <span className="ap-row-index">{idx + 1}</span>
                                                            </td>
                                                            <td className="ap-td">
                                                                <div className="ap-user-cell">
                                                                    <div className="ap-user-avatar-badge">
                                                                        {admin.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="ap-user-title">{admin.username}</div>
                                                                        <div className="ap-user-id">Master ID: #{admin.id}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="ap-td">
                                                                <span className="ap-badge ap-badge--active">
                                                                    <span className="ap-badge-dot"></span>
                                                                    Active
                                                                </span>
                                                            </td>
                                                            <td className="ap-td" style={{ color: '#cbd5e1', fontSize: '13px' }}>
                                                                {admin.last_login || "Never"}
                                                            </td>
                                                            <td className="ap-td" style={{ color: '#cbd5e1', fontSize: '13px' }}>
                                                                {admin.created_at || "—"}
                                                            </td>
                                                            <td className="ap-td" style={{ textAlign: "right" }}>
                                                                {admin.username.toLowerCase() !== "admin" ? (
                                                                    <button 
                                                                        className="ap-action-btn ap-action-btn--delete" 
                                                                        onClick={() => handleDeleteAdminUser(admin)}
                                                                        title="Delete Master Admin User"
                                                                    >
                                                                        <MdDelete size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', paddingRight: '6px' }}>Protected</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </main>
                        ) : null}
                    </div>
                </div>

                    {/* Drawer Side User Panel */}
                    {showUserDrawer && (
                        <div className="ap-drawer-overlay" onClick={() => setShowUserDrawer(false)}>
                            <div className="ap-drawer-container" onClick={e => e.stopPropagation()}>
                                <div className="ap-drawer-header">
                                    <h3 className="ap-modal-title">
                                        Manage Users ({drawerCompany?.company_code})
                                    </h3>
                                    <button className="ap-modal-close" onClick={() => setShowUserDrawer(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="ap-drawer-body">
                                    {loadingUsers ? (
                                        <div style={{ textAlign: "center", color: "#9ca3af" }}>Loading users list...</div>
                                    ) : drawerUsers.length === 0 ? (
                                        <div className="ap-drawer-empty">No active users found.</div>
                                    ) : (
                                        <div className="ap-user-list">
                                            {drawerUsers.map(user => (
                                                <div className="ap-user-card" key={user.id}>
                                                    <div className="ap-user-avatar">
                                                        {(user.username[0] || "?").toUpperCase()}
                                                    </div>
                                                    <div className="ap-user-main">
                                                        <div className="ap-user-name">{user.username}</div>
                                                        <div className="ap-user-sub">
                                                            {user.designation} • Created: {user.created_at}
                                                            {user.isActive && (
                                                                <span style={{ 
                                                                    marginLeft: 8, 
                                                                    background: "rgba(16, 185, 129, 0.15)", 
                                                                    color: "#a7f3d0", 
                                                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                                                    padding: "2px 6px",
                                                                    borderRadius: "4px",
                                                                    fontSize: "10px",
                                                                    fontWeight: 600,
                                                                    display: "inline-block"
                                                                }}>
                                                                    Active {user.systemName ? `on ${user.systemName}` : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Password display with toggle */}
                                                        <div className="ap-user-password-wrap">
                                                            <span className="ap-user-password-label">Password:</span>
                                                            <span className="ap-user-password-value">
                                                                {showPasswordMap[user.id] ? user.password : "••••••••"}
                                                            </span>
                                                            <button 
                                                                className="ap-user-password-toggle-btn"
                                                                title={showPasswordMap[user.id] ? "Hide Password" : "Show Password"}
                                                                onClick={() => togglePasswordVisibility(user.id)}
                                                            >
                                                                {showPasswordMap[user.id] ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {!user.issuperadmin && (
                                                        <button 
                                                            className="ap-icon-btn ap-icon-btn--danger"
                                                            title="Delete user"
                                                            onClick={() => handleDeleteUser(user)}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CREATE TENANT MODAL ── */}
                    {showCreateModal && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container">
                                <div className="ap-modal-header">
                                    <h3 className="ap-modal-title">Register New Tenant</h3>
                                    <button className="ap-modal-close" onClick={() => setShowCreateModal(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <form onSubmit={handleCreateSubmit}>
                                    <div className="ap-modal-body">
                                        {formError && <div className="ap-error-alert">{formError}</div>}

                                        <div className="ap-form-grid">
                                            <div className="ap-form-subtitle">Basic Company Info</div>

                                            <div className="ap-field">
                                                <label className="ap-label">Company Code *</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="VES001"
                                                    value={compCode}
                                                    onChange={e => setCompCode(e.target.value.toUpperCase())}
                                                    required
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Company Name *</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="Virrudheeswara Engg"
                                                    value={compName}
                                                    onChange={e => setCompName(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Business Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={busName}
                                                    onChange={e => setBusName(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Contact Person Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={persName}
                                                    onChange={e => setPersName(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Email ID</label>
                                                <input 
                                                    type="email" 
                                                    className="ap-input" 
                                                    value={emailId}
                                                    onChange={e => setEmailId(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Phone Number</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={phoneNo}
                                                    onChange={e => setPhoneNo(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">GST Number</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={gstNo}
                                                    onChange={e => setGstNo(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">No. of Employees</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={empCount}
                                                    onChange={e => setEmpCount(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">City</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="Chennai"
                                                    value={city}
                                                    onChange={e => setCity(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">State</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="TN"
                                                    value={state}
                                                    onChange={e => setState(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-form-subtitle ap-form-full">Subscription & Rights Config</div>

                                            <div className="ap-field">
                                                <label className="ap-label">Plan Tier</label>
                                                <select 
                                                    className="ap-filter-select"
                                                    value={planId}
                                                    onChange={e => setPlanId(e.target.value)}
                                                    style={{ width: "100%" }}
                                                >
                                                    <option value="free">Free Plan (6 Months)</option>
                                                    <option value="pro">Pro Plan (1 Year)</option>
                                                    <option value="max">Max Plan (Unlimited)</option>
                                                </select>
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Max Users Limit</label>
                                                <input 
                                                    type="number" 
                                                    className="ap-input" 
                                                    value={usersCount}
                                                    onChange={e => setUsersCount(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Start Date</label>
                                                <CustomSingleDatePicker 
                                                    value={startDate}
                                                    onChange={setStartDate}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">End Date (Override)</label>
                                                <CustomSingleDatePicker 
                                                    value={endDate}
                                                    onChange={setEndDate}
                                                />
                                            </div>

                                            <div className="ap-form-subtitle ap-form-full">Licensed Modules Config</div>
                                            <div className="ap-modules-grid">
                                                {[
                                                    { key: "dashboard", label: "Dashboard", desc: "Top & Plant Metrics" },
                                                    { key: "approvals", label: "Approvals", desc: "E & T Approvals" },
                                                    { key: "charts", label: "Charts", desc: "Trend Visuals" },
                                                    { key: "reports", label: "Reports", desc: "Sales, Purchase, Quality" },
                                                    { key: "mis", label: "MIS", desc: "Idle & Efficiency" },
                                                    { key: "utility", label: "Utility", desc: "User Rights Config" },
                                                ].map(mod => {
                                                    const isChecked = !!modulesState[mod.key];
                                                    return (
                                                        <div 
                                                            key={mod.key} 
                                                            className={`ap-module-card ${isChecked ? "ap-module-card--active" : "ap-module-card--disabled"}`}
                                                            onClick={() => setModulesState(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                                                        >
                                                            <div className="ap-module-card__top">
                                                                <span className="ap-module-card__name">{mod.label}</span>
                                                                <span className={`ap-module-card__badge ${isChecked ? "ap-module-card__badge--on" : "ap-module-card__badge--off"}`}>
                                                                    {isChecked ? "✓ Active" : "✕ Disabled"}
                                                                </span>
                                                            </div>
                                                            <span className="ap-module-card__sub">{mod.desc}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="ap-form-subtitle">Database ERP Server Details</div>

                                            <div className="ap-field ap-form-full">
                                                <label className="ap-label">ERP SQL Server Host</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="localhost or domain name"
                                                    value={erpServer}
                                                    onChange={e => setErpServer(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Database Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="SASSMMS"
                                                    value={erpDatabase}
                                                    onChange={e => setErpDatabase(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Database Port</label>
                                                <input 
                                                    type="number" 
                                                    className="ap-input" 
                                                    value={erpPort}
                                                    onChange={e => setErpPort(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">SQL Server Username</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={erpUser}
                                                    onChange={e => setErpUser(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">SQL Server Password</label>
                                                <input 
                                                    type="password" 
                                                    className="ap-input" 
                                                    value={erpPassword}
                                                    onChange={e => setErpPassword(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>

                                            <div className="ap-form-subtitle">Tenant Superadmin Credentials</div>

                                            <div className="ap-field">
                                                <label className="ap-label">Admin Username</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={adminUser}
                                                    onChange={e => setAdminUser(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Admin Password</label>
                                                <input 
                                                    type="password" 
                                                    className="ap-input" 
                                                    value={adminPass}
                                                    onChange={e => setAdminPass(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ap-modal-footer">
                                        <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                        <button type="submit" className="ap-btn ap-btn--submit" disabled={formBusy}>
                                            {formBusy ? "Saving..." : "Create Tenant"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── EDIT TENANT MODAL ── */}
                    {showEditModal && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container">
                                <div className="ap-modal-header">
                                    <h3 className="ap-modal-title">Modify Tenant Settings</h3>
                                    <button className="ap-modal-close" onClick={() => setShowEditModal(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <form onSubmit={handleEditSubmit}>
                                    <div className="ap-modal-body">
                                        {formError && <div className="ap-error-alert">{formError}</div>}

                                        <div className="ap-form-grid">
                                            <div className="ap-form-subtitle">Basic Company Info</div>

                                            <div className="ap-field">
                                                <label className="ap-label">Company Code (Locked)</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={compCode}
                                                    disabled
                                                    style={{ opacity: 0.6 }}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Company Name *</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={compName}
                                                    onChange={e => setCompName(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Business Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={busName}
                                                    onChange={e => setBusName(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Contact Person Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={persName}
                                                    onChange={e => setPersName(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Email ID</label>
                                                <input 
                                                    type="email" 
                                                    className="ap-input" 
                                                    value={emailId}
                                                    onChange={e => setEmailId(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Phone Number</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={phoneNo}
                                                    onChange={e => setPhoneNo(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">GST Number</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={gstNo}
                                                    onChange={e => setGstNo(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">No. of Employees</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={empCount}
                                                    onChange={e => setEmpCount(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">City</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="Chennai"
                                                    value={city}
                                                    onChange={e => setCity(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">State</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    placeholder="TN"
                                                    value={state}
                                                    onChange={e => setState(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-form-subtitle ap-form-full">Subscription Config</div>

                                            <div className="ap-field">
                                                <label className="ap-label">Plan Tier</label>
                                                <select 
                                                    className="ap-filter-select"
                                                    value={planId}
                                                    onChange={e => setPlanId(e.target.value)}
                                                    style={{ width: "100%" }}
                                                >
                                                    <option value="free">Free Plan (6 Months)</option>
                                                    <option value="pro">Pro Plan (1 Year)</option>
                                                    <option value="max">Max Plan (Unlimited)</option>
                                                </select>
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Max Users Limit</label>
                                                <input 
                                                    type="number" 
                                                    className="ap-input" 
                                                    value={usersCount}
                                                    onChange={e => setUsersCount(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Start Date</label>
                                                <CustomSingleDatePicker 
                                                    value={startDate}
                                                    onChange={setStartDate}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">End Date</label>
                                                <CustomSingleDatePicker 
                                                    value={endDate}
                                                    onChange={setEndDate}
                                                />
                                            </div>

                                            <div className="ap-form-subtitle ap-form-full">Licensed Modules Config</div>
                                            <div className="ap-modules-grid">
                                                {[
                                                    { key: "dashboard", label: "Dashboard", desc: "Top & Plant Metrics" },
                                                    { key: "approvals", label: "Approvals", desc: "E & T Approvals" },
                                                    { key: "charts", label: "Charts", desc: "Trend Visuals" },
                                                    { key: "reports", label: "Reports", desc: "Sales, Purchase, Quality" },
                                                    { key: "mis", label: "MIS", desc: "Idle & Efficiency" },
                                                    { key: "utility", label: "Utility", desc: "User Rights Config" },
                                                ].map(mod => {
                                                    const isChecked = !!modulesState[mod.key];
                                                    return (
                                                        <div 
                                                            key={mod.key} 
                                                            className={`ap-module-card ${isChecked ? "ap-module-card--active" : "ap-module-card--disabled"}`}
                                                            onClick={() => setModulesState(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                                                        >
                                                            <div className="ap-module-card__top">
                                                                <span className="ap-module-card__name">{mod.label}</span>
                                                                <span className={`ap-module-card__badge ${isChecked ? "ap-module-card__badge--on" : "ap-module-card__badge--off"}`}>
                                                                    {isChecked ? "✓ Active" : "✕ Disabled"}
                                                                </span>
                                                            </div>
                                                            <span className="ap-module-card__sub">{mod.desc}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="ap-form-subtitle">Database ERP Server Details</div>

                                            <div className="ap-field ap-form-full">
                                                <label className="ap-label">ERP SQL Server Host</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={erpServer}
                                                    onChange={e => setErpServer(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Database Name</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={erpDatabase}
                                                    onChange={e => setErpDatabase(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">Database Port</label>
                                                <input 
                                                    type="number" 
                                                    className="ap-input" 
                                                    value={erpPort}
                                                    onChange={e => setErpPort(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">SQL Server Username</label>
                                                <input 
                                                    type="text" 
                                                    className="ap-input" 
                                                    value={erpUser}
                                                    onChange={e => setErpUser(e.target.value)}
                                                />
                                            </div>

                                            <div className="ap-field">
                                                <label className="ap-label">SQL Server Password</label>
                                                <input 
                                                    type="password" 
                                                    className="ap-input" 
                                                    value={erpPassword}
                                                    onChange={e => setErpPassword(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ap-modal-footer">
                                        <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                                        <button type="submit" className="ap-btn ap-btn--submit" disabled={formBusy}>
                                            {formBusy ? "Saving..." : "Update Settings"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── CONFIRM DELETE MODAL ── */}
                    {deleteConfirm.show && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container ap-modal-container--danger ap-modal-container--small">
                                <div className="ap-modal-header ap-modal-header--danger">
                                    <div className="ap-danger-header-left">
                                        <div className="ap-danger-icon-glow">
                                            <MdDelete size={22} />
                                        </div>
                                        <div>
                                            <h3 className="ap-modal-title">{deleteConfirm.title}</h3>
                                            <p className="ap-modal-subtitle">Irreversible Administrative Action</p>
                                        </div>
                                    </div>
                                    <button className="ap-modal-close" onClick={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="ap-modal-body">
                                    {deleteConfirm.target && (
                                        <div className="ap-danger-target-card">
                                            <div className="ap-danger-target-left">
                                                <div className="ap-danger-avatar">
                                                    {(deleteConfirm.target.username || deleteConfirm.target.company_name || "A").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="ap-danger-target-name">
                                                        {deleteConfirm.target.username || deleteConfirm.target.company_name}
                                                    </div>
                                                    <div className="ap-danger-target-meta">
                                                        {deleteConfirm.type === "admin_user" 
                                                            ? `Master Admin ID: #${deleteConfirm.target.id}` 
                                                            : `Tenant ID: #${deleteConfirm.target.tenant_id || deleteConfirm.target.id}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="ap-badge ap-badge--danger">To Be Removed</span>
                                        </div>
                                    )}

                                    <div className="ap-danger-warning-box">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>
                                            {deleteConfirm.message || "This action is permanent and cannot be undone. All access permissions for this record will be immediately revoked."}
                                        </span>
                                    </div>
                                </div>
                                <div className="ap-modal-footer">
                                    <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setDeleteConfirm(prev => ({ ...prev, show: false }))}>
                                        Cancel
                                    </button>
                                    <button type="button" className="ap-btn ap-btn--danger-glow" onClick={handleConfirmDelete} disabled={formBusy}>
                                        <MdDelete size={18} />
                                        <span>{formBusy ? "Deleting..." : deleteConfirm.confirmBtnText}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* ── 60-DAY SECURITY RECOMMENDATION MODAL ── */}
                    {showSecurityModal && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container ap-modal-container--security">
                                <div className="ap-modal-header ap-modal-header--security">
                                    <div className="ap-security-header-left">
                                        <div className="ap-security-icon-box">
                                            <MdShield size={24} />
                                        </div>
                                        <div>
                                            <h3 className="ap-modal-title">Security Recommendation</h3>
                                            <p className="ap-modal-subtitle">60-Day Password Rotation Policy</p>
                                        </div>
                                    </div>
                                    <button className="ap-modal-close" onClick={() => setShowSecurityModal(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="ap-modal-body">
                                    <div className="ap-security-badge-row">
                                        <span className="ap-security-age-badge">
                                            <MdAccessTime size={15} />
                                            <span>Password Age: <strong>{securityInfo?.password_age_days || 60} Days</strong></span>
                                        </span>
                                        <span className="ap-security-policy-badge">Policy: 60 Days</span>
                                    </div>

                                    <div className="ap-security-alert-box">
                                        <p>
                                            Your master admin password was last updated on <strong>{securityInfo?.last_changed_date || "initial setup"}</strong> ({securityInfo?.password_age_days || 60} days ago).
                                        </p>
                                        <p style={{ marginTop: 8, color: "#e2e8f0" }}>
                                            For maximum security compliance and protection of organization tenant data, we recommend rotating master credentials every 60 days.
                                        </p>
                                    </div>

                                    <div className="ap-security-progress-wrap">
                                        <div className="ap-security-progress-label">
                                            <span>Rotation Status</span>
                                            <span>{securityInfo?.password_age_days || 60} / 60 Days</span>
                                        </div>
                                        <div className="ap-security-progress-bar">
                                            <div 
                                                className="ap-security-progress-fill" 
                                                style={{ width: `${Math.min(100, ((securityInfo?.password_age_days || 60) / 60) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="ap-modal-footer ap-modal-footer--security">
                                    <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setShowSecurityModal(false)}>
                                        Remind Me Later
                                    </button>
                                    <button 
                                        type="button" 
                                        className="ap-btn ap-btn--submit ap-btn--security"
                                        onClick={() => {
                                            setShowSecurityModal(false);
                                            setShowChangePasswordModal(true);
                                        }}
                                    >
                                        <MdLockReset size={18} />
                                        <span>Update Password Now</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── CHANGE MASTER ADMIN PASSWORD MODAL ── */}
                    {showChangePasswordModal && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container ap-modal-container--small">
                                <div className="ap-modal-header">
                                    <h3 className="ap-modal-title">Change Master Admin Password</h3>
                                    <button className="ap-modal-close" onClick={() => setShowChangePasswordModal(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <form onSubmit={handleChangePasswordSubmit}>
                                    <div className="ap-modal-body">
                                        {changePassError && <div className="ap-error-alert">{changePassError}</div>}

                                        <div className="ap-field">
                                            <label className="ap-label">New Password</label>
                                            <div className="ap-wrap ap-wrap-password">
                                                <input 
                                                    type={showChangePassEye ? "text" : "password"}
                                                    className="ap-input"
                                                    placeholder="Enter new password (min 6 chars)"
                                                    value={changeNewPass}
                                                    onChange={e => setChangeNewPass(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                                <button 
                                                    type="button" 
                                                    className="ap-btn-eye-toggle"
                                                    onClick={() => setShowChangePassEye(!showChangePassEye)}
                                                    tabIndex={-1}
                                                >
                                                    {showChangePassEye ? <MdEyeOff size={18} /> : <MdEye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="ap-field">
                                            <label className="ap-label">Confirm New Password</label>
                                            <div className="ap-wrap ap-wrap-password">
                                                <input 
                                                    type={showChangePassEye ? "text" : "password"}
                                                    className="ap-input"
                                                    placeholder="Confirm new password"
                                                    value={changeConfirmPass}
                                                    onChange={e => setChangeConfirmPass(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ap-modal-footer">
                                        <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setShowChangePasswordModal(false)}>Cancel</button>
                                        <button type="submit" className="ap-btn ap-btn--submit" disabled={changePassBusy}>
                                            {changePassBusy ? "Updating..." : "Save New Password"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── ADD MASTER ADMIN USER MODAL ── */}
                    {showAddAdminModal && (
                        <div className="ap-modal-overlay">
                            <div className="ap-modal-container ap-modal-container--small">
                                <div className="ap-modal-header">
                                    <h3 className="ap-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MdPersonAdd size={20} style={{ color: '#818cf8' }} />
                                        <span>Add Master Admin User</span>
                                    </h3>
                                    <button className="ap-modal-close" onClick={() => setShowAddAdminModal(false)}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <form onSubmit={handleAddAdminSubmit}>
                                    <div className="ap-modal-body">
                                        {addAdminError && <div className="ap-error-alert">{addAdminError}</div>}

                                        <div className="ap-field">
                                            <label className="ap-label">Admin Username</label>
                                            <div className="ap-wrap">
                                                <input 
                                                    type="text"
                                                    className="ap-input"
                                                    placeholder="Enter admin username"
                                                    value={newAdminUser}
                                                    onChange={e => setNewAdminUser(e.target.value)}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>

                                        <div className="ap-field">
                                            <label className="ap-label">Password</label>
                                            <div className="ap-wrap ap-wrap-password">
                                                <input 
                                                    type={showNewAdminPassEye ? "text" : "password"}
                                                    className="ap-input"
                                                    placeholder="Enter password (min 6 chars)"
                                                    value={newAdminPass}
                                                    onChange={e => setNewAdminPass(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                                <button 
                                                    type="button" 
                                                    className="ap-btn-eye-toggle"
                                                    onClick={() => setShowNewAdminPassEye(!showNewAdminPassEye)}
                                                    tabIndex={-1}
                                                >
                                                    {showNewAdminPassEye ? <MdEyeOff size={18} /> : <MdEye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="ap-field">
                                            <label className="ap-label">Confirm Password</label>
                                            <div className="ap-wrap ap-wrap-password">
                                                <input 
                                                    type={showNewAdminPassEye ? "text" : "password"}
                                                    className="ap-input"
                                                    placeholder="Confirm password"
                                                    value={newAdminConfirmPass}
                                                    onChange={e => setNewAdminConfirmPass(e.target.value)}
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="ap-modal-footer">
                                        <button type="button" className="ap-btn ap-btn--cancel" onClick={() => setShowAddAdminModal(false)}>Cancel</button>
                                        <button type="submit" className="ap-btn ap-btn--submit" disabled={addAdminBusy}>
                                            {addAdminBusy ? "Creating..." : "Create Admin User"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
