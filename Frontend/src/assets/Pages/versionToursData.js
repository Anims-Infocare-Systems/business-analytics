/**
 * Version Tours & Tips Data Registry
 * 
 * Central repository for application versions, release notes, interactive tour steps,
 * and categorized tips. Adding future versions (e.g. v2.5.0) is as simple as adding
 * a new entry to the VERSION_REGISTRY array below.
 */

export const CURRENT_APP_VERSION = "v2.5.0";

export const VERSION_REGISTRY = [
    {
        version: "v2.5.0",
        label: "v2.5.0 (Latest Release)",
        releaseDate: "October 2026",
        isCurrent: true,
        tagline: "Sales Intelligence, Real-Time Delivery Tracking & Rate History",
        highlights: [
            "Customer & Part-Wise Pending PO Backlog with 1-Click Table Expand",
            "Multi-Month Delivery Schedule Analysis with Dual-View Expansion",
            "Live Warehouse Despatch Planning & Fulfillment Status",
            "Type-Filtered Customer & Part Revenue Performance",
            "Part-Wise Rate Intelligence, Price Variance & Revision History",
            "Average Purchase Value Cost Benchmark (Raw vs Store Materials)",
            "Advanced Purchase Analytics with Top Spend & Variance Insights",
            "PO Fulfillment Schedule with Live Due & Overdue Lot Tracking",
            "Futuristic Expected Schedule with Predictive ROL & Safety Stock",
            "Quality Analysis Multi-Dimensional Report Filters & Disposition Pills",
            "Operator-Wise Rejection Analytics with Dual Grid & Chart Mode",
            "Machine-Wise Rejection Matrix with Equipment Work-Center Filters",
            "Interactive End-to-End 6-Stage Quality Lineage Pipeline"
        ],
        tourSteps: [
            {
                id: "sa-tour-pending-po",
                targetSelector: "[data-spotlight='sa-pending-po-summary']",
                fallbackSelector: ".sa-card--pending-po",
                navItem: "Reports",
                navSubItem: "Sales Analysis",
                title: "Customer & Part-Wise Pending PO Summary",
                category: "Order Backlog",
                badge: "Step 1 of 13 • Expandable View",
                iconName: "FileSpreadsheet",
                placement: "bottom",
                isExpandable: true,
                description: "Track outstanding purchase order backlogs per customer and part number. Switch seamlessly between PO Date Wise and PO Schedule Wise views with instant customer search.",
                subItems: [
                    {
                        title: "Expandable View Mode",
                        desc: "Click the maximize icon (⤢) at the top-right of the card to expand this table from half-screen to full-screen width."
                    },
                    {
                        title: "Backlog Balance Tracking",
                        desc: "Compare ordered quantities (PO Qty) directly against actual dispatched units (Sal Qty) with live balance pills."
                    }
                ]
            },
            {
                id: "sa-tour-schedule-analysis",
                targetSelector: "[data-spotlight='sa-schedule-analysis']",
                fallbackSelector: ".sa-card--sched-analysis",
                navItem: "Reports",
                navSubItem: "Sales Analysis",
                title: "Customer & Part-Wise Schedule Analysis",
                category: "Delivery Schedules",
                badge: "Step 2 of 13 • Expandable View",
                iconName: "Calendar",
                placement: "bottom",
                isExpandable: true,
                description: "Multi-month dispatch matrix comparing promised delivery schedules against actual shipments across August and September with quantity and value metrics.",
                subItems: [
                    {
                        title: "Expandable Side-by-Side Table",
                        desc: "Toggle the maximize icon (⤢) to expand this card to full width for wide viewing of monthly quantity and value columns."
                    },
                    {
                        title: "Schedule vs Actual Alignment",
                        desc: "Inspect scheduled quantity and value side-by-side with actual invoiced quantity and revenue."
                    }
                ]
            },
            {
                id: "sa-tour-despatch-plan",
                targetSelector: "[data-spotlight='sa-despatch-plan']",
                fallbackSelector: ".sa-card--despatch-plan",
                navItem: "Reports",
                navSubItem: "Sales Analysis",
                title: "Despatch Planning Status",
                category: "Warehouse & Shipping",
                badge: "Step 3 of 13 • Live Auto-Sync",
                iconName: "Zap",
                placement: "top",
                isExpandable: false,
                description: "Real-time dispatch tracking pipeline aligning planned fulfillment dates with available stock, invoice generation, and status filters.",
                subItems: [
                    {
                        title: "Live KPI & Status Badges",
                        desc: "Displays live Total Invoice Value alongside dynamic status filters (Ready, In Production, Dispatched)."
                    },
                    {
                        title: "One-Click CSV Export",
                        desc: "Export scheduled shipping orders directly to CSV for plant logistics and dispatch teams."
                    }
                ]
            },
            {
                id: "sa-tour-customer-part-wise",
                targetSelector: "[data-spotlight='sa-customer-part-wise']",
                fallbackSelector: ".sa-card--cust-part",
                navItem: "Reports",
                navSubItem: "Sales Analysis",
                title: "Customer & Part-Wise Sales Analysis",
                category: "Revenue Analysis",
                badge: "Step 4 of 13 • Multi-Type Filter",
                iconName: "TrendingUp",
                placement: "top",
                isExpandable: false,
                description: "Granular revenue analysis dissecting customer billing across business channels and part lines with instant type filtering.",
                subItems: [
                    {
                        title: "Invoice Type Filter",
                        desc: "Segment transactions instantly by Commercial Sales, Labour Jobwork, or Export orders."
                    },
                    {
                        title: "Account Revenue Share",
                        desc: "Evaluate quantity volumes, average unit realizations, and aggregate line totals per account."
                    }
                ]
            },
            {
                id: "sa-tour-part-wise-history",
                targetSelector: "[data-spotlight='sa-part-wise-history']",
                fallbackSelector: ".sales-part-wise-history-section, #sales-part-wise-history-section",
                navItem: "Reports",
                navSubItem: "Sales Analysis",
                title: "Part-wise History & Rate Intelligence",
                category: "Pricing Intelligence",
                badge: "Step 5 of 13 • Pricing Analytics",
                iconName: "Shield",
                placement: "top",
                isExpandable: false,
                description: "Interactive pricing intelligence tracking historical price revisions, quotation trends, and price variance across parts and customers.",
                subItems: [
                    {
                        title: "Active Catalog Search",
                        desc: "Select any part from the quick-search dropdown to load its full pricing timeline."
                    },
                    {
                        title: "Rate Variance KPI Banner",
                        desc: "Live comparison of active rate vs base rate, percentage change, and cumulative revenue."
                    }
                ]
            },
            {
                id: "pa-tour-average-purchase-value",
                targetSelector: "[data-spotlight='pa-apv-header'], [data-spotlight='pa-average-purchase-value'] .pa2-apv-header-row",
                fallbackSelector: "[data-spotlight='pa-average-purchase-value'], .pa2-apv-card",
                navItem: "Reports",
                navSubItem: "Purchase Analysis",
                title: "Average Purchase Value",
                category: "Material Costing",
                badge: "Step 6 of 13 • Raw vs Store Materials",
                iconName: "TrendingUp",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Comprehensive purchase cost benchmark comparing average procurement prices across Raw Material and Store Material categories with interactive sub-tabs, supplier variance, and purchase volume trends.",
                subItems: [
                    {
                        title: "Dual Material Mode Switcher",
                        desc: "Toggle between Raw Material (RM) and Store Material (Consumables & Spares) to inspect category-specific weighted purchase rates."
                    },
                    {
                        title: "Unit Cost Realization & Trends",
                        desc: "Track item-level historical purchase costs, latest PO unit prices, and vendor-wise procurement efficiency side-by-side."
                    }
                ]
            },
            {
                id: "pa-tour-advanced-analytics",
                targetSelector: "[data-spotlight='pa-apa-header'], #advanced-purchase-analytics-section .apa-header",
                fallbackSelector: "#advanced-purchase-analytics-section, .apa-root",
                navItem: "Reports",
                navSubItem: "Purchase Analysis",
                title: "Advanced Purchase Analytics",
                category: "Procurement Analytics",
                badge: "Step 7 of 13 • Deep Analytics & Heatmaps",
                iconName: "Sparkles",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Deep-dive multi-dimensional purchase intelligence featuring top supplier rankings, spend variance breakdowns, category distribution charts, and interactive spend heatmaps.",
                subItems: [
                    {
                        title: "Multi-Perspective Analytics",
                        desc: "Switch between visual charts and detailed tabular matrices covering Vendor Spend, Material Group distribution, and purchase variance."
                    },
                    {
                        title: "Spend Anomalies & Drivers",
                        desc: "Instantly detect major spend drivers, cost inflation outliers, and procurement volume shifts across monthly and quarterly cycles."
                    }
                ]
            },
            {
                id: "pa-tour-po-fulfillment",
                targetSelector: "[data-spotlight='pa-po-fulfillment-btn']",
                fallbackSelector: "[data-spotlight='pa-fs-header-row'], [data-spotlight='pa-fs-main-tabs'], #pa-fulfillment-schedule-section",
                navItem: "Reports",
                navSubItem: "Purchase Analysis",
                tabAction: "standard",
                tabDesc: "Switched to committed supplier PO fulfillment lots and delivery progress.",
                title: "PO Fulfillment Schedule",
                category: "Supplier Fulfillment",
                badge: "Step 8 of 13 • Committed Delivery Lots",
                iconName: "Calendar",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Track committed supplier delivery lots and purchase order schedules. Monitor delivery milestones, overdue shipments, and on-track purchase lots with live status pill filters.",
                subItems: [
                    {
                        title: "Status Quick Pill Filters",
                        desc: "Filter fulfillment schedules by All, On Track, Due Soon (15-30d), and Overdue lots with live count chips."
                    },
                    {
                        title: "Lot-Wise Balance & Adherence",
                        desc: "Inspect scheduled date, order quantity, pending lot balance, and supplier delivery adherence at a single glance."
                    }
                ]
            },
            {
                id: "pa-tour-futuristic-schedule",
                targetSelector: "[data-spotlight='pa-futuristic-schedule-btn']",
                fallbackSelector: "[data-spotlight='pa-fs-header-row'], [data-spotlight='pa-fs-main-tabs'], #pa-fulfillment-schedule-section",
                navItem: "Reports",
                navSubItem: "Purchase Analysis",
                tabAction: "futuristic",
                tabDesc: "Switched to predictive reorder timeline and safety buffer runout forecast.",
                title: "Futuristic Expected Schedule",
                category: "Predictive Procurement",
                badge: "Step 9 of 13 • AI Predictive ROL",
                iconName: "Sparkles",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Next-generation procurement forecasting calculating futuristic reorder levels, expected lead times, buffer stock depletion, and proactive replenishment alerts.",
                subItems: [
                    {
                        title: "Predictive In-Card Tab Switcher",
                        desc: "Seamlessly switch from standard supplier fulfillment to the futuristic predictive schedule model within the same card."
                    },
                    {
                        title: "Safety Buffer & Replenishment Alerts",
                        desc: "Identifies high-velocity items nearing safety limits with projected stockout dates and automated procurement trigger recommendations."
                    }
                ]
            },
            {
                id: "qa-tour-report-filters",
                targetSelector: "[data-spotlight='qa-report-filters'], .qa2-filter-card",
                fallbackSelector: ".qa2-filter-card",
                navItem: "Reports",
                navSubItem: "Quality Analysis",
                title: "Quality Report Filters",
                category: "Telemetry & Filtering",
                badge: "Step 10 of 13 • Global Quality Filters",
                iconName: "SlidersHorizontal",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Centralized filtering deck providing fine-grained control over inspection records, customer consignments, part numbers, machine work-centers, and defect categories.",
                subItems: [
                    {
                        title: "Multi-Parameter Filter Matrix",
                        desc: "Combine Date Range presets with multi-select dropdowns for Customers, Operators, Machines, and Processes."
                    },
                    {
                        title: "Disposition & Stage Badges",
                        desc: "Quickly isolate records by inspection type (Inward, In-Process, Final, Jobwork) or disposition (Rejection vs Rework)."
                    }
                ]
            },
            {
                id: "qa-tour-operator-rejection",
                targetSelector: "[data-spotlight='qa-operator-rejection'] .qa2-head, [data-spotlight='qa-operator-rejection']",
                fallbackSelector: "[data-spotlight='qa-operator-rejection'], .qa2-rej-table-card",
                navItem: "Reports",
                navSubItem: "Quality Analysis",
                title: "Operator wise Rejection",
                category: "Workmanship Analysis",
                badge: "Step 11 of 13 • Operator Accountability",
                iconName: "UserCheck",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Granular operator quality audit attributing material vs machining defects per operator and part line, with integrated view switching and multi-select filters.",
                subItems: [
                    {
                        title: "Dual Grid & Chart View",
                        desc: "Switch seamlessly between row-by-row operator rejection tables and comparative Pareto bar charts."
                    },
                    {
                        title: "Material vs Machining Classification",
                        desc: "Distinguishes incoming raw material defects from operational machining rejections to ensure fair performance tracking."
                    }
                ]
            },
            {
                id: "qa-tour-machine-rejection",
                targetSelector: "[data-spotlight='qa-machine-rejection'] .qa2-head, [data-spotlight='qa-machine-rejection']",
                fallbackSelector: "[data-spotlight='qa-machine-rejection'], .qa2-rej-table-card",
                navItem: "Reports",
                navSubItem: "Quality Analysis",
                title: "Machine wise Rejection",
                category: "Equipment Quality",
                badge: "Step 12 of 13 • Machine & Tooling Health",
                iconName: "Cpu",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Machine-centric quality performance deck analyzing defect concentration across production machines, CNC centers, and tool fixtures.",
                subItems: [
                    {
                        title: "Tooling Variance & Defect Spikes",
                        desc: "Pinpoints specific machines generating abnormal machine scrap or dimensional rejections."
                    },
                    {
                        title: "In-Card Machine Selector",
                        desc: "Instant multi-select dropdown to isolate individual equipment lines or compare work center groups."
                    }
                ]
            },
            {
                id: "qa-tour-quality-timeline",
                targetSelector: "[data-spotlight='qa-timeline-header'], [data-spotlight='qa-timeline'] .qa2-timeline-header, #quality-timeline-section",
                fallbackSelector: "[data-spotlight='qa-timeline'], .quality-timeline-section, .qa2-timeline-container",
                navItem: "Reports",
                navSubItem: "Quality Analysis",
                title: "Interactive Quality Timeline",
                category: "Traceability Pipeline",
                badge: "Step 13 of 13 • End-to-End Lineage",
                iconName: "Layers",
                placement: "bottom",
                align: "start",
                isExpandable: false,
                description: "Six-stage end-to-end quality pipeline tracing part provenance from customer dispatch invoices back to supplier raw material mill heat numbers.",
                subItems: [
                    {
                        title: "6-Stage Interactive Audit Trail",
                        desc: "Tracks Customer Invoice → DC → Final PDI → Production Routecard → Inward GRN → Supplier Mill."
                    },
                    {
                        title: "Hierarchical Invoice Selector",
                        desc: "Switch active customer invoices and part numbers directly from the search-enabled dropdown."
                    }
                ]
            }
        ],
        tips: [
            {
                id: "tip-250-1",
                title: "Maximize Side-by-Side Tables",
                category: "Productivity",
                type: "PRO TIP",
                icon: "Maximize2",
                summary: "Expand compact side-by-side PO and Schedule analysis cards into full-width wide data tables with one click.",
                steps: [
                    "Locate the Maximize button (⤢) at the top-right corner of the Pending PO Summary or Schedule Analysis card.",
                    "Click it to expand the table across the entire width of your screen for effortless reading of all columns.",
                    "Click again to restore the comfortable side-by-side view anytime."
                ],
                actionLabel: "Open Sales Analysis",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-250-2",
                title: "PO Date vs Schedule Wise Backlog",
                category: "Reports",
                type: "BEST PRACTICE",
                icon: "Calendar",
                summary: "Analyze customer purchase order backlogs sorted by initial PO issue date or committed delivery schedule.",
                steps: [
                    "Use the segmented toggle button on top of 'Pending PO Summary' to switch between 'Po Date Wise' and 'Po Sch Wise'.",
                    "Filter by customer or part number using the instant search box.",
                    "Inspect the highlighted orange balance pill to quickly identify unfulfilled purchase orders."
                ],
                actionLabel: "View Pending POs",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-250-3",
                title: "Live Despatch Planning & CSV Export",
                category: "Operations",
                type: "NEW FEATURE",
                icon: "Zap",
                summary: "Monitor live warehouse dispatch readiness and download formatted dispatch schedules for logistics teams.",
                steps: [
                    "Check the 'Live' auto-sync badge and live 'Total Inv Value' header in the Despatch Planning card.",
                    "Filter rows by customer, part number, or delivery status pill.",
                    "Click 'Export CSV' to generate and share dispatch checklists instantly."
                ],
                actionLabel: "Check Despatch Plan",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-250-4",
                title: "Channel & Invoice Type Segmentation",
                category: "Reports",
                type: "PRO TIP",
                icon: "TrendingUp",
                summary: "Isolate Commercial Sales, Labour Jobwork, and Export revenues in Customer & Part-Wise Sales Analysis.",
                steps: [
                    "Click the Type dropdown filter on the 'Customer & Part-Wise Sales Analysis' card header.",
                    "Select Sales, Labour, or Export to recalculate line items and turnover totals dynamically.",
                    "Combine with customer multi-select to audit specific account revenue channels."
                ],
                actionLabel: "Analyze Channels",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-250-5",
                title: "Part Rate Intelligence & Price Variance",
                category: "Pricing",
                type: "NEW FEATURE",
                icon: "Shield",
                summary: "Track unit rate revisions, quotation history, and historical price variances for any manufactured part.",
                steps: [
                    "Use the catalog search box in 'Part-wise History & Rate Intelligence' to pick any part number.",
                    "Review the Hero KPI banner for active selling rate, base rate, and percentage variance.",
                    "Inspect the chronological amendment ledger below for past revision dates, invoice counts, and buyers."
                ],
                actionLabel: "Explore Rate Intelligence",
                actionTarget: "Sales Analysis"
            },
            {
                id: "tip-250-6",
                title: "Average Purchase Value (Raw vs Store Materials)",
                category: "Procurement",
                type: "PRO TIP",
                icon: "TrendingUp",
                summary: "Benchmark procurement prices and compare average purchase rates across Raw Material and Store Material categories.",
                steps: [
                    "Navigate to Reports → Purchase Analysis and locate the 'Average Purchase Value' card.",
                    "Switch between the 'Raw Material' and 'Store Material' tabs to view category-specific pricing averages.",
                    "Evaluate item-level purchase variances to identify cost savings and negotiate better vendor volume discounts."
                ],
                actionLabel: "Open Purchase Analysis",
                actionTarget: "Purchase Analysis"
            },
            {
                id: "tip-250-7",
                title: "Advanced Purchase Analytics & Top Spends",
                category: "Analytics",
                type: "NEW FEATURE",
                icon: "Sparkles",
                summary: "Uncover high-impact procurement trends, supplier concentration, and spend variance with deep analytics.",
                steps: [
                    "Scroll to the 'Advanced Purchase Analytics' section in Purchase Analysis.",
                    "Toggle between Spend Views to visualize monthly procurement outflow and top vendor concentration.",
                    "Use interactive filters to dissect expense trends across custom date ranges and product lines."
                ],
                actionLabel: "Explore Purchase Analytics",
                actionTarget: "Purchase Analysis"
            },
            {
                id: "tip-250-8",
                title: "PO Fulfillment Schedule & Overdue Tracking",
                category: "Operations",
                type: "BEST PRACTICE",
                icon: "Calendar",
                summary: "Track supplier delivery commitments, lot-wise schedule dates, and overdue purchase shipments.",
                steps: [
                    "Select the 'PO Fulfillment Schedule' tab on the fulfillment card in Purchase Analysis.",
                    "Click the 'Due Soon' or 'Overdue' status pills to highlight lots requiring immediate follow-up.",
                    "Inspect pending lot balances and supplier contact details to prevent manufacturing bottlenecks."
                ],
                actionLabel: "Track Fulfillment",
                actionTarget: "Purchase Analysis"
            },
            {
                id: "tip-250-9",
                title: "Futuristic Expected Schedule & ROL Forecast",
                category: "Predictive AI",
                type: "PRO TIP",
                icon: "Sparkles",
                summary: "Anticipate stock depletion, calculate buffer days, and automate reorder planning with predictive analytics.",
                steps: [
                    "Switch to the 'Futuristic Expected Schedule' tab in Purchase Analysis.",
                    "Review projected stock runout dates and safety buffer cushions for key production materials.",
                    "Generate proactive purchase orders based on AI-forecasted lead times before stockouts occur."
                ],
                actionLabel: "View Futuristic Schedule",
                actionTarget: "Purchase Analysis"
            },
            {
                id: "tip-250-10",
                title: "Quality Report Filters & Multiselect Matrix",
                category: "Quality Filters",
                type: "BEST PRACTICE",
                icon: "SlidersHorizontal",
                summary: "Filter complex inspection records, customer consignments, and defect categories across custom date ranges.",
                steps: [
                    "Navigate to Reports → Quality Analysis to access the top filter card.",
                    "Select specific Customers, Operators, Machines, and Processes to narrow down quality telemetry.",
                    "Use Disposition quick badges (Rejection vs Rework) to immediately isolate defect volume."
                ],
                actionLabel: "Open Quality Analysis",
                actionTarget: "Quality Analysis"
            },
            {
                id: "tip-250-11",
                title: "Operator wise Rejection Attribution",
                category: "Operator Analytics",
                type: "PRO TIP",
                icon: "UserCheck",
                summary: "Evaluate operator performance and isolate incoming material flaws from operational machining defects.",
                steps: [
                    "Locate the 'Operator wise Rejection' card in Quality Analysis.",
                    "Toggle between Grid View and Chart View for tabular precision or visual Pareto comparison.",
                    "Filter by specific operators to target skill development and training where machine rejection spikes occur."
                ],
                actionLabel: "Inspect Operator Rejection",
                actionTarget: "Quality Analysis"
            },
            {
                id: "tip-250-12",
                title: "Machine wise Rejection & Tooling Quality",
                category: "Equipment Quality",
                type: "PRO TIP",
                icon: "Cpu",
                summary: "Identify defect concentration across CNC centers, tool fixtures, and processing work stations.",
                steps: [
                    "Locate the 'Machine wise Rejection' card in Quality Analysis.",
                    "Use the multi-select machine dropdown to isolate specific work centers and tooling lines.",
                    "Audit machine rework vs outright scrap to schedule proactive tool changes and preventative maintenance."
                ],
                actionLabel: "Inspect Machine Rejection",
                actionTarget: "Quality Analysis"
            },
            {
                id: "tip-250-13",
                title: "6-Stage End-to-End Quality Lineage Pipeline",
                category: "Traceability",
                type: "NEW FEATURE",
                icon: "Layers",
                summary: "Trace part provenance from customer dispatch invoices back to supplier raw material heat numbers.",
                steps: [
                    "Scroll down to the 'Quality Timeline' card in Quality Analysis.",
                    "Select any invoice or part number from the hierarchical dropdown selector.",
                    "Click on any of the 6 pipeline stages to inspect inspection sheets, route cards, and certification records."
                ],
                actionLabel: "Explore Quality Timeline",
                actionTarget: "Quality Analysis"
            }
        ]
    },
    {
        version: "v2.4.0",
        label: "v2.4.0 (Previous Release)",
        releaseDate: "September 2026",
        isCurrent: false,
        tagline: "Dynamic Analytics, Intelligent KPI Dashboards & Streamlined Approvals",
        highlights: [
            "Spotlight Guide & Command Palette (Ctrl + K)",
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
                badge: "Module 1 of 8",
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
                badge: "Module 2 of 8",
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
                badge: "Module 3 of 8",
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
                badge: "Module 4 of 8",
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
                badge: "Module 5 of 8",
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
                badge: "Module 6 of 8",
                description: "Role-based access control and approval governance:",
                subItems: [
                    { title: "User Rights", desc: "Assign and restrict module access permissions per user profile." },
                    { title: "Users Setting", desc: "Configure monetary approval limits and threshold governance for E-Approvals." }
                ],
                placement: "right",
                iconName: "ShieldAlert"
            },
            {
                id: "menu-Spotlight",
                targetSelector: "[data-tour='menu-Spotlight']",
                fallbackSelector: "[data-spotlight='dl-command-palette-trigger'], .wh-spotlight-hero-btn, .dl-sidebar__item",
                autoOpenMenu: null,
                title: "Spotlight Navigator & Command Palette",
                category: "Productivity & Search",
                badge: "Module 7 of 8",
                kbdShortcut: "Ctrl + K",
                description: "Instant universal search across the entire Business Analytics ecosystem. Launch the Command Palette from here or press Ctrl + K anywhere to jump directly to any report, approval, or KPI card with real-time DOM highlighting.",
                subItems: [
                    { title: "Universal Command Search", desc: "Instantly locate 100+ indexed reports, vouchers, master data, and settings." },
                    { title: "Visual Pulsing Spotlight", desc: "Directly routes to target modules and illuminates the exact control with a live halo." },
                    { title: "Keyboard Quick-Trigger", desc: "Press Ctrl+K (Cmd+K) or '/' from any screen for rapid keyboard navigation." }
                ],
                placement: "right",
                iconName: "Sparkles"
            },
            {
                id: "menu-Settings",
                targetSelector: "[data-tour='menu-Settings']",
                fallbackSelector: ".dl-sidebar__item",
                autoOpenMenu: null,
                title: "Settings, Tips & Subscriptions",
                category: "System Configuration",
                badge: "Module 8 of 8",
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
            },
            {
                id: "tip-240-6",
                title: "Instant Navigation with Spotlight Guide",
                category: "Productivity",
                type: "SHORTCUT",
                icon: "Sparkles",
                summary: "Press Ctrl + K anytime to open the Spotlight Command Palette and jump directly to any KPI, report, or approval.",
                steps: [
                    "Press Ctrl + K (or Cmd + K on macOS) anywhere across the application.",
                    "Start typing to search 100+ indexed reports, KPIs, approval workflows, or settings.",
                    "Press Enter or click any result to jump directly to the target element with a live glowing spotlight halo."
                ],
                actionLabel: "Launch Spotlight",
                actionTarget: "Spotlight"
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
