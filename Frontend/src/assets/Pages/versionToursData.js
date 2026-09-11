/**
 * Version Tours & Tips Data Registry
 * 
 * Central repository for application versions, release notes, interactive tour steps,
 * and categorized tips. Adding future versions (e.g. v2.5.0) is as simple as adding
 * a new entry to the VERSION_REGISTRY array below.
 */

export const CURRENT_APP_VERSION = "v2.4.0";

export const VERSION_REGISTRY = [
    {
        version: "v2.4.0",
        label: "v2.4.0 (Latest Release)",
        releaseDate: "September 2026",
        isCurrent: true,
        tagline: "Dynamic Analytics, Intelligent KPI Dashboards & Streamlined Approvals",
        highlights: [
            "Interactive Product Tour & Version-specific Tips Hub",
            "Enhanced Plant Performance & Top Management KPI Dashboards",
            "Multi-tier Approval Workflows (E-Approval, T-Approval & M-Approval)",
            "Instant PDF Exports & Granular Date Range Filtering"
        ],
        tourSteps: [
            {
                id: "workspace-header",
                targetSelector: "[data-tour='workspace-header']",
                fallbackSelector: ".dl-header__title",
                title: "Organization Workspace",
                category: "Workspace",
                badge: "Live Sync",
                description: "Displays your active enterprise company and live ERP connection status. All dashboards, charts, and reports are synchronized directly with your business database in real time.",
                placement: "bottom",
                iconName: "Shield"
            },
            {
                id: "user-profile",
                targetSelector: "[data-tour='user-profile']",
                fallbackSelector: ".dl-header__profile",
                title: "Profile, Settings & Tips Hub",
                category: "Account & Tips",
                badge: "Quick Hub",
                description: "Manage your user profile, view designation and license status, change security passwords, and access the Tips & Tour sub-menu anytime to discover new features.",
                placement: "bottom",
                iconName: "Sparkles"
            },
            {
                id: "live-clock",
                targetSelector: "[data-tour='live-clock']",
                fallbackSelector: "[data-tour='live-clock-card'], .dl-clock",
                title: "Live Indian Standard Time (IST)",
                category: "Operations",
                badge: "IST Live Clock",
                description: "Displays live Indian Standard Time (IST, UTC+05:30) synchronized accurately with server and network timestamps, ensuring standardized plant floor shift operations and schedule tracking.",
                placement: "bottom",
                iconName: "Clock"
            },
            {
                id: "quick-access",
                targetSelector: "[data-tour='quick-access']",
                fallbackSelector: ".wh-bento",
                title: "Quick Launch Tiles",
                category: "Productivity",
                badge: "Instant Launch",
                description: "Jump directly into your most frequently used modules with real-time KPI overview badges and one-click deep navigation from your workspace landing page.",
                placement: "top",
                iconName: "Zap"
            },
            {
                id: "menu-Dashboard",
                targetSelector: "[data-tour='menu-Dashboard']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: "Dashboard",
                title: "Dashboard Suite",
                category: "Executive & Plant",
                badge: "Module 1 of 7",
                description: "Real-time executive intelligence and shop-floor cockpits:",
                subItems: [
                    { title: "Top Management Dashboard", desc: "Executive KPI overview across sales, receivables, procurement, and quality indices." },
                    { title: "Plant Performance Dashboard", desc: "Real-time machine efficiency, hourly production output, shifts, and downtime analysis." }
                ],
                placement: "right",
                iconName: "LayoutDashboard"
            },
            {
                id: "menu-Approvals",
                targetSelector: "[data-tour='menu-Approvals']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: "Approvals",
                title: "Approvals Workflow Suite",
                category: "Workflows",
                badge: "Module 2 of 7",
                description: "Multi-tiered electronic sign-off pipelines with instant PDF voucher generation:",
                subItems: [
                    { title: "E-Approval", desc: "Commercial & Purchase Order financial threshold sign-offs." },
                    { title: "T-Approval", desc: "Technical & Engineering specification approvals." },
                    { title: "M-Approval", desc: "Material & Store dispatch maintenance approvals." }
                ],
                placement: "right",
                iconName: "CheckCircle"
            },
            {
                id: "menu-Reports",
                targetSelector: "[data-tour='menu-Reports']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: "Reports",
                title: "Analytical Reports Suite",
                category: "Business Intelligence",
                badge: "Module 3 of 7",
                description: "Deep-dive data intelligence with granular date filters, custom presets, and CSV/PDF exports:",
                subItems: [
                    { title: "Sales Analysis", desc: "Customer order trends, product performance, and target vs actual metrics." },
                    { title: "Purchase Analysis", desc: "Supplier performance, purchase rates, and procurement lead times." },
                    { title: "Quality Analysis", desc: "Rejection rates, defect categorization, and inspection QC summaries." },
                    { title: "Production Analysis", desc: "Work center efficiency, batch completion, and shift output." }
                ],
                placement: "right",
                iconName: "FileSpreadsheet"
            },
            {
                id: "menu-MIS",
                targetSelector: "[data-tour='menu-MIS']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: "MIS",
                title: "MIS Operational Reports",
                category: "Operations & Efficiency",
                badge: "Module 4 of 7",
                description: "Management Information System reports designed for operational optimization:",
                subItems: [
                    { title: "Idle Time Report", desc: "Machine stoppage breakdown by reason, operator, and production line." },
                    { title: "Efficiency Report", desc: "Overall operational equipment efficiency (OEE) and productivity benchmarking." }
                ],
                placement: "right",
                iconName: "BarChart3"
            },
            {
                id: "menu-Charts",
                targetSelector: "[data-tour='menu-Charts']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: null,
                title: "Analytics Charts & Trends",
                category: "Visual Analytics",
                badge: "Module 5 of 7",
                description: "Interactive multi-series charts and visual data graphs. Toggle series, inspect hover tooltips, and export high-resolution chart graphics.",
                placement: "right",
                iconName: "TrendingUp"
            },
            {
                id: "menu-Utility",
                targetSelector: "[data-tour='menu-Utility']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: "Utility",
                title: "System Utility & Administration",
                category: "User Administration",
                badge: "Module 6 of 7",
                description: "Role-based access control and approval governance:",
                subItems: [
                    { title: "User Rights", desc: "Assign and restrict module access permissions per user profile." },
                    { title: "Users Setting", desc: "Configure monetary approval limits and threshold governance for E-Approvals." }
                ],
                placement: "right",
                iconName: "ShieldAlert"
            },
            {
                id: "menu-Settings",
                targetSelector: "[data-tour='menu-Settings']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: null,
                title: "Settings, Tips & Subscriptions",
                category: "System Configuration",
                badge: "Module 7 of 7",
                description: "Manage account settings, update passwords, view subscription quotas and invoices, and open the Tips & Tour menu anytime to discover new features or replay this tour!",
                placement: "right",
                iconName: "Settings"
            }
        ],
        tips: [
            {
                id: "tip-240-1",
                title: "Mastering Date Range Filtering",
                category: "Reports",
                type: "PRO TIP",
                icon: "Calendar",
                summary: "Quickly isolate quarterly, monthly, or customized date intervals across any analytical report.",
                steps: [
                    "Click the Date Range Picker icon at the top of any Report or Dashboard.",
                    "Choose from convenient quick presets (Today, Last 7 Days, This Month, Last Quarter) or pick custom dates.",
                    "Charts and data tables automatically recalculate instantly without full page reloads."
                ],
                actionLabel: "Explore Reports",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-240-2",
                title: "Multi-Tier Approval Sign-offs",
                category: "Approvals",
                type: "NEW FEATURE",
                icon: "CheckCircle",
                summary: "Process Electronic (E), Technical (T), and Maintenance (M) approvals with PDF generation and remarks.",
                steps: [
                    "Navigate to Approvals > E-Approval (or T-Approval / M-Approval).",
                    "Select a pending voucher to inspect line items, amounts, and attachment details.",
                    "Click 'Approve' with optional remarks or 'Reject' to route back to the initiator.",
                    "Generate and preview signed audit-ready PDF summaries instantly."
                ],
                actionLabel: "Open E-Approval",
                actionTarget: "E-Approval"
            },
            {
                id: "tip-240-3",
                title: "Collapsible Sidebar for Wide Displays",
                category: "Productivity",
                type: "SHORTCUT",
                icon: "Maximize2",
                summary: "Maximize your screen real estate for wide data tables and multi-series charts.",
                steps: [
                    "Click the Collapse button at the bottom of the sidebar to switch to icon-only mode.",
                    "Hover over any menu item in collapsed mode to reveal a floating quick-access flyout.",
                    "On tablet and mobile devices, the drawer automatically adapts seamlessly."
                ],
                actionLabel: null,
                actionTarget: null
            },
            {
                id: "tip-240-4",
                title: "Executive Plant Floor Efficiency Metrics",
                category: "Dashboards",
                type: "BEST PRACTICE",
                icon: "TrendingUp",
                summary: "Monitor live machine idle times, downtime reasons, and operational efficiency percentages.",
                steps: [
                    "Open MIS > Efficiency Report or Idle Time Report.",
                    "Filter by plant section, shift time, or operator to detect bottlenecks.",
                    "Export detailed CSV or PDF reports for weekly management reviews."
                ],
                actionLabel: "View Efficiency",
                actionTarget: "Efficiency Report"
            },
            {
                id: "tip-240-5",
                title: "User Permissions & Module Security",
                category: "Security",
                type: "SECURITY",
                icon: "ShieldAlert",
                summary: "Superadmins can configure granular menu visibility and approval thresholds per user.",
                steps: [
                    "Navigate to Utility > User Rights.",
                    "Select a staff member to enable/disable specific modules or approval tiers.",
                    "Use Utility > Users Setting to enforce PO amount approval limits."
                ],
                actionLabel: "User Rights",
                actionTarget: "User Rights"
            }
        ]
    },
    {
        version: "v2.2.0",
        label: "v2.2.0 (Legacy)",
        releaseDate: "May 2026",
        isCurrent: false,
        tagline: "Core Business Analytics Engine & Modular Role Management",
        highlights: [
            "Initial release of Top Management Dashboard and Sales/Purchase Analysis",
            "User rights assignment and company multi-tenancy architecture",
            "PWA offline resilience and automatic updates"
        ],
        tourSteps: [],
        tips: [
            {
                id: "tip-220-1",
                title: "Multi-Tenancy Workspace Code",
                category: "Security",
                type: "BEST PRACTICE",
                icon: "Key",
                summary: "Each organization accesses their isolated ERP database securely via a unique Company Code.",
                steps: [
                    "Your organization code is displayed on your login screen and Settings profile.",
                    "Ensure team members use the exact workspace code when signing in."
                ],
                actionLabel: null,
                actionTarget: null
            }
        ]
    }
];

/**
 * Storage key helper for tracking tour status per version & user
 */
function getStorageKey(version, username) {
    const u = (username || "guest").toLowerCase().trim();
    const v = (version || CURRENT_APP_VERSION).toLowerCase().trim();
    return `ba_tour_seen_${v}_${u}`;
}

/**
 * Checks whether the specified user has already completed/dismissed the tour for this version.
 */
export function hasSeenTour(version = CURRENT_APP_VERSION, username = "") {
    try {
        const key = getStorageKey(version, username);
        return localStorage.getItem(key) === "true";
    } catch {
        return false;
    }
}

/**
 * Marks the tour as completed/dismissed for the specified version and user.
 */
export function markTourAsSeen(version = CURRENT_APP_VERSION, username = "") {
    try {
        const key = getStorageKey(version, username);
        localStorage.setItem(key, "true");
    } catch {
        /* ignore localStorage quota/privacy errors */
    }
}

/**
 * Resets the tour status so it can be re-triggered automatically on login (useful for testing or reset).
 */
export function resetTourSeen(version = CURRENT_APP_VERSION, username = "") {
    try {
        const key = getStorageKey(version, username);
        localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}

/**
 * Retrieves the version definition object by version string (or returns the current version).
 */
export function getVersionData(version = CURRENT_APP_VERSION) {
    return VERSION_REGISTRY.find(v => v.version === version) || VERSION_REGISTRY[0];
}

/**
 * Retrieves tour steps for the specified version.
 */
export function getTourStepsForVersion(version = CURRENT_APP_VERSION) {
    const vData = getVersionData(version);
    return vData?.tourSteps || [];
}

/**
 * Retrieves tips for the specified version.
 */
export function getTipsForVersion(version = CURRENT_APP_VERSION) {
    const vData = getVersionData(version);
    return vData?.tips || [];
}
