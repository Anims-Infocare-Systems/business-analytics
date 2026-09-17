/**
 * dateSettingsHelper.js
 * Centralized Date Setting Engine for Business Analytics.
 * 
 * Manages default date range presets across:
 * 1. Plant Performance (Dashboard)
 * 2. Reports (Sales Analysis, Purchase Analysis, Quality Analysis, Production Analysis)
 * 3. MIS (Idle Time Report, Efficiency Report)
 * 
 * Persists in localStorage ("ba_module_date_settings") and synchronizes with
 * active session filters so configured defaults load instantly upon opening any report.
 */

import { resolveApiBase } from "../../apiBase";
const API = resolveApiBase();

export const STORAGE_DATE_SETTINGS_KEY = "ba_module_date_settings";

/** Available Date Range Presets */
export const DATE_PRESETS = [
    {
        id: "last_3_months",
        label: "Last 3 Months",
        shortLabel: "3 Months",
        description: "Past 3 months relative to current date (Recommended for trend analysis)",
        isRecommended: true
    },
    {
        id: "this_month",
        label: "This Month",
        shortLabel: "This Month",
        description: "From the 1st of the current month to today"
    },
    {
        id: "last_month",
        label: "Last Month",
        shortLabel: "Last Month",
        description: "Full calendar days of the previous month"
    },
    {
        id: "last_30_days",
        label: "Last 30 Days",
        shortLabel: "30 Days",
        description: "Past 30 calendar days including today"
    },
    {
        id: "last_7_days",
        label: "Last 7 Days",
        shortLabel: "7 Days",
        description: "Past 7 calendar days including today"
    },
    {
        id: "last_6_months",
        label: "Last 6 Months",
        shortLabel: "6 Months",
        description: "Past 6 calendar months for half-yearly reviews"
    },
    {
        id: "this_year",
        label: "This Year",
        shortLabel: "This Year",
        description: "From January 1st of current year to today"
    },
    {
        id: "last_year",
        label: "Last Year",
        shortLabel: "Last Year",
        description: "Full prior calendar year (Jan 1 to Dec 31)"
    },
    {
        id: "today",
        label: "Today",
        shortLabel: "Today",
        description: "Only the current day's data"
    },
    {
        id: "yesterday",
        label: "Yesterday",
        shortLabel: "Yesterday",
        description: "Previous day's operations"
    }
];

/** Configurable Modules Catalog */
export const MODULE_TARGETS = [
    {
        key: "plant_performance",
        name: "Plant Performance Dashboard",
        shortName: "Plant Performance",
        category: "Dashboard",
        categoryLabel: "Dashboard Suite",
        iconName: "Factory",
        color: "linear-gradient(135deg, #0284c7, #0369a1)",
        description: "Machine telemetry, shift performance, OTD trends & shop-floor metrics.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_plantperformance"
    },
    {
        key: "sales_analysis",
        name: "Sales Analysis",
        shortName: "Sales Analysis",
        category: "Reports",
        categoryLabel: "Analytical Reports",
        iconName: "TrendingUp",
        color: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        description: "Customer order trends, product performance, and target vs actual metrics.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_sales"
    },
    {
        key: "purchase_analysis",
        name: "Purchase Analysis",
        shortName: "Purchase Analysis",
        category: "Reports",
        categoryLabel: "Analytical Reports",
        iconName: "ShoppingCart",
        color: "linear-gradient(135deg, #7c3aed, #6d28d9)",
        description: "Supplier lead times, procurement pricing & purchase order histories.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_purchase"
    },
    {
        key: "quality_analysis",
        name: "Quality Analysis",
        shortName: "Quality Analysis",
        category: "Reports",
        categoryLabel: "Analytical Reports",
        iconName: "CheckCircle2",
        color: "linear-gradient(135deg, #059669, #047857)",
        description: "Rejection rates, defect categorization & QC inspection summaries.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_quality"
    },
    {
        key: "production_analysis",
        name: "Production Analysis",
        shortName: "Production Analysis",
        category: "Reports",
        categoryLabel: "Analytical Reports",
        iconName: "FileSpreadsheet",
        color: "linear-gradient(135deg, #d97706, #b45309)",
        description: "Work center efficiency, batch completion logs & operator shift outputs.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_production"
    },
    {
        key: "idle_time_report",
        name: "Idle Time Report",
        shortName: "Idle Time",
        category: "MIS",
        categoryLabel: "MIS Operational",
        iconName: "Clock",
        color: "linear-gradient(135deg, #0891b2, #0e7490)",
        description: "Machine idle durations, breakdown causes & operator downtime analysis.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_idletime"
    },
    {
        key: "efficiency_report",
        name: "Efficiency Report",
        shortName: "Efficiency Report",
        category: "MIS",
        categoryLabel: "MIS Operational",
        iconName: "Activity",
        color: "linear-gradient(135deg, #ea580c, #c2410c)",
        description: "Overall equipment effectiveness (OEE) and operational efficiency benchmarks.",
        defaultPreset: "last_3_months",
        sessionKey: "ba_filter_efficiency"
    }
];

/** Standard factory defaults */
export const DEFAULT_DATE_SETTINGS = MODULE_TARGETS.reduce((acc, m) => {
    acc[m.key] = m.defaultPreset || "last_3_months";
    return acc;
}, {});

/** Normalize Date to start of day (00:00:00.000) */
export function startOfDay(d) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

/** Normalize Date to end of day (23:59:59.999) */
export function endOfDay(d) {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
}

/** Compute dynamic start & end dates from any preset ID */
export function computeDateRangeFromPreset(presetId, baseDate = new Date()) {
    const today = startOfDay(baseDate);
    const y = today.getFullYear();
    const m = today.getMonth();

    switch (presetId) {
        case "today":
            return { from: startOfDay(today), to: startOfDay(today) };

        case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return { from: startOfDay(yesterday), to: startOfDay(yesterday) };
        }

        case "last_7_days": {
            const from = new Date(today);
            from.setDate(from.getDate() - 6);
            return { from: startOfDay(from), to: startOfDay(today) };
        }

        case "last_30_days": {
            const from = new Date(today);
            from.setDate(from.getDate() - 29);
            return { from: startOfDay(from), to: startOfDay(today) };
        }

        case "this_month": {
            const from = new Date(y, m, 1);
            const to = new Date(y, m + 1, 0);
            return { from: startOfDay(from), to: startOfDay(to) };
        }

        case "last_month": {
            const from = new Date(y, m - 1, 1);
            const to = new Date(y, m, 0);
            return { from: startOfDay(from), to: startOfDay(to) };
        }

        case "last_3_months": {
            const from = new Date(today);
            from.setMonth(from.getMonth() - 3);
            return { from: startOfDay(from), to: startOfDay(today) };
        }

        case "last_6_months": {
            const from = new Date(today);
            from.setMonth(from.getMonth() - 6);
            return { from: startOfDay(from), to: startOfDay(today) };
        }

        case "this_year": {
            const from = new Date(y, 0, 1);
            return { from: startOfDay(from), to: startOfDay(today) };
        }

        case "last_year": {
            const from = new Date(y - 1, 0, 1);
            const to = new Date(y - 1, 11, 31);
            return { from: startOfDay(from), to: startOfDay(to) };
        }

        default: {
            // Default fallback: Last 3 Months
            const from = new Date(today);
            from.setMonth(from.getMonth() - 3);
            return { from: startOfDay(from), to: startOfDay(today) };
        }
    }
}

/** Read persisted date settings from localStorage */
export function getSavedDateSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_DATE_SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_DATE_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_DATE_SETTINGS, ...parsed };
    } catch {
        return { ...DEFAULT_DATE_SETTINGS };
    }
}

/** Fetch company-wide date settings from database and sync to local storage */
export async function fetchCompanyDateSettings() {
    try {
        const res = await fetch(`${API}/user-settings/date-presets/`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.presets && Object.keys(data.presets).length > 0) {
                const merged = { ...DEFAULT_DATE_SETTINGS, ...data.presets };
                localStorage.setItem(STORAGE_DATE_SETTINGS_KEY, JSON.stringify(merged));
                window.dispatchEvent(new CustomEvent("ba-date-settings-updated", { detail: merged }));
                return merged;
            }
        }
    } catch {
        // Fallback to local storage
    }
    return getSavedDateSettings();
}

/** Save date settings to localStorage, notify listeners, and sync to company database */
export function saveDateSettings(newSettings) {
    try {
        const payload = { ...DEFAULT_DATE_SETTINGS, ...newSettings };
        localStorage.setItem(STORAGE_DATE_SETTINGS_KEY, JSON.stringify(payload));

        // Flush stale sessionStorage filter keys so next opening of each report reflects the new default
        MODULE_TARGETS.forEach(m => {
            if (m.sessionKey) {
                try {
                    sessionStorage.removeItem(m.sessionKey);
                } catch { /* ignore */ }
            }
        });

        // Dispatch window event for live listeners
        window.dispatchEvent(new CustomEvent("ba-date-settings-updated", { detail: payload }));

        // Asynchronously persist to company database via backend API
        try {
            fetch(`${API}/user-settings/date-presets/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ presets: payload })
            }).catch(e => console.warn("Failed background database sync:", e));
        } catch {
            /* ignore background network errors */
        }

        return true;
    } catch (err) {
        console.error("Failed to save date settings:", err);
        return false;
    }
}

/**
 * Get the initial default date range for a specific module.
 * Can be called using either key ("sales_analysis") or title ("Sales Analysis").
 */
export function getModuleDefaultDateRange(moduleIdentifier, fallbackRange = null) {
    const target = MODULE_TARGETS.find(m =>
        m.key === moduleIdentifier ||
        m.name.toLowerCase() === String(moduleIdentifier).toLowerCase() ||
        m.shortName.toLowerCase() === String(moduleIdentifier).toLowerCase()
    );

    const settings = getSavedDateSettings();
    const presetId = (target && settings[target.key]) ? settings[target.key] : "last_3_months";
    const computed = computeDateRangeFromPreset(presetId);

    if (!computed && fallbackRange) {
        return fallbackRange;
    }
    return computed;
}

/** Format Date to DD-MM-YYYY for display */
export function formatDateDisplay(date) {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}
