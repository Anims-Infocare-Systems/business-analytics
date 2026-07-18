import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
    MdOutlineCalendarMonth, 
    MdBusiness, 
    MdPersonOutline, 
    MdOutlineAnalytics, 
    MdRefresh, 
    MdOutlineFileDownload,
    MdSearch,
    MdEventNote,
    MdChevronLeft,
    MdChevronRight,
    MdSwapVert,
    MdArrowUpward,
    MdArrowDownward
} from "react-icons/md";
import { FiArrowRight } from "react-icons/fi";
import { resolveApiBase } from "../../apiBase";
import { adminFetch } from "../../adminAuth";
import "./UserTransactionReport.css";

const API = resolveApiBase();

function CustomSelect({ label, value, onChange, options, icon: Icon, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value: "all" };

    return (
        <div className="utr-custom-select-container" ref={containerRef}>
            <button 
                type="button"
                className={`utr-custom-select-trigger ${isOpen ? "utr-custom-select-trigger--open" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="utr-trigger-left">
                    {Icon && <Icon className="utr-trigger-icon" size={16} />}
                    <span className="utr-trigger-text">{selectedOption.label}</span>
                </span>
                <span className={`utr-trigger-arrow ${isOpen ? "utr-trigger-arrow--open" : ""}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="utr-custom-options-dropdown">
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            className={`utr-custom-option ${opt.value === value ? "utr-custom-option--selected" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className="utr-option-label">{opt.label}</span>
                            {opt.value === value && (
                                <span className="utr-option-check">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CustomDateRangePicker({ fromDate, toDate, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const [tempFromDate, setTempFromDate] = useState(fromDate);
    const [tempToDate, setTempToDate] = useState(toDate);
    const [hoverDate, setHoverDate] = useState(null);

    const initialViewDate = toDate ? new Date(toDate) : new Date();
    const [viewMonth, setViewMonth] = useState(initialViewDate.getMonth());
    const [viewYear, setViewYear] = useState(initialViewDate.getFullYear());

    const getFormattedDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        if (isOpen) {
            setTempFromDate(fromDate);
            setTempToDate(toDate);
            setHoverDate(null);
            const viewDate = toDate ? new Date(toDate) : new Date();
            setViewMonth(viewDate.getMonth());
            setViewYear(viewDate.getFullYear());
        }
    }, [isOpen, fromDate, toDate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatDisplay = (fromStr, toStr) => {
        if (!fromStr || !toStr) return "Select date range";
        const fParts = fromStr.split("-");
        const tParts = toStr.split("-");
        return `${fParts[2]}/${fParts[1]}/${fParts[0]}  →  ${tParts[2]}/${tParts[1]}/${tParts[0]}`;
    };

    const applyPreset = (presetName) => {
        const todayObj = new Date();
        let from = new Date();
        let to = new Date();

        switch (presetName) {
            case "today":
                break;
            case "yesterday":
                from.setDate(todayObj.getDate() - 1);
                to.setDate(todayObj.getDate() - 1);
                break;
            case "last_7":
                from.setDate(todayObj.getDate() - 7);
                break;
            case "last_30":
                from.setDate(todayObj.getDate() - 30);
                break;
            case "this_month":
                from = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
                break;
            case "last_month":
                from = new Date(todayObj.getFullYear(), todayObj.getMonth() - 1, 1);
                to = new Date(todayObj.getFullYear(), todayObj.getMonth(), 0);
                break;
            default:
                break;
        }

        const fStr = getFormattedDate(from);
        const tStr = getFormattedDate(to);
        setTempFromDate(fStr);
        setTempToDate(tStr);
        onChange(fStr, tStr);
        setIsOpen(false);
    };

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
        const clickedDateObj = new Date(viewYear, viewMonth, dayNum);
        const clickedStr = getFormattedDate(clickedDateObj);

        if (!tempFromDate || (tempFromDate && tempToDate)) {
            setTempFromDate(clickedStr);
            setTempToDate(null);
            setHoverDate(null);
        } else if (tempFromDate && !tempToDate) {
            if (clickedStr < tempFromDate) {
                setTempFromDate(clickedStr);
            } else {
                setTempToDate(clickedStr);
                onChange(tempFromDate, clickedStr);
                setIsOpen(false);
            }
        }
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
        <div className="utr-date-range-picker-container" ref={containerRef}>
            <button 
                type="button" 
                className={`utr-date-picker-trigger ${isOpen ? "utr-date-picker-trigger--open" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="utr-trigger-left">
                    <MdOutlineCalendarMonth className="utr-trigger-icon" size={16} />
                    <span className="utr-trigger-text">{formatDisplay(fromDate, toDate)}</span>
                </span>
                <span className={`utr-trigger-arrow ${isOpen ? "utr-trigger-arrow--open" : ""}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="utr-date-picker-dropdown">
                    <div className="utr-picker-presets">
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("today")}>Today</button>
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("yesterday")}>Yesterday</button>
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("last_7")}>Last 7 Days</button>
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("last_30")}>Last 30 Days</button>
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("this_month")}>This Month</button>
                        <button type="button" className="utr-preset-btn" onClick={() => applyPreset("last_month")}>Last Month</button>
                    </div>

                    <div className="utr-picker-calendar">
                        <div className="utr-calendar-header">
                            <button type="button" className="utr-calendar-nav-btn" onClick={handlePrevMonth}>
                                <MdChevronLeft size={18} />
                            </button>
                            <span className="utr-calendar-month-year">
                                {monthNames[viewMonth]} {viewYear}
                            </span>
                            <button type="button" className="utr-calendar-nav-btn" onClick={handleNextMonth}>
                                <MdChevronRight size={18} />
                            </button>
                        </div>

                        <div className="utr-calendar-weekdays">
                            {dayNames.map(day => (
                                <span key={day} className="utr-calendar-weekday">{day}</span>
                            ))}
                        </div>

                        <div className="utr-calendar-grid">
                            {calendarCells.map(cell => {
                                if (!cell.isCurrentMonth) {
                                    return (
                                        <span key={cell.key} className="utr-calendar-day utr-calendar-day--disabled">
                                            {cell.dayNum}
                                        </span>
                                    );
                                }

                                const cellDateObj = new Date(viewYear, viewMonth, cell.dayNum);
                                const cellStr = getFormattedDate(cellDateObj);

                                const isFrom = tempFromDate === cellStr;
                                const isTo = tempToDate === cellStr;
                                
                                let isInRange = false;
                                if (tempFromDate && tempToDate) {
                                    isInRange = cellStr > tempFromDate && cellStr < tempToDate;
                                }

                                let isHoverInRange = false;
                                if (tempFromDate && !tempToDate && hoverDate) {
                                    isHoverInRange = cellStr > tempFromDate && cellStr <= hoverDate;
                                }

                                return (
                                    <button
                                        type="button"
                                        key={cell.key}
                                        className={`utr-calendar-day 
                                            ${isFrom ? "utr-calendar-day--from" : ""} 
                                            ${isTo ? "utr-calendar-day--to" : ""} 
                                            ${isInRange ? "utr-calendar-day--in-range" : ""}
                                            ${isHoverInRange ? "utr-calendar-day--hover-range" : ""}
                                        `}
                                        onClick={() => handleDayClick(cell.dayNum)}
                                        onMouseEnter={() => {
                                            if (tempFromDate && !tempToDate) {
                                                setHoverDate(cellStr);
                                            }
                                        }}
                                    >
                                        <span className="utr-day-number">{cell.dayNum}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UserTransactionReport({ onAuthLost }) {
    // Dates defaults: from 30 days ago to today
    const getFormattedDate = (d) => d.toISOString().split("T")[0];
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [fromDate, setFromDate] = useState(getFormattedDate(thirtyDaysAgo));
    const [toDate, setToDate] = useState(getFormattedDate(today));
    const [selectedCompany, setSelectedCompany] = useState("all");
    const [selectedUser, setSelectedUser] = useState("all");
    const [selectedModule, setSelectedModule] = useState("all");
    const [reportType, setReportType] = useState("date_wise"); // date_wise | user_wise

    // Loaded dropdown items
    const [companies, setCompanies] = useState([]);
    const [usernames, setUsernames] = useState([]);
    const [modules, setModules] = useState([]);

    // Data table
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

    const handleResetFilters = () => {
        const todayObj = new Date();
        const thirtyDaysAgoObj = new Date();
        thirtyDaysAgoObj.setDate(todayObj.getDate() - 30);
        setFromDate(getFormattedDate(thirtyDaysAgoObj));
        setToDate(getFormattedDate(todayObj));
        setSelectedCompany("all");
        setSelectedUser("all");
        setSelectedModule("all");
        setReportType("date_wise");
        setSearchQuery("");
        setSortConfig({ key: "timestamp", direction: "desc" });
    };

    const requestSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <MdSwapVert className="utr-sort-icon utr-sort-icon--unsorted" size={14} />;
        }
        return sortConfig.direction === "asc" 
            ? <MdArrowUpward className="utr-sort-icon utr-sort-icon--active" size={14} />
            : <MdArrowDownward className="utr-sort-icon utr-sort-icon--active" size={14} />;
    };

    const fetchReport = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setErrorMsg("");
        }

        try {
            const res = await adminFetch(`${API}/admin/reports/user-transactions/`);
            const data = await res.json();

            if (res.ok) {
                setTransactions(data.transactions || []);
                setCompanies(data.companies || []);
                setUsernames(data.usernames || []);
                setModules(data.modules || []);
            } else {
                const authLost = res.status === 403 && data?.code === "admin_auth_required";
                if (authLost && onAuthLost) {
                    onAuthLost(data.error || "Session expired.");
                } else {
                    setErrorMsg(data.error || "Failed to load transaction reports.");
                }
            }
        } catch {
            setErrorMsg("Network error. Could not connect to API.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [onAuthLost]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Local filter / search matching & sorting (Front alone)
    const filteredTransactions = useMemo(() => {
        let list = transactions.filter(t => {
            // 1. Date Range
            const rowDate = t.timestamp ? t.timestamp.split("T")[0] : "";
            if (fromDate && rowDate < fromDate) return false;
            if (toDate && rowDate > toDate) return false;

            // 2. Company code (case-insensitive)
            if (selectedCompany !== "all" && (t.company_code || "").toUpperCase() !== selectedCompany.toUpperCase()) return false;

            // 3. Username (case-insensitive)
            if (selectedUser !== "all" && (t.username || "").toLowerCase() !== selectedUser.toLowerCase()) return false;

            // 4. Module name (case-insensitive)
            if (selectedModule !== "all" && (t.module_name || "").toLowerCase() !== selectedModule.toLowerCase()) return false;

            // 5. Search query text
            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                const matches = 
                    t.username.toLowerCase().includes(q) || 
                    t.module_name.toLowerCase().includes(q) || 
                    t.company_name.toLowerCase().includes(q) || 
                    t.company_code.toLowerCase().includes(q);
                if (!matches) return false;
            }

            return true;
        });

        // 6. Sorting based on sortConfig
        if (sortConfig.key) {
            list.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (sortConfig.key === "timestamp") {
                    const timeA = valA ? new Date(valA).getTime() : 0;
                    const timeB = valB ? new Date(valB).getTime() : 0;
                    return sortConfig.direction === "asc" ? timeA - timeB : timeB - timeA;
                }

                valA = String(valA || "").toLowerCase().trim();
                valB = String(valB || "").toLowerCase().trim();

                if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
                if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        return list;
    }, [transactions, fromDate, toDate, selectedCompany, selectedUser, selectedModule, searchQuery, sortConfig]);

    // Derived Stats (based on filtered transactions)
    const stats = useMemo(() => {
        const total = filteredTransactions.length;
        const uniqueUsers = new Set(filteredTransactions.map(t => (t.username || "").toLowerCase().trim())).size;
        
        // Find most active module
        const moduleCounts = {};
        filteredTransactions.forEach(t => {
            moduleCounts[t.module_name] = (moduleCounts[t.module_name] || 0) + 1;
        });
        let topModule = "—";
        let maxCount = 0;
        Object.entries(moduleCounts).forEach(([mod, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topModule = mod;
            }
        });

        const activeCompanies = new Set(filteredTransactions.map(t => (t.company_code || "").toUpperCase().trim())).size;

        return { total, uniqueUsers, topModule, activeCompanies };
    }, [filteredTransactions]);

    // Custom select dropdown options
    const companyOptions = useMemo(() => {
        return [
            { label: "All Organizations", value: "all" },
            ...companies.map(c => ({
                label: `${c.company_name} (${c.company_code})`,
                value: c.company_code
            }))
        ];
    }, [companies]);

    const userOptions = useMemo(() => {
        return [
            { label: "All Users", value: "all" },
            ...usernames.map(u => ({ label: u, value: u }))
        ];
    }, [usernames]);

    const moduleOptions = useMemo(() => {
        return [
            { label: "All Modules", value: "all" },
            ...modules.map(m => ({ label: m, value: m }))
        ];
    }, [modules]);

    // Local helper to format UTC ISO string to browser local timezone
    const formatLocalTime = (isoString) => {
        if (!isoString) return { date: "—", time: "—" };
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return { date: "—", time: "—" };
            const dateStr = d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
            const timeStr = d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            });
            return { date: dateStr, time: timeStr };
        } catch {
            return { date: "—", time: "—" };
        }
    };

    // Export to CSV
    const exportCSV = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ["#", "Date", "Time", "User Name", "Module Name", "Organization Code", "Organization Name", "Database Name"];
        const rows = filteredTransactions.map((t, idx) => {
            const { date, time } = formatLocalTime(t.timestamp);
            return [
                idx + 1,
                date,
                time,
                t.username,
                t.module_name,
                t.company_code,
                t.company_name,
                t.erp_database
            ];
        });

        const csvText = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `User_Transaction_Report_${reportType}_${fromDate}_to_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="utr-container">
            {/* Header section */}
            <div className="utr-header">
                <div>
                    <h2 className="utr-title">User Transaction Report</h2>
                    <p className="utr-subtitle">Monitor report usage and analytics across tenant organizations</p>
                </div>
                <div className="utr-header-actions">
                    <button className="utr-btn-icon" onClick={() => fetchReport()} title="Refresh Report Data">
                        <MdRefresh size={18} />
                        <span>Refresh</span>
                    </button>
                    <button 
                        className="utr-btn-icon utr-btn-icon--export" 
                        onClick={exportCSV} 
                        disabled={filteredTransactions.length === 0}
                        title="Export to CSV"
                    >
                        <MdOutlineFileDownload size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* KPI cards grid */}
            <div className="utr-stats-grid">
                <div className="utr-stat-card">
                    <span className="utr-stat-icon utr-stat-icon--total"><MdOutlineAnalytics size={20} /></span>
                    <div>
                        <h4 className="utr-stat-value">{stats.total}</h4>
                        <p className="utr-stat-label">Total Transactions</p>
                    </div>
                </div>
                <div className="utr-stat-card">
                    <span className="utr-stat-icon utr-stat-icon--users"><MdPersonOutline size={20} /></span>
                    <div>
                        <h4 className="utr-stat-value">{stats.uniqueUsers}</h4>
                        <p className="utr-stat-label">Active Users</p>
                    </div>
                </div>
                <div className="utr-stat-card">
                    <span className="utr-stat-icon utr-stat-icon--companies"><MdBusiness size={20} /></span>
                    <div>
                        <h4 className="utr-stat-value">{stats.activeCompanies}</h4>
                        <p className="utr-stat-label">Active Organizations</p>
                    </div>
                </div>
                <div className="utr-stat-card">
                    <span className="utr-stat-icon utr-stat-icon--module"><MdEventNote size={20} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 className="utr-stat-value utr-stat-value--text" title={stats.topModule}>{stats.topModule}</h4>
                        <p className="utr-stat-label">Most Visited Module</p>
                    </div>
                </div>
            </div>

            {/* Filters panel */}
            <div className="utr-filters-panel">
                {/* Date range picker wrapped in a single gorgeous input-group */}
                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdOutlineCalendarMonth size={15} /> Date Range</label>
                    <CustomDateRangePicker 
                        fromDate={fromDate}
                        toDate={toDate}
                        onChange={(from, to) => {
                            setFromDate(from);
                            setToDate(to);
                        }}
                    />
                </div>

                {/* Company filter */}
                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdBusiness size={15} /> Organization</label>
                    <CustomSelect 
                        value={selectedCompany}
                        onChange={setSelectedCompany}
                        options={companyOptions}
                        icon={MdBusiness}
                        placeholder="All Organizations"
                    />
                </div>

                {/* User filter */}
                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdPersonOutline size={15} /> User Name</label>
                    <CustomSelect 
                        value={selectedUser}
                        onChange={setSelectedUser}
                        options={userOptions}
                        icon={MdPersonOutline}
                        placeholder="All Users"
                    />
                </div>

                {/* Module filter */}
                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdEventNote size={15} /> Module Name</label>
                    <CustomSelect 
                        value={selectedModule}
                        onChange={setSelectedModule}
                        options={moduleOptions}
                        icon={MdEventNote}
                        placeholder="All Modules"
                    />
                </div>

                {/* Report Type filter */}
                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdOutlineAnalytics size={15} /> Report Type</label>
                    <div className="utr-segmented-control">
                        <button 
                            className={`utr-segment-btn ${sortConfig.key === "timestamp" ? "utr-segment-btn--active" : ""}`}
                            onClick={() => {
                                setReportType("date_wise");
                                setSortConfig({ key: "timestamp", direction: "desc" });
                            }}
                        >
                            Date Wise
                        </button>
                        <button 
                            className={`utr-segment-btn ${sortConfig.key === "username" ? "utr-segment-btn--active" : ""}`}
                            onClick={() => {
                                setReportType("user_wise");
                                setSortConfig({ key: "username", direction: "asc" });
                            }}
                        >
                            User Wise
                        </button>
                    </div>
                </div>

                {/* Reset button */}
                <div className="utr-filter-group utr-filter-group--reset">
                    <label className="utr-filter-label" style={{ opacity: 0, pointerEvents: "none" }}>Reset</label>
                    <button 
                        type="button" 
                        className="utr-reset-btn"
                        onClick={handleResetFilters}
                        title="Reset all filters"
                    >
                        <MdRefresh className="utr-reset-icon" size={16} />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Search and Table section */}
            <div className="utr-table-section">
                <div className="utr-table-header">
                    <h3 className="utr-table-title">Transaction Details</h3>
                    <div className="utr-search-wrap">
                        <MdSearch className="utr-search-icon" size={18} />
                        <input 
                            type="text" 
                            className="utr-search-input" 
                            placeholder="Search transactions..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Data */}
                {loading ? (
                    <div className="utr-loading-container">
                        <div className="utr-spinner"></div>
                        <p>Querying transaction records...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="utr-error-alert">{errorMsg}</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="utr-empty-container">
                        <p>No transaction logs match the filter criteria.</p>
                    </div>
                ) : (
                    <div className="utr-table-wrapper">
                        <table className="utr-table">
                            <thead>
                                <tr>
                                    <th className="utr-th utr-th--index">#</th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("timestamp")}>
                                        <div className="utr-th-content">
                                            <span>Date</span>
                                            {renderSortIcon("timestamp")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("timestamp")}>
                                        <div className="utr-th-content">
                                            <span>Time</span>
                                            {renderSortIcon("timestamp")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("username")}>
                                        <div className="utr-th-content">
                                            <span>User Name</span>
                                            {renderSortIcon("username")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("module_name")}>
                                        <div className="utr-th-content">
                                            <span>Module Name</span>
                                            {renderSortIcon("module_name")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("company_name")}>
                                        <div className="utr-th-content">
                                            <span>Organization</span>
                                            {renderSortIcon("company_name")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("company_code")}>
                                        <div className="utr-th-content">
                                            <span>Organization Code</span>
                                            {renderSortIcon("company_code")}
                                        </div>
                                    </th>
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("erp_database")}>
                                        <div className="utr-th-content">
                                            <span>Database Name</span>
                                            {renderSortIcon("erp_database")}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t, index) => {
                                    const { date, time } = formatLocalTime(t.timestamp);
                                    return (
                                        <tr className="utr-tr" key={t.id} style={{ "--idx": index % 10 }}>
                                            <td className="utr-td utr-td--index">{index + 1}</td>
                                            <td className="utr-td utr-td--date">{date}</td>
                                            <td className="utr-td utr-td--time">{time}</td>
                                            <td className="utr-td utr-td--username">
                                                <span className="utr-username-badge">{t.username}</span>
                                            </td>
                                            <td className="utr-td utr-td--module">{t.module_name}</td>
                                            <td className="utr-td utr-td--company">{t.company_name}</td>
                                            <td className="utr-td utr-td--code">{t.company_code}</td>
                                            <td className="utr-td utr-td--database">{t.erp_database}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
