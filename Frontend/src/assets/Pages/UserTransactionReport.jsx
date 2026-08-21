import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
    MdArrowDownward,
    MdPieChart,
    MdListAlt,
    MdLeaderboard,
    MdClose,
    MdFolderSpecial,
    MdWorkspacePremium
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

function MultiSelectOrganization({ selectedValues, onChange, options, icon: Icon }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(opt => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
    }, [options, searchQuery]);

    const isAllSelected = selectedValues.length === 0 || selectedValues.includes("all");

    const handleToggleOption = (val) => {
        if (val === "all") {
            onChange(["all"]);
            return;
        }

        let newSelected = isAllSelected ? [] : [...selectedValues];
        if (newSelected.includes(val)) {
            newSelected = newSelected.filter(v => v !== val);
        } else {
            newSelected.push(val);
        }

        const realOptions = options.filter(o => o.value !== "all");
        if (newSelected.length === 0 || newSelected.length === realOptions.length) {
            onChange(["all"]);
        } else {
            onChange(newSelected);
        }
    };

    const handleSelectAll = () => {
        onChange(["all"]);
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const getTriggerText = () => {
        if (isAllSelected) return "All Organizations";
        if (selectedValues.length === 1) {
            const opt = options.find(o => o.value === selectedValues[0]);
            return opt ? opt.label : selectedValues[0];
        }
        return `${selectedValues.length} Organizations Selected`;
    };

    return (
        <div className="utr-custom-select-container utr-multi-select-container" ref={containerRef}>
            <button 
                type="button"
                className={`utr-custom-select-trigger ${isOpen ? "utr-custom-select-trigger--open" : ""} ${!isAllSelected ? "utr-custom-select-trigger--active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="utr-trigger-left">
                    {Icon && <Icon className="utr-trigger-icon" size={16} />}
                    <span className="utr-trigger-text">{getTriggerText()}</span>
                </span>
                {!isAllSelected && (
                    <span className="utr-multi-count-badge">{selectedValues.length}</span>
                )}
                <span className={`utr-trigger-arrow ${isOpen ? "utr-trigger-arrow--open" : ""}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="utr-custom-options-dropdown utr-multi-select-dropdown">
                    <div className="utr-multi-header">
                        <div className="utr-multi-search-wrap">
                            <MdSearch className="utr-multi-search-icon" size={15} />
                            <input
                                type="text"
                                className="utr-multi-search-input"
                                placeholder="Search organization…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchQuery && (
                                <button 
                                    type="button" 
                                    className="utr-multi-search-clear" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchQuery("");
                                    }}
                                    title="Clear search"
                                >
                                    <MdClose size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="utr-multi-options-list">
                        <div 
                            className={`utr-custom-option utr-multi-option ${isAllSelected ? "utr-custom-option--selected" : ""}`}
                            onClick={() => handleToggleOption("all")}
                        >
                            <div className="utr-multi-checkbox-wrap">
                                <input 
                                    type="checkbox" 
                                    className="utr-multi-checkbox" 
                                    checked={isAllSelected}
                                    onChange={() => {}}
                                />
                            </div>
                            <span className="utr-option-label" style={{ fontWeight: 700 }}>All Organizations</span>
                        </div>

                        {filteredOptions.filter(o => o.value !== "all").map((opt) => {
                            const checked = !isAllSelected && selectedValues.includes(opt.value);
                            return (
                                <div 
                                    key={opt.value}
                                    className={`utr-custom-option utr-multi-option ${checked ? "utr-custom-option--selected" : ""}`}
                                    onClick={() => handleToggleOption(opt.value)}
                                >
                                    <div className="utr-multi-checkbox-wrap">
                                        <input 
                                            type="checkbox" 
                                            className="utr-multi-checkbox" 
                                            checked={checked}
                                            onChange={() => {}}
                                        />
                                    </div>
                                    <span className="utr-option-label">{opt.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomPlanDropdown({ value, onChange, options }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value.toLowerCase() === value.toLowerCase()) || options[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="utr-plan-select-container" ref={containerRef}>
            <button 
                type="button"
                className={`utr-plan-select-trigger ${isOpen ? "utr-plan-select-trigger--open" : ""} ${value !== "all" ? "utr-plan-select-trigger--active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="utr-plan-select-val-wrap">
                    <span className="utr-plan-select-text">{selectedOption ? selectedOption.label : "All Plans"}</span>
                    <span className="utr-plan-select-count">{selectedOption ? selectedOption.count : 0}</span>
                </div>
                <span className={`utr-select-arrow ${isOpen ? "utr-select-arrow--open" : ""}`}>▾</span>
            </button>

            {isOpen && (
                <div className="utr-plan-select-dropdown">
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            className={`utr-plan-option ${opt.value.toLowerCase() === value.toLowerCase() ? "utr-plan-option--selected" : ""}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            <span>{opt.label}</span>
                            <span className="utr-plan-option-badge">{opt.count}</span>
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
    const getLocalFormattedDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const todayObj = new Date();
    const firstDayOfCurrentMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);

    const [fromDate, setFromDate] = useState(getLocalFormattedDate(firstDayOfCurrentMonth));
    const [toDate, setToDate] = useState(getLocalFormattedDate(todayObj));
    const [selectedCompanies, setSelectedCompanies] = useState(["all"]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [selectedModule, setSelectedModule] = useState("all");
    const [selectedSeries, setSelectedSeries] = useState("all");
    const [selectedPlan, setSelectedPlan] = useState("all");
    const [reportType, setReportType] = useState("date_wise");
    const [viewMode, setViewMode] = useState("detailed");
    const [selectedOrgModal, setSelectedOrgModal] = useState(null);
    const [selectedUserModal, setSelectedUserModal] = useState(null);

    const [companies, setCompanies] = useState([]);
    const [usernames, setUsernames] = useState([]);
    const [modules, setModules] = useState([]);

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

    const handleResetFilters = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(getLocalFormattedDate(startOfMonth));
        setToDate(getLocalFormattedDate(now));
        setSelectedCompanies(["all"]);
        setSelectedUser("all");
        setSelectedModule("all");
        setSelectedSeries("all");
        setSelectedPlan("all");
        setReportType("date_wise");
        setViewMode("detailed");
        setSelectedOrgModal(null);
        setSelectedUserModal(null);
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

    const baseFilteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const rowDate = t.timestamp ? t.timestamp.split("T")[0] : "";
            if (fromDate && rowDate < fromDate) return false;
            if (toDate && rowDate > toDate) return false;

            if (selectedCompanies.length > 0 && !selectedCompanies.includes("all")) {
                const cUpper = (t.company_code || "").toUpperCase().trim();
                const matchesComp = selectedCompanies.some(sc => sc.toUpperCase().trim() === cUpper);
                if (!matchesComp) return false;
            }

            if (selectedUser !== "all" && (t.username || "").toLowerCase().trim() !== selectedUser.toLowerCase().trim()) return false;
            if (selectedModule !== "all" && (t.module_name || "").toLowerCase().trim() !== selectedModule.toLowerCase().trim()) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                const matches = 
                    (t.username || "").toLowerCase().includes(q) || 
                    (t.module_name || "").toLowerCase().includes(q) || 
                    (t.company_name || "").toLowerCase().includes(q) || 
                    (t.company_code || "").toLowerCase().includes(q) ||
                    (t.plan_name || "").toLowerCase().includes(q);
                if (!matches) return false;
            }

            return true;
        });
    }, [transactions, fromDate, toDate, selectedCompanies, selectedUser, selectedModule, searchQuery]);

    const filteredTransactions = useMemo(() => {
        let list = baseFilteredTransactions.filter(t => {
            if (selectedSeries !== "all") {
                const codeUpper = (t.company_code || "").toUpperCase().trim();
                if (!codeUpper.startsWith(selectedSeries)) return false;
            }
            if (selectedPlan !== "all") {
                const planVal = (t.plan_name || "—").trim().toLowerCase();
                if (planVal !== selectedPlan.toLowerCase()) return false;
            }
            return true;
        });

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
    }, [baseFilteredTransactions, selectedSeries, selectedPlan, sortConfig]);

    const stats = useMemo(() => {
        const total = filteredTransactions.length;
        const uniqueUsers = new Set(
            filteredTransactions.map(t => (t.username || "").toLowerCase().trim()).filter(Boolean)
        ).size;
        
        const moduleCounts = {};
        filteredTransactions.forEach(t => {
            const modName = (t.module_name || "").trim();
            if (modName) {
                moduleCounts[modName] = (moduleCounts[modName] || 0) + 1;
            }
        });
        let topModule = "—";
        let maxCount = 0;
        Object.entries(moduleCounts).forEach(([mod, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topModule = mod;
            }
        });

        const activeCompanies = new Set(
            filteredTransactions.map(t => (t.company_code || "").toUpperCase().trim()).filter(Boolean)
        ).size;

        return { total, uniqueUsers, topModule, activeCompanies };
    }, [filteredTransactions]);

    const companySummaryList = useMemo(() => {
        const groupMap = {};
        const totalTxCount = filteredTransactions.length;

        filteredTransactions.forEach(t => {
            const code = (t.company_code || "UNKNOWN").toUpperCase().trim();
            if (!groupMap[code]) {
                groupMap[code] = {
                    company_code: code,
                    company_name: t.company_name || code,
                    plan_name: t.plan_name || "—",
                    count: 0,
                    users: new Set(),
                    modules: {}
                };
            }
            groupMap[code].count += 1;
            if (t.username) groupMap[code].users.add((t.username || "").toLowerCase().trim());
            if (t.module_name) {
                const m = (t.module_name || "").trim();
                if (m) groupMap[code].modules[m] = (groupMap[code].modules[m] || 0) + 1;
            }
        });

        const list = Object.values(groupMap).map(g => {
            let topMod = "—";
            let maxM = 0;
            Object.entries(g.modules).forEach(([m, cnt]) => {
                if (cnt > maxM) {
                    maxM = cnt;
                    topMod = m;
                }
            });

            const pctVal = totalTxCount > 0 ? ((g.count / totalTxCount) * 100).toFixed(1) : "0.0";

            return {
                company_code: g.company_code,
                company_name: g.company_name,
                plan_name: g.plan_name,
                count: g.count,
                active_users_count: g.users.size,
                top_module: topMod,
                percentage: parseFloat(pctVal)
            };
        });

        list.sort((a, b) => b.count - a.count);
        return list;
    }, [filteredTransactions]);

    const filteredSummaryList = useMemo(() => {
        if (!searchQuery) return companySummaryList;
        const q = searchQuery.toLowerCase().trim();
        return companySummaryList.filter(s => 
            s.company_name.toLowerCase().includes(q) || 
            s.company_code.toLowerCase().includes(q) ||
            s.plan_name.toLowerCase().includes(q)
        );
    }, [companySummaryList, searchQuery]);

    const orgUserRankingList = useMemo(() => {
        if (!selectedOrgModal) return [];

        const companyCode = selectedOrgModal.company_code;
        const companyTxLogs = filteredTransactions.filter(t => 
            (t.company_code || "").toUpperCase().trim() === companyCode.toUpperCase().trim()
        );

        const totalOrgTx = companyTxLogs.length;
        const userMap = {};

        companyTxLogs.forEach(t => {
            const u = (t.username || "Unknown").trim();
            if (!userMap[u]) {
                userMap[u] = {
                    username: u,
                    count: 0,
                    modules: {},
                    lastTimestamp: t.timestamp
                };
            }
            userMap[u].count += 1;
            if (t.timestamp && (!userMap[u].lastTimestamp || t.timestamp > userMap[u].lastTimestamp)) {
                userMap[u].lastTimestamp = t.timestamp;
            }
            if (t.module_name) {
                const m = t.module_name.trim();
                if (m) userMap[u].modules[m] = (userMap[u].modules[m] || 0) + 1;
            }
        });

        const list = Object.values(userMap).map(u => {
            let topMod = "—";
            let maxM = 0;
            Object.entries(u.modules).forEach(([m, cnt]) => {
                if (cnt > maxM) {
                    maxM = cnt;
                    topMod = m;
                }
            });

            const pctVal = totalOrgTx > 0 ? ((u.count / totalOrgTx) * 100).toFixed(1) : "0.0";

            return {
                username: u.username,
                count: u.count,
                percentage: parseFloat(pctVal),
                top_module: topMod,
                last_timestamp: u.lastTimestamp
            };
        });

        list.sort((a, b) => b.count - a.count);
        return list;
    }, [selectedOrgModal, filteredTransactions]);

    const userModuleRankingList = useMemo(() => {
        if (!selectedOrgModal || !selectedUserModal) return [];

        const companyCode = selectedOrgModal.company_code;
        const userName = selectedUserModal.username;

        const userTxLogs = filteredTransactions.filter(t => 
            (t.company_code || "").toUpperCase().trim() === companyCode.toUpperCase().trim() &&
            (t.username || "").toLowerCase().trim() === userName.toLowerCase().trim()
        );

        const totalUserTx = userTxLogs.length;
        const moduleMap = {};

        userTxLogs.forEach(t => {
            const m = (t.module_name || "General").trim();
            if (!moduleMap[m]) {
                moduleMap[m] = {
                    module_name: m,
                    count: 0,
                    lastTimestamp: t.timestamp
                };
            }
            moduleMap[m].count += 1;
            if (t.timestamp && (!moduleMap[m].lastTimestamp || t.timestamp > moduleMap[m].lastTimestamp)) {
                moduleMap[m].lastTimestamp = t.timestamp;
            }
        });

        const list = Object.values(moduleMap).map(m => {
            const pctVal = totalUserTx > 0 ? ((m.count / totalUserTx) * 100).toFixed(1) : "0.0";
            return {
                module_name: m.module_name,
                count: m.count,
                percentage: parseFloat(pctVal),
                last_timestamp: m.lastTimestamp
            };
        });

        list.sort((a, b) => b.count - a.count);
        return list;
    }, [selectedOrgModal, selectedUserModal, filteredTransactions]);

    const handleSeriesChange = (seriesVal) => {
        setSelectedSeries(seriesVal);
        setSelectedPlan("all");
        if (seriesVal !== "all" && selectedCompanies.length > 0 && !selectedCompanies.includes("all")) {
            const invalidSelected = selectedCompanies.filter(sc => !sc.toUpperCase().trim().startsWith(seriesVal));
            if (invalidSelected.length > 0) {
                setSelectedCompanies(["all"]);
            }
        }
    };

    const companyOptions = useMemo(() => {
        let filteredCompanies = companies;
        if (selectedSeries !== "all") {
            filteredCompanies = companies.filter(c => 
                (c.company_code || "").toUpperCase().trim().startsWith(selectedSeries)
            );
        }

        const sortedCompanies = [...filteredCompanies].sort((a, b) => {
            const codeA = (a.company_code || "").toUpperCase().trim();
            const codeB = (b.company_code || "").toUpperCase().trim();
            return codeA.localeCompare(codeB);
        });

        return [
            { label: "All Organizations", value: "all" },
            ...sortedCompanies.map(c => ({
                label: `${c.company_code} - ${c.company_name}`,
                value: c.company_code
            }))
        ];
    }, [companies, selectedSeries]);

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

    const seriesOptions = useMemo(() => {
        return [
            { label: "All Series", value: "all" },
            { label: "Client Details (A)", value: "A" },
            { label: "Testing Details (T)", value: "T" },
            { label: "Demo Details (D)", value: "D" },
            { label: "Programming Details (P)", value: "P" },
        ];
    }, []);

    const planOptions = useMemo(() => {
        const planCounts = {};
        baseFilteredTransactions.forEach(t => {
            if (selectedSeries !== "all") {
                const codeUpper = (t.company_code || "").toUpperCase().trim();
                if (!codeUpper.startsWith(selectedSeries)) return;
            }
            const p = (t.plan_name || "—").trim();
            if (p) {
                planCounts[p] = (planCounts[p] || 0) + 1;
            }
        });

        const options = [
            { label: "All Plans", value: "all", count: Object.values(planCounts).reduce((a, b) => a + b, 0) }
        ];

        Object.keys(planCounts).sort().forEach(p => {
            options.push({
                label: p,
                value: p,
                count: planCounts[p]
            });
        });

        return options;
    }, [baseFilteredTransactions, selectedSeries]);

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

    const exportCSV = () => {
        let headers = [];
        let rows = [];
        let filenameSuffix = viewMode;

        if (viewMode === "summary") {
            if (filteredSummaryList.length === 0) return;
            headers = ["Rank", "Organization Name", "Organization Code", "Plan Name", "Transactions", "Usage Share (%)", "Active Users", "Most Visited Module"];
            rows = filteredSummaryList.map((item, idx) => [
                idx + 1,
                item.company_name,
                item.company_code,
                item.plan_name,
                item.count,
                `${item.percentage}%`,
                item.active_users_count,
                item.top_module
            ]);
        } else {
            if (filteredTransactions.length === 0) return;
            headers = ["#", "Date", "Time", "User Name", "Module Name", "Organization Name", "Plan Name", "Organization Code", "Database Name"];
            rows = filteredTransactions.map((t, idx) => {
                const { date, time } = formatLocalTime(t.timestamp);
                return [
                    idx + 1,
                    date,
                    time,
                    t.username,
                    t.module_name,
                    t.company_name,
                    t.plan_name || "—",
                    t.company_code,
                    t.erp_database
                ];
            });
        }

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${String(val ?? "").replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        // Prefix UTF-8 Byte Order Mark (\uFEFF) so Excel opens CSV cleanly formatted
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `User_Transaction_Report_${filenameSuffix}_${fromDate}_to_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="utr-container">
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

            <div className="utr-filters-panel">
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

                <div className="utr-filter-group">
                    <label className="utr-filter-label"><MdBusiness size={15} /> Organization</label>
                    <MultiSelectOrganization 
                        selectedValues={selectedCompanies}
                        onChange={setSelectedCompanies}
                        options={companyOptions}
                        icon={MdBusiness}
                    />
                </div>

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

            {/* Series & Plan Filter Section */}
            <div className="utr-series-plan-container">
                <div className="utr-filter-bar-group utr-filter-bar-group--series">
                    <span className="utr-series-label">
                        <MdFolderSpecial size={15} />
                        <span>Series Filter:</span>
                    </span>
                    <div className="utr-pills-row">
                        {seriesOptions.map(opt => {
                            const isSelected = selectedSeries === opt.value;
                            const count = opt.value === "all"
                                ? baseFilteredTransactions.length
                                : baseFilteredTransactions.filter(t => (t.company_code || "").toUpperCase().trim().startsWith(opt.value)).length;

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`utr-series-pill ${isSelected ? "utr-series-pill--active" : ""}`}
                                    onClick={() => handleSeriesChange(opt.value)}
                                >
                                    <span>{opt.label}</span>
                                    <span className="utr-series-pill-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="utr-series-plan-divider"></div>

                <div className="utr-filter-bar-group utr-filter-bar-group--plan">
                    <span className="utr-series-label utr-series-label--plan">
                        <MdWorkspacePremium size={15} />
                        <span>Plan Filter:</span>
                    </span>
                    <CustomPlanDropdown 
                        value={selectedPlan}
                        onChange={setSelectedPlan}
                        options={planOptions}
                    />
                </div>
            </div>

            <div className="utr-table-section">
                <div className="utr-table-header">
                    <h3 className="utr-table-title">
                        {viewMode === "detailed" ? "Transaction Details" : "Organization Usage & Ranking Summary"}
                    </h3>
                    <div className="utr-table-actions">
                        <div className="utr-search-wrap">
                            <MdSearch className="utr-search-icon" size={18} />
                            <input 
                                type="text" 
                                className="utr-search-input" 
                                placeholder={viewMode === "detailed" ? "Search transactions..." : "Search summary..."} 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            type="button" 
                            className={`utr-btn-summary ${viewMode === "summary" ? "utr-btn-summary--active" : ""}`}
                            onClick={() => setViewMode(v => v === "detailed" ? "summary" : "detailed")}
                            title={viewMode === "detailed" ? "Switch to Organization Ranking & Usage Summary" : "Switch to Detailed Transactions List"}
                        >
                            {viewMode === "summary" ? <MdListAlt size={16} /> : <MdPieChart size={16} />}
                            <span>{viewMode === "summary" ? "Detailed View" : "Summary"}</span>
                        </button>
                    </div>
                </div>

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
                ) : viewMode === "summary" ? (
                    <div className="utr-table-wrapper">
                        <table className="utr-table">
                            <thead>
                                <tr>
                                    <th className="utr-th utr-th--index" style={{ textAlign: "center" }}>Rank</th>
                                    <th className="utr-th">Organization</th>
                                    <th className="utr-th">Plan Name</th>
                                    <th className="utr-th" style={{ textAlign: "center" }}>Transactions</th>
                                    <th className="utr-th" style={{ width: "220px" }}>Usage Share (%)</th>
                                    <th className="utr-th" style={{ textAlign: "center" }}>Active Users</th>
                                    <th className="utr-th">Most Visited Module</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSummaryList.map((item, index) => {
                                    const rank = index + 1;
                                    const rankBadgeClass = rank === 1 ? "utr-rank-badge--1" : rank === 2 ? "utr-rank-badge--2" : rank === 3 ? "utr-rank-badge--3" : "";
                                    const seriesPrefix = (item.company_code || "")[0]?.toLowerCase() || 'a';
                                    return (
                                        <tr className="utr-tr" key={item.company_code} style={{ "--idx": index % 10 }}>
                                            <td className="utr-td utr-td--index" style={{ textAlign: "center" }}>
                                                <span className={`utr-rank-badge ${rankBadgeClass}`}>
                                                    #{rank}
                                                </span>
                                            </td>
                                            <td className="utr-td utr-td--company">
                                                <div className="utr-summary-org-cell">
                                                    <div className="utr-org-title-row">
                                                        <span 
                                                            className="utr-summary-org-name utr-summary-org-name--clickable"
                                                            onClick={() => { setSelectedOrgModal(item); setSelectedUserModal(null); }}
                                                            title="Click to view User Ranking & Usage Breakdown"
                                                        >
                                                            {item.company_name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="utr-btn-org-modal"
                                                            onClick={() => { setSelectedOrgModal(item); setSelectedUserModal(null); }}
                                                            title="View User Ranking & Usage Breakdown"
                                                        >
                                                            <MdLeaderboard size={13} />
                                                            <span>User Breakdown</span>
                                                        </button>
                                                    </div>
                                                    <span className="utr-summary-org-code">{item.company_code}</span>
                                                </div>
                                            </td>
                                            <td className="utr-td utr-td--plan">
                                                <span className={`utr-plan-badge utr-plan-badge--${seriesPrefix}`}>
                                                    {item.plan_name}
                                                </span>
                                            </td>
                                            <td className="utr-td" style={{ textAlign: "center" }}>
                                                <span className="utr-summary-tx-count">{item.count}</span>
                                            </td>
                                            <td className="utr-td utr-td--share">
                                                <div className="utr-share-wrapper">
                                                    <div className="utr-share-bar-bg">
                                                        <div className="utr-share-bar-fill" style={{ width: `${Math.max(item.percentage, 4)}%` }}></div>
                                                    </div>
                                                    <span className="utr-share-text">{item.percentage}%</span>
                                                </div>
                                            </td>
                                            <td className="utr-td" style={{ textAlign: "center", color: "#a5b4fc", fontWeight: 700 }}>
                                                {item.active_users_count}
                                            </td>
                                            <td className="utr-td utr-td--module">
                                                <span className="utr-summary-mod-tag">{item.top_module}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
                                    <th className="utr-th utr-th--sortable" onClick={() => requestSort("plan_name")}>
                                        <div className="utr-th-content">
                                            <span>Plan Name</span>
                                            {renderSortIcon("plan_name")}
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
                                    const seriesPrefix = (t.company_code || "")[0]?.toLowerCase() || 'a';
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
                                            <td className="utr-td utr-td--plan">
                                                <span className={`utr-plan-badge utr-plan-badge--${seriesPrefix}`}>
                                                    {t.plan_name || "—"}
                                                </span>
                                            </td>
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

            {/* Organization User Ranking Modal */}
            {selectedOrgModal && createPortal(
                <div className="utr-modal-backdrop" onClick={() => { setSelectedOrgModal(null); setSelectedUserModal(null); }}>
                    <div className={`utr-modal-container ${selectedUserModal ? "utr-modal-container--expanded" : ""}`} onClick={e => e.stopPropagation()}>
                        
                        {/* Main Left Modal Panel */}
                        <div className="utr-modal-main-panel">
                            <div className="utr-modal-header">
                                <div className="utr-modal-title-wrap">
                                    <span className="utr-modal-icon"><MdLeaderboard size={20} /></span>
                                    <div>
                                        <h3 className="utr-modal-title">{selectedOrgModal.company_name}</h3>
                                        <p className="utr-modal-subtitle">
                                            Code: <span className="utr-modal-code">{selectedOrgModal.company_code}</span> • 
                                            Plan: <span className="utr-modal-plan">{selectedOrgModal.plan_name}</span>
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    className="utr-modal-close-btn" 
                                    onClick={() => { setSelectedOrgModal(null); setSelectedUserModal(null); }}
                                    title="Close Modal"
                                >
                                    <MdClose size={20} />
                                </button>
                            </div>

                            <div className="utr-modal-kpi-grid">
                                <div className="utr-modal-kpi-card">
                                    <span className="utr-modal-kpi-label">Total Organization Tx</span>
                                    <span className="utr-modal-kpi-val">{selectedOrgModal.count}</span>
                                </div>
                                <div className="utr-modal-kpi-card">
                                    <span className="utr-modal-kpi-label">Active Users</span>
                                    <span className="utr-modal-kpi-val">{selectedOrgModal.active_users_count}</span>
                                </div>
                                <div className="utr-modal-kpi-card">
                                    <span className="utr-modal-kpi-label">Overall Usage Share</span>
                                    <span className="utr-modal-kpi-val">{selectedOrgModal.percentage}%</span>
                                </div>
                            </div>

                            <div className="utr-modal-body">
                                <div className="utr-modal-section-header">
                                    <h4 className="utr-modal-section-title">User Transaction Ranking & % Breakdown</h4>
                                    <span className="utr-modal-hint font-mono">💡 Click any username to view module diagram</span>
                                </div>
                                {orgUserRankingList.length === 0 ? (
                                    <div className="utr-empty-container">
                                        <p>No user transactions recorded for this organization under current filters.</p>
                                    </div>
                                ) : (
                                    <div className="utr-table-wrapper utr-modal-table-wrapper" style={{ maxHeight: "360px" }}>
                                        <table className="utr-table utr-modal-table">
                                            <thead>
                                                <tr>
                                                    <th className="utr-th" style={{ textAlign: "center", width: "54px" }}>Rank</th>
                                                    <th className="utr-th" style={{ width: "130px" }}>User Name</th>
                                                    <th className="utr-th" style={{ textAlign: "center", width: "95px" }}>Transactions</th>
                                                    <th className="utr-th" style={{ width: "150px" }}>User Share (%)</th>
                                                    <th className="utr-th" style={{ width: "140px" }}>Most Visited Module</th>
                                                    <th className="utr-th" style={{ width: "125px" }}>Last Activity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orgUserRankingList.map((user, idx) => {
                                                    const rank = idx + 1;
                                                    const rankBadgeClass = rank === 1 ? "utr-rank-badge--1" : rank === 2 ? "utr-rank-badge--2" : rank === 3 ? "utr-rank-badge--3" : "";
                                                    const { date, time } = formatLocalTime(user.last_timestamp);
                                                    const isSelectedUser = selectedUserModal?.username === user.username;

                                                    return (
                                                        <tr 
                                                            className={`utr-tr ${isSelectedUser ? "utr-tr--selected-user" : ""}`} 
                                                            key={user.username}
                                                        >
                                                            <td className="utr-td" style={{ textAlign: "center" }}>
                                                                <span className={`utr-rank-badge ${rankBadgeClass}`}>
                                                                    #{rank}
                                                                </span>
                                                            </td>
                                                            <td className="utr-td utr-td--username">
                                                                <span 
                                                                    className={`utr-username-badge utr-username-badge--clickable ${isSelectedUser ? "utr-username-badge--active" : ""}`}
                                                                    onClick={() => setSelectedUserModal(isSelectedUser ? null : user)}
                                                                    title="Click to view module usage breakdown & diagram"
                                                                >
                                                                    {user.username}
                                                                    <span className="utr-user-node-dot"></span>
                                                                </span>
                                                            </td>
                                                            <td className="utr-td" style={{ textAlign: "center", fontWeight: 700, color: "#fff" }}>
                                                                {user.count}
                                                            </td>
                                                            <td className="utr-td utr-td--share">
                                                                <div className="utr-share-wrapper">
                                                                    <div className="utr-share-bar-bg">
                                                                        <div className="utr-share-bar-fill" style={{ width: `${Math.max(user.percentage, 5)}%` }}></div>
                                                                    </div>
                                                                    <span className="utr-share-text">{user.percentage}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="utr-td utr-td--module">
                                                                <span className="utr-summary-mod-tag" title={user.top_module}>{user.top_module}</span>
                                                            </td>
                                                            <td className="utr-td" style={{ fontSize: "11.5px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                                {date} {time}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="utr-modal-footer">
                                <button 
                                    type="button" 
                                    className="utr-modal-close-btn-footer"
                                    onClick={() => { setSelectedOrgModal(null); setSelectedUserModal(null); }}
                                >
                                    Close Breakdown
                                </button>
                            </div>
                        </div>

                        {/* ERD Connector & Connected Module Panel */}
                        {selectedUserModal && (
                            <>
                                <div className="utr-erd-connector">
                                    <div className="utr-erd-node utr-erd-node--left"></div>
                                    <div className="utr-erd-pulse-line"></div>
                                    <div className="utr-erd-node utr-erd-node--right"></div>
                                </div>

                                <div className="utr-modal-right-panel">
                                    <div className="utr-modal-header">
                                        <div className="utr-modal-title-wrap">
                                            <span className="utr-modal-icon utr-modal-icon--user"><MdPersonOutline size={20} /></span>
                                            <div>
                                                <h3 className="utr-modal-title">{selectedUserModal.username}</h3>
                                                <p className="utr-modal-subtitle">
                                                    User Module Usage & Ranking Breakdown
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            className="utr-modal-close-btn" 
                                            onClick={() => setSelectedUserModal(null)}
                                            title="Close User Diagram"
                                        >
                                            <MdClose size={18} />
                                        </button>
                                    </div>

                                    <div className="utr-modal-kpi-grid">
                                        <div className="utr-modal-kpi-card">
                                            <span className="utr-modal-kpi-label">User Total Tx</span>
                                            <span className="utr-modal-kpi-val">{selectedUserModal.count}</span>
                                        </div>
                                        <div className="utr-modal-kpi-card">
                                            <span className="utr-modal-kpi-label">Active Modules</span>
                                            <span className="utr-modal-kpi-val">{userModuleRankingList.length}</span>
                                        </div>
                                        <div className="utr-modal-kpi-card">
                                            <span className="utr-modal-kpi-label">Org User Share</span>
                                            <span className="utr-modal-kpi-val">{selectedUserModal.percentage}%</span>
                                        </div>
                                    </div>

                                    <div className="utr-modal-body">
                                        <h4 className="utr-modal-section-title">Module Visits & % Contribution</h4>
                                        {userModuleRankingList.length === 0 ? (
                                            <div className="utr-empty-container">
                                                <p>No module transaction logs for this user.</p>
                                            </div>
                                        ) : (
                                            <div className="utr-table-wrapper utr-modal-table-wrapper" style={{ maxHeight: "360px" }}>
                                                <table className="utr-table utr-modal-table">
                                                    <thead>
                                                        <tr>
                                                            <th className="utr-th" style={{ textAlign: "center", width: "54px" }}>Rank</th>
                                                            <th className="utr-th" style={{ width: "160px" }}>Module Name</th>
                                                            <th className="utr-th" style={{ textAlign: "center", width: "75px" }}>Visits</th>
                                                            <th className="utr-th" style={{ width: "150px" }}>Module Share (%)</th>
                                                            <th className="utr-th" style={{ width: "125px" }}>Last Visited</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {userModuleRankingList.map((mod, idx) => {
                                                            const rank = idx + 1;
                                                            const rankBadgeClass = rank === 1 ? "utr-rank-badge--1" : rank === 2 ? "utr-rank-badge--2" : rank === 3 ? "utr-rank-badge--3" : "";
                                                            const { date, time } = formatLocalTime(mod.last_timestamp);
                                                            return (
                                                                <tr className="utr-tr" key={mod.module_name}>
                                                                    <td className="utr-td" style={{ textAlign: "center" }}>
                                                                        <span className={`utr-rank-badge ${rankBadgeClass}`}>
                                                                            #{rank}
                                                                        </span>
                                                                    </td>
                                                                    <td className="utr-td utr-td--module">
                                                                        <span className="utr-summary-mod-tag utr-summary-mod-tag--highlight" title={mod.module_name}>{mod.module_name}</span>
                                                                    </td>
                                                                    <td className="utr-td" style={{ textAlign: "center", fontWeight: 700, color: "#fff" }}>
                                                                        {mod.count}
                                                                    </td>
                                                                    <td className="utr-td utr-td--share">
                                                                        <div className="utr-share-wrapper">
                                                                            <div className="utr-share-bar-bg">
                                                                                <div className="utr-share-bar-fill utr-share-bar-fill--user" style={{ width: `${Math.max(mod.percentage, 5)}%` }}></div>
                                                                            </div>
                                                                            <span className="utr-share-text">{mod.percentage}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="utr-td" style={{ fontSize: "11.5px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                                        {date} {time}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="utr-modal-footer">
                                        <button 
                                            type="button" 
                                            className="utr-modal-close-btn-footer"
                                            onClick={() => setSelectedUserModal(null)}
                                        >
                                            Close User Breakdown
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
