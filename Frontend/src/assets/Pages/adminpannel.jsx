import { useState, useEffect } from "react";
import { resolveApiBase } from "../../apiBase";
import "./adminpannel.css";

const API = resolveApiBase();

export default function AdminPanel() {
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);

    // Tenants State
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");

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
    const [endDate, setEndDate] = useState("");
    
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

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const res = await fetch(`${API}/admin/check-session/`, { credentials: "include" });
            const data = await res.json();
            if (data.authenticated) {
                setIsAuthenticated(true);
                fetchTenants();
            }
        } catch {
            /* session check fail */
        } finally {
            setAuthLoading(false);
        }
    };

    const fetchTenants = async () => {
        setLoadingTenants(true);
        setErrorMsg("");
        try {
            const res = await fetch(`${API}/admin/tenants/`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                setTenants(data.tenants || []);
            } else {
                setErrorMsg(data.error || "Failed to load tenants.");
            }
        } catch (err) {
            setErrorMsg("Network error. Could not connect to API.");
        } finally {
            setLoadingTenants(false);
        }
    };

    // Authenticate Admin
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        if (!loginUsername || !loginPassword) {
            setLoginError("Please enter username and password.");
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
            if (res.ok) {
                setIsAuthenticated(true);
                fetchTenants();
            } else {
                setLoginError(data.error || "Invalid credentials.");
            }
        } catch {
            setLoginError("Network connection failed.");
        } finally {
            setLoginBusy(false);
        }
    };

    // Logout Admin
    const handleLogout = async () => {
        try {
            await fetch(`${API}/admin/logout/`, {
                method: "POST",
                credentials: "include"
            });
        } catch {
            /* ignore */
        }
        setIsAuthenticated(false);
        setTenants([]);
    };

    // Toggle Active Status of Tenant
    const handleToggleStatus = async (tenant, currentVal) => {
        const newVal = !currentVal;
        try {
            const res = await fetch(`${API}/admin/tenants/update/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenant_id: tenant.tenant_id,
                    company_code: tenant.company_code,
                    company_name: tenant.company_name,
                    business_name: tenant.business_name,
                    business_person_name: tenant.business_person_name,
                    email_id: tenant.email_id,
                    phone_number: tenant.phone_number,
                    gst_number: tenant.gst_number,
                    no_of_employees: tenant.no_of_employees,
                    no_of_users: tenant.no_of_users,
                    plan_id: tenant.plan_id,
                    plan_name: tenant.plan_name,
                    end_date: tenant.end_date,
                    active_status: newVal,
                    erp_server: tenant.erp_server,
                    erp_database: tenant.erp_database,
                    erp_user: tenant.erp_user,
                    erp_password: tenant.erp_password,
                    erp_port: tenant.erp_port
                }),
                credentials: "include"
            });
            if (res.ok) {
                // update local state
                setTenants(prev => prev.map(t => t.tenant_id === tenant.tenant_id ? { ...t, active_status: newVal, tenant_status: newVal } : t));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update tenant status.");
            }
        } catch {
            alert("Network error.");
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
        setEndDate("");
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
        setEndDate(t.end_date || "");
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
            setFormError("Company Code and Company Name are required.");
            return;
        }
        setFormBusy(true);
        try {
            const plan_name = planId === "free" ? "Free Plan" : planId === "pro" ? "Pro Plan" : "Max Plan";
            const res = await fetch(`${API}/admin/tenants/create/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
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
                    end_date: endDate,
                    erp_server: erpServer,
                    erp_database: erpDatabase,
                    erp_user: erpUser,
                    erp_password: erpPassword,
                    erp_port: erpPort,
                    admin_username: adminUser,
                    admin_password: adminPass
                }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok) {
                setShowCreateModal(false);
                fetchTenants();
            } else {
                setFormError(data.error || "Failed to create tenant.");
            }
        } catch {
            setFormError("Network error.");
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
            const res = await fetch(`${API}/admin/tenants/update/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
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
                    end_date: endDate,
                    active_status: editTenant.active_status,
                    erp_server: erpServer,
                    erp_database: erpDatabase,
                    erp_user: erpUser,
                    erp_password: erpPassword,
                    erp_port: erpPort
                }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok) {
                setShowEditModal(false);
                fetchTenants();
            } else {
                setFormError(data.error || "Failed to update tenant details.");
            }
        } catch {
            setFormError("Network error.");
        } finally {
            setFormBusy(false);
        }
    };

    // Delete Tenant
    const handleDeleteTenant = async (tenant) => {
        if (!confirm(`Are you sure you want to hard delete the tenant "${tenant.company_name}"? This deletes all associated signups, connection credentials, and user rights forever!`)) {
            return;
        }
        try {
            const res = await fetch(`${API}/admin/tenants/delete/${tenant.tenant_id}/`, {
                method: "DELETE",
                credentials: "include"
            });
            if (res.ok) {
                fetchTenants();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete tenant.");
            }
        } catch {
            alert("Network error.");
        }
    };

    // User Management Side Drawer
    const openUserDrawer = async (tenant) => {
        setDrawerCompany(tenant);
        setDrawerUsers([]);
        setShowUserDrawer(true);
        setLoadingUsers(true);
        try {
            const res = await fetch(`${API}/admin/tenants/${tenant.company_code}/users/`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
                setDrawerUsers(data.users || []);
            }
        } catch {
            /* fail quietly in side view */
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`Delete user "${user.username}"?`)) return;
        try {
            const res = await fetch(`${API}/admin/tenants/users/${user.id}/`, {
                method: "DELETE",
                credentials: "include"
            });
            if (res.ok) {
                // reload drawer users list
                if (drawerCompany) {
                    openUserDrawer(drawerCompany);
                }
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete user.");
            }
        } catch {
            alert("Network error.");
        }
    };

    // Filtering logic
    const filteredTenants = tenants.filter(t => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = !query || 
            t.company_name.toLowerCase().includes(query) || 
            t.company_code.toLowerCase().includes(query) || 
            t.business_person_name.toLowerCase().includes(query) ||
            t.email_id.toLowerCase().includes(query);

        const matchesStatus = statusFilter === "all" || 
            (statusFilter === "active" && t.active_status) || 
            (statusFilter === "inactive" && !t.active_status);

        const matchesPlan = planFilter === "all" || t.plan_id === planFilter;

        return matchesQuery && matchesStatus && matchesPlan;
    });

    // KPI Counters
    const totalTenantsCount = tenants.length;
    const activeCount = tenants.filter(t => t.active_status).length;
    const inactiveCount = totalTenantsCount - activeCount;
    const proCount = tenants.filter(t => t.plan_id === "pro").length;
    const maxCount = tenants.filter(t => t.plan_id === "max" || t.plan_id === "enterprise").length;
    const freeCount = tenants.filter(t => t.plan_id === "free" || !t.plan_id).length;

    if (authLoading) {
        return (
            <div className="ap-root" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 16, color: "#9ca3af" }}>Checking secure admin session...</div>
            </div>
        );
    }

    return (
        <div className="ap-root">
            <div className="ap-glow" />
            <div className="ap-glow-alt" />

            {!isAuthenticated ? (
                /* ── LOGIN SECTION ── */
                <div className="ap-login-overlay">
                    <div className="ap-login-card">
                        <div className="ap-login-logo">
                            <img src="/Images/logo.png" alt="Anims Logo" className="ap-login-logo-img" />
                        </div>
                        <h2 className="ap-login-title">Admin Controller</h2>
                        <p className="ap-login-subtitle">Enter your master admin account credentials</p>

                        <form onSubmit={handleLogin}>
                            {loginError && <div className="ap-error-alert">{loginError}</div>}

                            <div className="ap-field">
                                <label className="ap-label">Username</label>
                                <div className="ap-wrap">
                                    <input 
                                        type="text" 
                                        className="ap-input" 
                                        placeholder="admin"
                                        value={loginUsername}
                                        onChange={e => setLoginUsername(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="ap-field">
                                <label className="ap-label">Password</label>
                                <div className="ap-wrap">
                                    <input 
                                        type="password" 
                                        className="ap-input" 
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={e => setLoginPassword(e.target.value)}
                                        autoComplete="off"
                                    />
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
                    </div>
                </div>
            ) : (
                /* ── DASHBOARD SECTION ── */
                <>
                    <nav className="ap-nav">
                        <div className="ap-nav-logo">
                            <img src="/Images/logo.png" alt="Anims Logo" className="ap-nav-logo-img" />
                            <span className="ap-nav-logo-text">Anims ERP Admin Controller</span>
                        </div>
                        <button className="ap-logout-btn" onClick={handleLogout}>Logout Admin</button>
                    </nav>

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
                                <select 
                                    className="ap-filter-select"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="active">Active Tiers</option>
                                    <option value="inactive">Blocked / Inactive</option>
                                </select>
                                <select 
                                    className="ap-filter-select"
                                    value={planFilter}
                                    onChange={e => setPlanFilter(e.target.value)}
                                >
                                    <option value="all">All Plans</option>
                                    <option value="free">Free Tiers</option>
                                    <option value="pro">Pro Tiers</option>
                                    <option value="max">Max Tiers</option>
                                </select>
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
                                                <th className="ap-th">Renewal Date</th>
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
                                                        <span className={`ap-badge ${t.plan_id === 'free' ? 'ap-badge--free' : 'ap-badge--plan'}`}>
                                                            {t.plan_name || "Free"}
                                                        </span>
                                                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                                                            Limit: {t.no_of_users} User(s)
                                                        </div>
                                                    </td>
                                                    <td className="ap-td">
                                                        {t.end_date || "—"}
                                                    </td>
                                                    <td className="ap-td">
                                                        <label className="ap-switch">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={t.active_status}
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
                                                        <div className="ap-user-sub">{user.designation} • Created: {user.created_at}</div>
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

                                            <div className="ap-form-subtitle">Subscription & Rights Config</div>

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
                                                <label className="ap-label">End Date (Override)</label>
                                                <input 
                                                    type="date" 
                                                    className="ap-input" 
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                />
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

                                            <div className="ap-form-subtitle">Subscription Config</div>

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
                                                <label className="ap-label">End Date</label>
                                                <input 
                                                    type="date" 
                                                    className="ap-input" 
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                />
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
                </>
            )}
        </div>
    );
}
