import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    CheckCircle2, Package, FileText, CheckCircle, Info, ArrowUpRight, ArrowRight,
    ArrowUp, Search, X, ChevronDown, Check, Building2, Truck, Layers,
    ShieldCheck, Copy, ChevronRight, ChevronLeft, Award, Sparkles, Cpu,
    Factory, FileSpreadsheet, Flame, Beaker, CheckCheck, Loader2, Filter
} from "lucide-react";

//  QUALITY TIMELINE DATA & COMPONENT
//  Pipeline sequence in exact order:
//  Invoice No ---> DC ---> Final Insp --->
//  Production (Inhouse & Job Order) with Quality Insp --->
//  GRN Tracking ---> Supplier Details
// ─────────────────────────────────────────────────────────────────────────────

//  QUALITY TIMELINE BACKEND DATA TRANSFORMER & SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export const formatTimelineCurrency = (val) => {
    const num = Number(val || 0);
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

export const transformBackendTimeline = (backendData) => {
    if (!backendData || !backendData.invoice) return null;
    const inv = backendData.invoice;
    const rawParts = backendData.parts || [];
    const stages = backendData.stages || {};

    const s1 = stages.stage1?.data || {};
    const s2 = stages.stage2?.data || {};
    const s3 = stages.stage3?.data || {};
    const s4 = stages.stage4?.data || {};
    const s5 = stages.stage5?.data || {};
    const s6 = stages.stage6?.data || {};

    const totValFormatted = formatTimelineCurrency(inv.invoice_value);
    const totBilledQty = rawParts.reduce((acc, p) => acc + Number(p.billed_qty || 0), 0);

    // Build common 6 stages
    const mappedStages = [
        {
            step: 1,
            key: "invoice",
            title: "Invoice No",
            subtitle: "Billing & Commercial Release",
            iconName: "FileSpreadsheet",
            badge: s1.invoice_no || inv.invoice_no,
            badgeColor: "#3b82f6",
            accentColor: "#2563eb",
            status: stages.stage1?.status || "Verified",
            metrics: [
                { label: "Invoice Number", value: s1.invoice_no || inv.invoice_no, highlight: true },
                { label: "Invoice Date", value: s1.invoice_date || inv.invoice_date || "-" },
                { label: "Billed Quantity", value: `${s1.billed_qty ?? totBilledQty} ${s1.uom || 'Nos'}`, highlight: true },
                { label: "Unit Rate", value: formatTimelineCurrency(s1.unit_rate) },
                { label: "Taxable Subtotal", value: formatTimelineCurrency(s1.taxable_subtotal ?? s1.amount) },
                { label: "GST", value: formatTimelineCurrency(s1.gst) },
                { label: "Total Net Payable", value: formatTimelineCurrency(s1.total_net_payable || inv.invoice_value), highlight: true },
                { label: "Customer PO Ref", value: s1.customer_po_ref || "-" },
                { label: "PO Order Date", value: s1.po_order_date || "-" },
                { label: "IRN / QR Code", value: s1.irn_qr_code || "-" },
            ],
            notes: "Commercial invoice verified against billing ledger and customer purchase order.",
            records: s1.records || [],
        },
        {
            step: 2,
            key: "dc",
            title: "DC (Delivery Challan)",
            subtitle: "Outward Logistics & Movement",
            iconName: "Truck",
            badge: s2.dc_no || "No DC",
            badgeColor: "#8b5cf6",
            accentColor: "#7c3aed",
            status: stages.stage2?.status || "Pending",
            metrics: [
                { label: "Delivery Challan No", value: s2.dc_no || "-", highlight: true },
                { label: "Challan Date & Time", value: s2.dc_date || "-" },
                { label: "Dispatched Quantity", value: `${s2.dispatched_qty ?? 0} ${s2.uom || 'Nos'}`, highlight: true },
                { label: "Vehicle Number", value: s2.vehicle_no || "-", highlight: true },
                { label: "Transporter Name", value: s2.transporter_name || "-" },
                { label: "E-Way Bill Number", value: s2.eway_bill_no || "-" },
                { label: "GRN/PO Det", value: s2.grn_po_reference || "-", highlight: true },
            ],
            records: s2.records || [],
            notes: "Delivery Challan outward movement verified with vehicle and gate pass authentication.",
        },
        {
            step: 3,
            key: "finalInsp",
            title: "Final Insp",
            subtitle: "Finished Goods Inspection & Quality Release",
            iconName: "CheckCheck",
            badge: s3.final_insp_no || (s3.operations?.[0]?.inspection_no) || "QA Verified",
            badgeColor: "#10b981",
            accentColor: "#059669",
            status: stages.stage3?.status || "Pending",
            metrics: [
                { label: "Final Insp Report No", value: s3.final_insp_no || "-", highlight: true },
                { label: "Inspection Date", value: s3.inspection_date || "-" },
                { label: "Total Quantity", value: `${s3.total_qty ?? 0} Nos`, highlight: true },
                { label: "Inspected Quantity", value: `${s3.inspected_qty ?? 0} Nos` },
                { label: "Rejection Quantity", value: `${s3.rej_qty ?? 0} Nos` },
                { label: "Rework Quantity", value: `${s3.rw_qty ?? 0} Nos` },
                { label: "Route Card", value: s3.routecard_no || "-", highlight: true },
                { label: "Inspector", value: s3.insp_by || "QA Inspection Team" },
            ],
            inspectionRecords: (s3.operations || []).map((op, idx) => ({
                routeCard: op.routecard_no || s3.routecard_no || "-",
                op: op.process_code || `OP${(idx + 1) * 10}`,
                process: op.process_name || "Inspection",
                machine: op.machine || "-",
                shift: op.shift || "General",
                totQty: op.total_qty ?? 0,
                inspQty: op.total_qty ?? 0,
                okQty: (op.total_qty ?? 0) - (op.rej_qty ?? 0),
                rejQty: op.rej_qty ?? 0,
                rwQty: op.rw_qty ?? 0,
                inspectedBy: s3.insp_by || "QA Team",
                verdict: (op.rej_qty && op.rej_qty > 0) ? "PARTIAL" : "PASS",
            })),
            notes: "Finished goods 100% inspection completed and certified under QA inspection parameters.",
        },
        {
            step: 4,
            key: "production",
            title: "Production (Inhouse & Job Order) with Quality Insp",
            subtitle: "Shopfloor Routing & IPQA Process Verification",
            iconName: "Factory",
            badge: s4.route_card_no || s3.routecard_no || "Pending",
            badgeColor: "#f59e0b",
            accentColor: "#d97706",
            status: stages.stage4?.status || "Pending",
            routeCardNo: s4.route_card_no || s3.routecard_no || "-",
            summary: s4.summary || {},
            metrics: [
                { label: "Route Card Number", value: s4.route_card_no || s3.routecard_no || "-", highlight: true },
                { label: "Production Qty", value: `${s4.summary?.production_qty ?? 0} Nos`, highlight: true },
                { label: "Inter Insp Qty", value: `${s4.summary?.inter_inspection_qty ?? 0} Nos` },
                { label: "Job Order Qty", value: `${s4.summary?.job_qty ?? 0} Nos` },
                { label: "Rejection Qty", value: `${s4.summary?.rejection_qty ?? 0} Nos` },
                { label: "Rework Qty", value: `${s4.summary?.rework_qty ?? 0} Nos` },
            ],
            inhouseOps: (s4.cnc_production || []).concat(s4.conventional_production || []).map((cp, idx) => ({
                op: cp.process_code || `OP${(idx + 1) * 10}`,
                name: cp.process_name || "Machining Operation",
                process: cp.process_name || "Machining Operation",
                machine: cp.machine || "-",
                operator: cp.operator || cp.shift || "Operator",
                cycleTime: cp.cycle_time ? `${cp.cycle_time}s` : "-",
                okQty: `${cp.ok_qty ?? 0} Nos`,
                rejQty: cp.rej_qty || 0,
                shift: cp.shift || "SH-1",
                status: "COMPLETED",
            })),
            jobOrder: {
                vendorName: s4.job_orders?.[0]?.subcontractor || "Subcontractor",
                subcontractDC: s4.job_orders?.[0]?.income_no || "-",
                inwardChallan: s4.job_orders?.[0]?.job_no || "-",
                items: (s4.job_orders || []).map((jo, idx) => ({
                    op: jo.process_code || `SUB0${idx + 1}`,
                    name: jo.process_name || "Subcontract Process",
                    process: jo.process_name || "Subcontract Process",
                    qty: `${jo.qty ?? 0} Nos`,
                    dcNo: jo.income_no || "-",
                    inDate: jo.job_date || "-",
                    status: "RECEIVED & VERIFIED",
                })),
            },
            notes: "Manufacturing operations completed with serialized touch routing and IPQA logs.",
        },
        {
            step: 5,
            key: "grn",
            title: "GRN Tracking",
            subtitle: "Inward Raw Material Receipt & Store Verification",
            iconName: "Package",
            badge: s5.grn_no || "No GRN",
            badgeColor: "#06b6d4",
            accentColor: "#0891b2",
            status: stages.stage5?.status || "Pending",
            routeCardNo: s5.route_card_no || s4.route_card_no || s3.routecard_no || "-",
            metrics: [
                { label: "GRN Number", value: s5.grn_no || "-", highlight: true },
                { label: "GRN Inward Date", value: s5.grn_inward_date || "-", highlight: true },
                { label: "GRN Qty", value: (s5.grn_qty ?? s5.material_qty) != null ? Number(s5.grn_qty ?? s5.material_qty).toLocaleString('en-IN') : "-", highlight: true },
                { label: "Routecard No", value: s5.route_card_no || s4.route_card_no || s3.routecard_no || "-", highlight: true },
            ],
            grnRecords: (s5.records || []).map((gr) => ({
                routeCardNo: gr.route_card_no || s5.route_card_no || "-",
                grnNo: gr.grn_no || s5.grn_no,
                grnDate: gr.grn_date || s5.grn_inward_date || "-",
                materialQty: Number(gr.grn_qty ?? gr.material_qty ?? 0).toLocaleString('en-IN'),
                grnQty: Number(gr.grn_qty ?? gr.material_qty ?? 0).toLocaleString('en-IN'),
                uom: gr.uom || s5.uom || "Kg",
                okQty: Number(gr.ok_qty || gr.grn_qty || gr.material_qty || 0).toLocaleString('en-IN'),
                rejQty: String(gr.rej_qty || 0),
                inspBy: gr.insp_by || "Store Inspector",
                verdict: gr.verdict || "PASS",
            })),
            notes: "Raw material inward received and verified against store purchase specifications.",
        },
        {
            step: 6,
            key: "supplier",
            title: "Supplier Details",
            subtitle: "Tier-1 Mill Approval & Vendor Audit Performance",
            iconName: "Building2",
            badge: s6.supplier_name ? (s6.supplier_name.length > 22 ? s6.supplier_name.slice(0, 20) + "..." : s6.supplier_name) : "No Supplier",
            badgeColor: "#ec4899",
            accentColor: "#db2777",
            status: stages.stage6?.status || "Not Available",
            metrics: [
                { label: "Supplier / Mill Name", value: s6.supplier_name || "-", highlight: true },
                { label: "Raw Material PO Ref", value: s6.raw_material_po_ref || "-", highlight: true },
                { label: "Po Date", value: s6.po_date || "-", highlight: true },
                { label: "Qty", value: s6.qty ? Number(s6.qty).toLocaleString('en-IN') : "-", highlight: true },
                { label: "Uom", value: s6.uom || "Kg", highlight: true },
            ],
            supplierRecords: (s6.records || []).map((sr) => ({
                supplierName: sr.supplier_name || s6.supplier_name,
                poRef: sr.raw_material_po_ref || s6.raw_material_po_ref || "-",
                poDate: sr.po_date || s6.po_date || "-",
                qty: Number(sr.qty !== undefined && sr.qty !== null ? sr.qty : (s6.qty || 0)).toLocaleString('en-IN', { maximumFractionDigits: 3 }),
                uom: sr.uom || s6.uom || "Kg",
                status: sr.approval_status || "APPROVED",
            })),
            vendorRating: s6.vendor_rating || (s6.supplier_name ? "Tier-1 Approved Mill" : "Not Available"),
            rejectionPpm: s6.rejection_ppm || (s6.supplier_name ? "0 PPM (Zero Defect)" : "Not Available"),
            traceability: s6.traceability || (s6.supplier_name ? "100% Heat Lot Matched" : "Not Available"),
            notes: "Raw material supplier traceability linked through inward store and purchase orders.",
        },
    ];

    // Parts list
    const parts = rawParts.length > 0
        ? rawParts.map((p, idx) => ({
            partNo: p.part_no,
            partDescription: p.description || p.part_no,
            batchLot: s4.route_card_no ? `RC-${s4.route_card_no}` : `LOT-ITEM-${idx + 1}`,
            billedQty: `${p.billed_qty} ${p.uom || 'Nos'}`,
            partValue: formatTimelineCurrency(p.part_value),
            auditRating: "100%",
            qualityStatus: "Passed & QA Stamped",
            dispatchStatus: "Dispatched",
            stages: mappedStages,
        }))
        : [
            {
                partNo: s1.part_no || inv.invoice_no || "PART",
                partDescription: s1.description || "Part Item",
                batchLot: s4.route_card_no ? `RC-${s4.route_card_no}` : "LOT-01",
                billedQty: `${s1.billed_qty ?? totBilledQty} ${s1.uom || 'Nos'}`,
                partValue: totValFormatted,
                auditRating: "100%",
                qualityStatus: "Passed & QA Stamped",
                dispatchStatus: "Dispatched",
                stages: mappedStages,
            }
        ];

    return {
        id: inv.invoice_no,
        customer: inv.customer_name || "Customer",
        invoice_date: inv.invoice_date,
        totalValue: totValFormatted,
        billedQty: `${totBilledQty} Nos`,
        auditRating: "100%",
        qualityStatus: "Passed & QA Stamped",
        dispatchStatus: "Dispatched & Delivered",
        parts: parts,
        stages: mappedStages,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Normalize invoice parts for multi-part invoice support
// ─────────────────────────────────────────────────────────────────────────────
export const getInvoiceParts = (inv) => {
    if (!inv) return [];
    if (inv.parts && Array.isArray(inv.parts) && inv.parts.length > 0) {
        return inv.parts;
    }
    return [
        {
            partNo: inv.partNo || inv.id || "PART",
            partDescription: inv.partDescription || "",
            batchLot: inv.batchLot || "",
            billedQty: inv.billedQty || "",
            partValue: inv.totalValue || "",
            auditRating: inv.auditRating || "100%",
            qualityStatus: inv.qualityStatus || "Verified",
            dispatchStatus: inv.dispatchStatus || "Dispatched",
            stages: inv.stages || []
        }
    ];
};

function QualityTimelineSection({ isRouteCardProd: propIsRouteCardProd = null }) {
    const [invoicesList, setInvoicesList] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const [selectedInvId, setSelectedInvId] = useState("");
    const [selectedPartNo, setSelectedPartNo] = useState("");
    const [timelineData, setTimelineData] = useState(null);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [timelineError, setTimelineError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);
    const [selectedStageModal, setSelectedStageModal] = useState(null); // 1..6 or null
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [lineItemDropdownOpen, setLineItemDropdownOpen] = useState(false);
    const [prodTab, setProdTab] = useState("ALL"); // "ALL" | "INHOUSE" | "SUBCONTRACT"
    const dropdownRef = useRef(null);
    const lineItemDropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // ── 1. Route Card Production Setting (from CompanySetting.IsRouteCardProd) ──
    const [isRouteCardProd, setIsRouteCardProd] = useState(() => {
        if (propIsRouteCardProd !== null && propIsRouteCardProd !== undefined) {
            return Number(propIsRouteCardProd);
        }
        return 1;
    });

    useEffect(() => {
        if (propIsRouteCardProd !== null && propIsRouteCardProd !== undefined) {
            setIsRouteCardProd(Number(propIsRouteCardProd));
            return;
        }
        let isMounted = true;
        fetch("/api/quality-analysis/settings/", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (isMounted && data && (data.is_route_card_prod !== undefined || data.IsRouteCardProd !== undefined)) {
                    setIsRouteCardProd(Number(data.is_route_card_prod ?? data.IsRouteCardProd));
                }
            })
            .catch(() => { });
        return () => { isMounted = false; };
    }, [propIsRouteCardProd]);

    const isRouteCardEnabled = isRouteCardProd !== 0;

    // ── 2. Fetch Invoices List from Backend (Deferred to prioritize KPI dashboard load) ──
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(() => {
            setLoadingInvoices(true);
            fetch("/api/quality-timeline/invoices/?limit=100", { credentials: "include" })
                .then((res) => res.json())
                .then((data) => {
                    if (isMounted && data && data.success && Array.isArray(data.data) && data.data.length > 0) {
                        setInvoicesList(data.data);
                        setSelectedInvId((prev) => prev || data.data[0].invoice_no);
                    }
                })
                .catch((err) => {
                    console.error("[Quality Timeline] Invoices list fetch error:", err);
                })
                .finally(() => {
                    if (isMounted) setLoadingInvoices(false);
                });
        }, 1200);
        return () => { isMounted = false; clearTimeout(timer); };
    }, []);

    // ── 3. Search Invoices from Backend if search query changes ──
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            return;
        }
        const timer = setTimeout(() => {
            fetch(`/api/quality-timeline/invoices/search/?q=${encodeURIComponent(searchQuery.trim())}`, { credentials: "include" })
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.success && Array.isArray(data.data)) {
                        setInvoicesList((prev) => {
                            const existingMap = new Map(prev.map((i) => [i.invoice_no, i]));
                            data.data.forEach((item) => existingMap.set(item.invoice_no, item));
                            return Array.from(existingMap.values());
                        });
                    }
                })
                .catch(() => { });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── 4. Fetch Full 6-Stage Timeline whenever selectedInvId changes ──
    useEffect(() => {
        if (!selectedInvId) return;
        let isMounted = true;
        setLoadingTimeline(true);
        setTimelineError(null);

        fetch(`/api/quality-timeline/${encodeURIComponent(selectedInvId)}/`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (!isMounted) return;
                if (data && data.success && data.data) {
                    const transformed = transformBackendTimeline(data.data);
                    setTimelineData(transformed);
                    if (transformed && transformed.parts && transformed.parts.length > 0) {
                        setSelectedPartNo(transformed.parts[0].partNo);
                    }
                } else {
                    setTimelineError(data?.message || "Failed to load timeline");
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error("[Quality Timeline] Timeline load error:", err);
                    setTimelineError("Unable to connect or load timeline for this invoice");
                }
            })
            .finally(() => {
                if (isMounted) setLoadingTimeline(false);
            });

        return () => { isMounted = false; };
    }, [selectedInvId]);

    const activeInvoice = useMemo(() => {
        if (timelineData) return timelineData;
        return {
            id: selectedInvId || "Loading...",
            customer: loadingInvoices ? "Loading invoices..." : "Select Invoice",
            totalValue: "₹ 0",
            billedQty: "0 Nos",
            parts: [],
            stages: []
        };
    }, [timelineData, selectedInvId, loadingInvoices]);

    const activePartsList = useMemo(() => {
        return getInvoiceParts(activeInvoice);
    }, [activeInvoice]);

    const activePart = useMemo(() => {
        const found = activePartsList.find((p) => p.partNo === selectedPartNo);
        return found || activePartsList[0] || {
            partNo: "-",
            partDescription: "-",
            billedQty: "-",
            partValue: "-",
            stages: []
        };
    }, [activePartsList, selectedPartNo]);

    const activeStages = useMemo(() => {
        const rawStages = activePart.stages || activeInvoice.stages || [];
        if (!isRouteCardEnabled) {
            // When IsRouteCardProd = 0, hide / filter out the Route Card Production stage
            return rawStages.filter((s) => s.step !== 4 && s.key !== "production");
        }
        return rawStages;
    }, [activePart, activeInvoice, isRouteCardEnabled]);

    const handleSelectInvoice = (invId) => {
        setSelectedInvId(invId);
        setDropdownOpen(false);
        setLineItemDropdownOpen(false);
        setSearchQuery("");
    };

    // Auto-focus search input when dropdown opens
    useEffect(() => {
        if (dropdownOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 60);
        }
    }, [dropdownOpen]);

    const mappedInvoices = useMemo(() => {
        return (invoicesList || []).map((inv) => ({
            id: inv.invoice_no,
            customer: inv.customer_name || "Unknown Customer",
            totalValue: formatTimelineCurrency(inv.invoice_value),
            partsCount: inv.parts_count || 1,
            date: inv.invoice_date || ""
        }));
    }, [invoicesList]);

    const filteredInvoices = useMemo(() => {
        if (!mappedInvoices || mappedInvoices.length === 0) return [];
        if (!searchQuery.trim()) {
            return mappedInvoices;
        }
        const q = searchQuery.toLowerCase();
        return mappedInvoices.filter((inv) => {
            return (
                inv.id.toLowerCase().includes(q) ||
                inv.customer.toLowerCase().includes(q) ||
                inv.totalValue.toLowerCase().includes(q)
            );
        });
    }, [mappedInvoices, searchQuery]);

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (lineItemDropdownRef.current && !lineItemDropdownRef.current.contains(event.target)) {
                setLineItemDropdownOpen(false);
            }
        };
        if (dropdownOpen || lineItemDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownOpen, lineItemDropdownOpen]);

    // Handle ESC key to close modal or dropdown & lock background scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedStageModal(null);
                setDropdownOpen(false);
                setLineItemDropdownOpen(false);
            }
        };
        if (selectedStageModal !== null) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [selectedStageModal]);

    const modalStageData = useMemo(() => {
        if (selectedStageModal === null) return null;
        return activeStages.find((s) => s.step === selectedStageModal) || null;
    }, [activeStages, selectedStageModal]);

    const handleCopyAuditTrail = () => {
        const text = [
            `========================================================================`,
            `  QUALITY TIMELINE AUDIT TRAIL — ${activeInvoice.id}`,
            `========================================================================`,
            `Customer:     ${activeInvoice.customer}`,
            `Part No:      ${activePart.partNo} — ${activePart.partDescription}`,
            `Batch Lot:    ${activePart.batchLot}`,
            `Billed Qty:   ${activePart.billedQty} | Total: ${activePart.partValue || activeInvoice.totalValue}`,
            `Quality:      ${activePart.qualityStatus} (Score: ${activePart.auditRating})`,
            `------------------------------------------------------------------------`,
            `STAGE 01: [Invoice No]    ${activeInvoice.stages[0]?.metrics[0]?.value} (Dt: ${activeInvoice.stages[0]?.metrics[1]?.value})`,
            `STAGE 02: [DC]            ${activeInvoice.stages[1]?.metrics[0]?.value} | Veh: ${activeInvoice.stages[1]?.metrics[3]?.value}`,
            `STAGE 03: [Final Insp]    ${activeInvoice.stages[2]?.metrics[0]?.value} | Inspected: ${activeInvoice.stages[2]?.metrics[3]?.value}`,
            ...(isRouteCardEnabled && activeInvoice.stages[3] ? [
                `STAGE 04: [Production]    ${activeInvoice.stages[3].routeCardNo} | ${activeInvoice.stages[3].inhouseOps?.length || 0} Inhouse Ops + Subcontract Heat Treat`
            ] : []),
            `STAGE 05: [GRN Tracking]  ${activeInvoice.stages[4]?.metrics[0]?.value} (Dt: ${activeInvoice.stages[4]?.metrics[1]?.value}) | Mat Qty: ${activeInvoice.stages[4]?.metrics[2]?.value} ${activeInvoice.stages[4]?.metrics[3]?.value}`,
            `STAGE 06: [Supplier]      ${activeInvoice.stages[5]?.metrics[0]?.value} | PO: ${activeInvoice.stages[5]?.metrics[1]?.value} (Dt: ${activeInvoice.stages[5]?.metrics[2]?.value}) | Qty: ${activeInvoice.stages[5]?.metrics[3]?.value} ${activeInvoice.stages[5]?.metrics[4]?.value}`,
            `------------------------------------------------------------------------`,
            `Status: Complete End-to-End Quality Traceability Verified & Compliant.`,
            `Standard: ISO 9001:2015 & IATF 16949:2016 Certified Audit Trail.`,
            `========================================================================`
        ].join("\n");

        if (navigator && navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2400);
            }).catch(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2400);
            });
        } else {
            setCopied(true);
            setTimeout(() => setCopied(false), 2400);
        }
    };

    const renderStageIcon = (iconName, color, size = 18) => {
        const props = { size, style: { color, flexShrink: 0 } };
        switch (iconName) {
            case "FileSpreadsheet": return <FileSpreadsheet {...props} />;
            case "Truck": return <Truck {...props} />;
            case "CheckCheck": return <CheckCheck {...props} />;
            case "Factory": return <Factory {...props} />;
            case "Package": return <Package {...props} />;
            case "Beaker": return <Beaker {...props} />;
            case "Building2": return <Building2 {...props} />;
            default: return <ShieldCheck {...props} />;
        }
    };

    const getStageSnippet = (stage) => {
        if (!stage) return { primary: "-", secondary: "-" };
        switch (stage.step) {
            case 1: {
                const poMetric = stage.metrics?.find((m) => m.label === "Customer PO Ref");
                return {
                    primary: `${activeInvoice.billedQty || '0 Nos'} • ${activeInvoice.totalValue || '₹ 0'}`,
                    secondary: poMetric?.value && poMetric.value !== '-' ? `PO: ${poMetric.value}` : "Commercial Release"
                };
            }
            case 2: {
                const veh = stage.metrics?.find((m) => m.label === "Vehicle Number");
                const transp = stage.metrics?.find((m) => m.label === "Transporter Name");
                return {
                    primary: veh?.value && veh.value !== '-' ? veh.value : (stage.badge || "Delivery Challan"),
                    secondary: transp?.value && transp.value !== '-' ? transp.value : (stage.status || "Dispatched")
                };
            }
            case 3: {
                const rep = stage.metrics?.find((m) => m.label === "Final Insp Report No")?.value;
                const inspBy = stage.metrics?.find((m) => m.label === "Inspector")?.value;
                const rc = stage.metrics?.find((m) => m.label === "Route Card")?.value;
                return {
                    primary: rep && rep !== '-' ? `FIR: ${rep}` : "100% QA Released",
                    secondary: rc && rc !== '-' ? `RC: ${rc} • ${inspBy || 'QA Team'}` : (inspBy || "QA Stamped & Stored")
                };
            }
            case 4: {
                const inhouseCount = stage.inhouseOps?.length || 0;
                const jobCount = stage.jobOrder?.items?.length || 0;
                return {
                    primary: inhouseCount + jobCount > 0
                        ? `${inhouseCount} Inhouse${jobCount > 0 ? ` + ${jobCount} Subcontract` : ''}`
                        : (stage.routeCardNo && stage.routeCardNo !== '-' ? `RC: ${stage.routeCardNo}` : "Production Tracking"),
                    secondary: stage.routeCardNo && stage.routeCardNo !== '-'
                        ? `Route Card: ${stage.routeCardNo}`
                        : (stage.badge || "Shopfloor Route Card")
                };
            }
            case 5: {
                const qty = stage.metrics?.find((m) => m.label === "Material Qty")?.value || "";
                const uom = stage.metrics?.find((m) => m.label === "Uom")?.value || "";
                const inwardDate = stage.metrics?.find((m) => m.label === "GRN Inward Date")?.value || "";
                return {
                    primary: qty && qty !== '-' ? `${qty} ${uom}` : (stage.badge && stage.badge !== 'No GRN' ? stage.badge : "Store Inward"),
                    secondary: stage.badge && stage.badge !== 'No GRN' ? `GRN: ${stage.badge}${inwardDate && inwardDate !== '-' ? ` • ${inwardDate}` : ''}` : "Raw Material Receipt"
                };
            }
            case 6: {
                const supp = stage.metrics?.find((m) => m.label === "Supplier / Mill Name")?.value || "";
                const poRef = stage.metrics?.find((m) => m.label === "Raw Material PO Ref")?.value || "";
                const poDate = stage.metrics?.find((m) => m.label === "Po Date")?.value || "";
                return {
                    primary: supp && supp !== '-' ? supp : "Supplier & Mill Details",
                    secondary: poRef && poRef !== '-' ? `PO: ${poRef}${poDate && poDate !== '-' ? ` • ${poDate}` : ''}` : (stage.status || "Mill Traceability")
                };
            }
            default:
                return { primary: "Verified", secondary: "Quality Lineage" };
        }
    };

    return (
        <div className="qa2-card qa2-card-premium qa2-animate qa2-d3 qa2-timeline-container" id="quality-timeline-section">
            {/* ── Section Header ── */}
            <div className="qa2-timeline-header" data-spotlight="qa-timeline-header">
                <div className="qa2-timeline-header-left">
                    <div className="qa2-timeline-icon-box">
                        <Layers size={22} className="qa2-timeline-main-icon" />
                    </div>
                    <div>
                        <div className="qa2-timeline-title-row">
                            <h2 className="qa2-timeline-title">Quality Timeline</h2>
                            {/* <span className="qa2-timeline-live-pill">
                                <span className="qa2-timeline-pulse-dot" />
                                Single Row Pipeline View
                            </span> */}
                            {/* <span className="qa2-timeline-iso-badge">
                                <Award size={13} style={{ strokeWidth: 2.2 }} />
                                ISO 9001 & IATF 16949
                            </span> */}
                        </div>
                        <p className="qa2-timeline-subtitle">
                            Continuous {activeStages.length}-stage quality lineage from customer invoice to raw material mill. Click any stage to inspect complete details.
                        </p>
                    </div>
                </div>

                {/* ── Top Header Actions: Search ── */}
                <div className="qa2-timeline-header-right">
                    <div className="qa2-timeline-search-box">
                        <Search size={14} className="qa2-timeline-search-icon" />
                        <input
                            type="text"
                            placeholder="Filter invoice / part..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="qa2-timeline-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="qa2-timeline-search-clear"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Unified Hierarchical Selector Dropdown (Invoice + Part No Combined) ── */}
            <div className="qa2-timeline-selector-strip">
                <div className="qa2-timeline-strip-label">
                    <Sparkles size={14} style={{ color: "#f59e0b" }} />
                    <span>Select Invoice:</span>
                </div>

                <div className="qa2-timeline-dropdown-wrapper" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        className={`qa2-timeline-dropdown-trigger ${dropdownOpen ? "active" : ""}`}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="listbox"
                        title="Click to switch active traceability invoice"
                    >
                        <div className="qa2-timeline-dropdown-trigger-left">
                            <span className="qa2-timeline-dropdown-pill">{activeInvoice.id}</span>
                            <span className="qa2-timeline-dropdown-cust" title={activeInvoice.customer}>
                                {activeInvoice.customer}
                            </span>
                            <span className="qa2-timeline-dropdown-sep">•</span>
                            <span className="qa2-timeline-dropdown-val">{activeInvoice.totalValue}</span>
                            <span className="qa2-timeline-dropdown-multi-pill">
                                {activePartsList.length} {activePartsList.length === 1 ? "Part" : "Parts"}
                            </span>
                        </div>
                        <div className="qa2-timeline-dropdown-trigger-right">
                            <ChevronDown size={14} className={`qa2-timeline-dropdown-chevron ${dropdownOpen ? "open" : ""}`} />
                        </div>
                    </button>

                    {dropdownOpen && (
                        <div className="qa2-timeline-dropdown-popover" role="listbox">
                            {/* Integrated Search on Dropdown */}
                            <div className="qa2-dropdown-search-wrap">
                                <Search size={14} className="qa2-dropdown-search-icon" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search invoice no, customer, part..."
                                    className="qa2-dropdown-search-input"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery("");
                                            searchInputRef.current?.focus();
                                        }}
                                        className="qa2-dropdown-search-clear"
                                        title="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="qa2-timeline-dropdown-popover-header">
                                <span className="qa2-dropdown-header-title">
                                    {searchQuery ? `Matching Invoices (${filteredInvoices.length})` : "Select Traceability Invoice"}
                                </span>
                                <span className="qa2-dropdown-header-badge">
                                    {filteredInvoices.length} Invoices Available
                                </span>
                            </div>

                            <div className="qa2-timeline-dropdown-popover-list">
                                {filteredInvoices.length === 0 ? (
                                    <div className="qa2-dropdown-empty">
                                        No invoice found matching &ldquo;{searchQuery}&rdquo;
                                    </div>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const isSelected = inv.id === activeInvoice.id;
                                        const partsCount = inv.partsCount || 1;

                                        return (
                                            <button
                                                key={inv.id}
                                                type="button"
                                                role="option"
                                                aria-selected={isSelected}
                                                onClick={() => handleSelectInvoice(inv.id)}
                                                className={`qa2-timeline-inv-item ${isSelected ? "selected" : ""}`}
                                            >
                                                <div className="qa2-inv-col-id">
                                                    <FileSpreadsheet size={14} className="qa2-inv-icon" />
                                                    <span className="qa2-inv-id-text">{inv.id}</span>
                                                </div>

                                                <div className="qa2-inv-col-cust" title={inv.customer}>
                                                    <span className="qa2-inv-cust-text">{inv.customer}</span>
                                                    <span className={`qa2-inv-parts-badge ${partsCount > 1 ? "multi" : "single"}`}>
                                                        {partsCount} {partsCount === 1 ? "Part" : "Parts"}
                                                    </span>
                                                </div>

                                                <div className="qa2-inv-col-amt">
                                                    <span className="qa2-inv-amt-text">{inv.totalValue}</span>
                                                </div>

                                                <div className="qa2-inv-col-check">
                                                    {isSelected ? (
                                                        <span className="qa2-dropdown-check-circle">
                                                            <Check size={12} strokeWidth={3} />
                                                        </span>
                                                    ) : (
                                                        <span className="qa2-part-check-placeholder" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Active Invoice & Part Overview Card ── */}
            <div className="qa2-timeline-overview-card">
                <div className="qa2-timeline-overview-left">
                    <div className="qa2-timeline-overview-badge-row">
                        <span className="qa2-timeline-ov-badge-inv">{activeInvoice.id}</span>
                        <span className="qa2-timeline-ov-badge-part">{activePart.partNo}</span>
                    </div>

                    <div className="qa2-timeline-overview-part">
                        <span className="qa2-timeline-ov-partno">{activePart.partNo}</span>
                        <span className="qa2-timeline-ov-desc">{activePart.partDescription}</span>
                    </div>

                    {/* Billed Line Items Quick-Selector */}
                    {activePartsList.length > 0 && (
                        <div className="qa2-inline-parts-bar">
                            <span className="qa2-inline-parts-label">Billed Line Items:</span>
                            {activePartsList.length > 3 ? (
                                <div className="qa2-inline-parts-dropdown-wrap" ref={lineItemDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setLineItemDropdownOpen((prev) => !prev)}
                                        className={`qa2-inline-parts-dropdown-trigger ${lineItemDropdownOpen ? "active" : ""}`}
                                        aria-expanded={lineItemDropdownOpen}
                                        title="Click to select line item"
                                    >
                                        <div className="qa2-parts-dd-trigger-left">
                                            <span className="qa2-parts-dd-badge">
                                                Item {activePartsList.findIndex((p) => p.partNo === activePart.partNo) + 1} of {activePartsList.length}
                                            </span>
                                            <span className="qa2-parts-dd-partno">{activePart.partNo}</span>
                                            <span className="qa2-parts-dd-sep">•</span>
                                            <span className="qa2-parts-dd-desc" title={activePart.partDescription}>
                                                {activePart.partDescription}
                                            </span>
                                            <span className="qa2-parts-dd-qty">
                                                ({activePart.billedQty}{activePart.partValue ? ` • ${activePart.partValue}` : ""})
                                            </span>
                                        </div>
                                        <ChevronDown size={14} className={`qa2-parts-dd-chevron ${lineItemDropdownOpen ? "open" : ""}`} />
                                    </button>

                                    {lineItemDropdownOpen && (
                                        <div className="qa2-inline-parts-dropdown-popover" role="listbox">
                                            <div className="qa2-parts-dd-popover-header">
                                                <span className="qa2-parts-dd-popover-title">Select Billed Line Item</span>
                                                <span className="qa2-parts-dd-count-pill">{activePartsList.length} Items</span>
                                            </div>
                                            <div className="qa2-parts-dd-popover-list">
                                                {activePartsList.map((p, idx) => {
                                                    const isPartActive = p.partNo === activePart.partNo;
                                                    return (
                                                        <button
                                                            key={p.partNo}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={isPartActive}
                                                            onClick={() => {
                                                                setSelectedPartNo(p.partNo);
                                                                setLineItemDropdownOpen(false);
                                                            }}
                                                            className={`qa2-parts-dd-item ${isPartActive ? "selected" : ""}`}
                                                        >
                                                            <div className="qa2-parts-dd-item-left">
                                                                <div className="qa2-parts-dd-item-top">
                                                                    <span className="qa2-parts-dd-item-idx">Item {idx + 1}:</span>
                                                                    <span className="qa2-parts-dd-item-partno">{p.partNo}</span>
                                                                    <span className="qa2-parts-dd-item-qty">({p.billedQty})</span>
                                                                    {p.partValue && (
                                                                        <span className="qa2-parts-dd-item-val">{p.partValue}</span>
                                                                    )}
                                                                </div>
                                                                <div className="qa2-parts-dd-item-desc">
                                                                    {p.partDescription}
                                                                </div>
                                                            </div>
                                                            <div className="qa2-parts-dd-item-check">
                                                                {isPartActive && (
                                                                    <span className="qa2-dropdown-check-circle">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="qa2-inline-parts-pills">
                                    {activePartsList.map((p, idx) => {
                                        const isPartActive = p.partNo === activePart.partNo;
                                        return (
                                            <button
                                                key={p.partNo}
                                                type="button"
                                                onClick={() => setSelectedPartNo(p.partNo)}
                                                className={`qa2-inline-part-pill ${isPartActive ? "active" : ""}`}
                                                title={`Select line item: ${p.partNo} — ${p.partDescription}`}
                                            >
                                                <span className="pill-index">Item {idx + 1}:</span>
                                                <span className="pill-part">{p.partNo}</span>
                                                <span className="pill-qty">({p.billedQty}{p.partValue ? ` • ${p.partValue}` : ""})</span>
                                                {isPartActive && <span className="pill-dot" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="qa2-timeline-overview-stats">
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Customer</span>
                        <span className="qa2-timeline-stat-val text-truncate" title={activeInvoice.customer}>
                            {activeInvoice.customer}
                        </span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Billed Qty</span>
                        <span className="qa2-timeline-stat-val">{activePart.billedQty}</span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Part Value</span>
                        <span className="qa2-timeline-stat-val stat-green">{activePart.partValue || activeInvoice.totalValue}</span>
                    </div>
                    <div className="qa2-timeline-ov-stat-item">
                        <span className="qa2-timeline-stat-lbl">Part No</span>
                        <span className="qa2-timeline-stat-val text-mono">{activePart.partNo}</span>
                    </div>
                </div>
            </div>

            {/* ── SINGLE ROW PIPELINE VIEW (6 Interconnected Stages) ── */}
            <div className="qa2-timeline-single-row-wrap">
                <div className="qa2-timeline-row-caption">
                    <span className="qa2-timeline-row-caption-title">
                        End-to-End Traceability Stream (Click any stage to inspect detailed particulars):
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {loadingTimeline && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#2563eb", fontSize: "12px", fontWeight: 600 }}>
                                <Loader2 size={13} className="animate-spin" /> Loading Lineage...
                            </span>
                        )}
                        <span className="qa2-timeline-row-caption-hint">
                            Single Row Sequential View • {activeStages.length} Stages
                        </span>
                    </div>
                </div>

                <div className="qa2-timeline-single-row-pipeline">
                    {activeStages.map((stage, idx) => {
                        const snippet = getStageSnippet(stage);
                        const isLast = idx === activeStages.length - 1;

                        return (
                            <div key={stage.step} className="qa2-timeline-pipe-step-wrapper">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(stage.step)}
                                    className={`qa2-timeline-pipe-card stage-${stage.key}`}
                                    title={`Click to view detailed particulars for ${stage.title}`}
                                >
                                    {/* Card Top Row: Step badge & Icon */}
                                    <div className="qa2-timeline-pipe-top">
                                        <div className="qa2-timeline-pipe-badge-wrap">
                                            <span
                                                className="qa2-timeline-pipe-step-num"
                                                style={{ background: stage.accentColor }}
                                            >
                                                0{stage.step}
                                            </span>
                                            <span
                                                className="qa2-timeline-pipe-step-pill"
                                                style={{ background: `${stage.accentColor}15`, color: stage.accentColor }}
                                            >
                                                Stage 0{stage.step}
                                            </span>
                                        </div>
                                        <div
                                            className="qa2-timeline-pipe-icon-bubble"
                                            style={{ background: `${stage.accentColor}12`, borderColor: `${stage.accentColor}35` }}
                                        >
                                            {renderStageIcon(stage.iconName, stage.accentColor, 17)}
                                        </div>
                                    </div>

                                    {/* Stage Title */}
                                    <div className="qa2-timeline-pipe-title" title={stage.title}>
                                        {stage.title}
                                    </div>

                                    {/* Particular Identifier Badge */}
                                    <div
                                        className="qa2-timeline-pipe-id-badge"
                                        style={{ background: `${stage.badgeColor}15`, color: stage.badgeColor }}
                                    >
                                        {stage.badge}
                                    </div>

                                    {/* Snippet Particular Highlights */}
                                    <div className="qa2-timeline-pipe-snippet">
                                        <div className="qa2-timeline-pipe-snippet-primary" title={snippet.primary}>
                                            {snippet.primary}
                                        </div>
                                        <div className="qa2-timeline-pipe-snippet-secondary" title={snippet.secondary}>
                                            {snippet.secondary}
                                        </div>
                                    </div>

                                    {/* Bottom Action / View Details Pill */}
                                    <div className="qa2-timeline-pipe-bottom">
                                        <span className="qa2-timeline-pipe-verified">
                                            <CheckCircle2 size={11} style={{ color: "#10b981" }} />
                                            <span>Verified</span>
                                        </span>
                                        <span className="qa2-timeline-pipe-action-btn">
                                            <span>Inspect</span>
                                            <ArrowUpRight size={12} />
                                        </span>
                                    </div>
                                </button>

                                {/* Interconnecting Directional Arrow (Between Steps) */}
                                {!isLast && (
                                    <div className="qa2-timeline-pipe-connector" aria-hidden="true" title="Next Lineage Stage">
                                        <div className="qa2-timeline-pipe-arrow-badge">
                                            <ArrowRight size={15} strokeWidth={2.4} className="qa2-timeline-pipe-arrow-icon" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── DETAILED MODAL / POPUP (Opens on Click via Portal) ── */}
            {selectedStageModal !== null && modalStageData && createPortal(
                <div
                    className="qa2-timeline-modal-overlay"
                    onClick={() => setSelectedStageModal(null)}
                >
                    <div
                        className="qa2-timeline-modal-box"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Stage colored top accent bar */}
                        <div
                            className="qa2-timeline-modal-top-accent"
                            style={{ background: modalStageData.accentColor }}
                        />

                        {/* Modal Header */}
                        <div className="qa2-timeline-modal-header">
                            <div className="qa2-timeline-modal-header-left">
                                <div
                                    className="qa2-timeline-modal-icon-bubble"
                                    style={{
                                        background: `${modalStageData.accentColor}15`,
                                        borderColor: `${modalStageData.accentColor}35`,
                                        color: modalStageData.accentColor
                                    }}
                                >
                                    {renderStageIcon(modalStageData.iconName, modalStageData.accentColor, 22)}
                                </div>
                                <div className="qa2-timeline-modal-header-text">
                                    <div className="qa2-timeline-modal-title-row">
                                        <span
                                            className="qa2-timeline-modal-step-badge"
                                            style={{
                                                background: modalStageData.accentColor,
                                                color: "#ffffff"
                                            }}
                                        >
                                            STAGE 0{modalStageData.step} OF 06
                                        </span>
                                        <h3 className="qa2-timeline-modal-title">{modalStageData.title}</h3>
                                        <span
                                            className="qa2-timeline-modal-id-pill"
                                            style={{
                                                background: `${modalStageData.badgeColor}15`,
                                                color: modalStageData.badgeColor
                                            }}
                                        >
                                            {modalStageData.badge}
                                        </span>
                                        <span className="qa2-timeline-modal-part-badge">
                                            Part: {activePart.partNo}
                                        </span>
                                    </div>
                                    <p className="qa2-timeline-modal-sub">
                                        {modalStageData.subtitle}
                                    </p>
                                </div>
                            </div>

                            <div className="qa2-timeline-modal-header-right">
                                <span className="qa2-timeline-modal-verified-tag">
                                    <ShieldCheck size={15} style={{ color: "#10b981" }} />
                                    <span>Quality Verified</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(null)}
                                    className="qa2-timeline-modal-close-btn"
                                    title="Close dialog (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Complete In-Depth Breakdown */}
                        <div className="qa2-timeline-modal-body">
                            {/* Key Metrics Grid */}
                            {modalStageData.metrics && modalStageData.metrics.length > 0 && (
                                <div className="qa2-timeline-modal-metrics-section">
                                    <div className="qa2-timeline-inner-title">
                                        <FileText size={16} style={{ color: modalStageData.accentColor }} />
                                        <span>Key Parameters & Record Particulars</span>
                                    </div>
                                    <div className="qa2-timeline-metrics-grid">
                                        {modalStageData.metrics.map((m, mIdx) => (
                                            <div
                                                key={mIdx}
                                                className={`qa2-timeline-metric-tile ${m.highlight ? "highlight" : ""}`}
                                            >
                                                <span className="qa2-timeline-metric-label">{m.label}</span>
                                                <span className={`qa2-timeline-metric-value ${m.highlight ? "val-strong" : ""}`}>
                                                    {m.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 3: Process & Route Card Inspection Table */}
                            {modalStageData.key === "finalInsp" && modalStageData.inspectionRecords && (
                                <div className="qa2-timeline-dimension-box">
                                    <div className="qa2-timeline-inner-title">
                                        <div className="qa2-timeline-title-with-pill">
                                            <CheckCheck size={16} style={{ color: "#059669" }} />
                                            <span>Process & Route Card Inspection Report</span>
                                        </div>
                                        <span className="qa2-timeline-badge-count" style={{ background: "#ecfdf5", color: "#047857" }}>
                                            {modalStageData.inspectionRecords.length} Operations Verified
                                        </span>
                                    </div>
                                    <div className="qa2-timeline-table-wrapper">
                                        <table className="qa2-timeline-dim-table qa2-routecard-insp-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Routecard No</th>
                                                    <th>Operation / Process</th>
                                                    <th style={{ textAlign: "right" }}>Total Qty</th>
                                                    <th style={{ textAlign: "right" }}>Inspected Qty</th>
                                                    <th style={{ textAlign: "right" }}>OK Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rej Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rw Qty</th>
                                                    <th>Inspected By</th>
                                                    <th style={{ textAlign: "center" }}>Verdict</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modalStageData.inspectionRecords.map((rec, rIdx) => (
                                                    <tr key={rIdx}>
                                                        <td className="text-slate-400 font-mono text-xs">{rIdx + 1}</td>
                                                        <td className="font-mono text-xs font-bold text-blue-600">{rec.routeCard}</td>
                                                        <td className="font-medium text-slate-800" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                            {rec.process}
                                                        </td>
                                                        <td className="font-mono text-right text-slate-700 font-semibold">{rec.totQty}</td>
                                                        <td className="font-mono text-right text-blue-700 font-bold">{rec.inspQty}</td>
                                                        <td className="font-mono text-right text-emerald-600 font-bold">{rec.okQty}</td>
                                                        <td className="font-mono text-right text-slate-400 font-medium">{rec.rejQty}</td>
                                                        <td className="font-mono text-right text-slate-400 font-medium">{rec.rwQty}</td>
                                                        <td className="text-slate-700 text-xs font-medium" style={{ fontFamily: "var(--qa-font-body)" }}>{rec.inspectedBy}</td>
                                                        <td style={{ textAlign: "center" }}>
                                                            <span className="qa2-timeline-pass-tag">
                                                                <Check size={11} strokeWidth={3} />
                                                                {rec.verdict}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 4: Production (Inhouse & Job Order) with Quality Insp - Unique & Distinctive Style */}
                            {modalStageData.key === "production" && (() => {
                                const inhouseList = (modalStageData.inhouseOps || []).map((op) => ({
                                    ...op,
                                    type: "inhouse",
                                    process: op.process || op.name || "Machining Operation",
                                    opNum: parseInt(op.op.replace(/\D/g, "") || "0", 10)
                                }));

                                const subcontractList = (modalStageData.jobOrder?.items || []).map((item) => ({
                                    ...item,
                                    type: "subcontract",
                                    process: item.process || item.name || "Subcontract Process",
                                    vendorName: modalStageData.jobOrder.vendorName,
                                    subcontractDC: modalStageData.jobOrder.subcontractDC,
                                    inwardChallan: modalStageData.jobOrder.inwardChallan,
                                    opNum: parseInt(item.op.replace(/\D/g, "") || "0", 10)
                                }));

                                const allOpsSorted = [...inhouseList, ...subcontractList].sort((a, b) => a.opNum - b.opNum);

                                const filteredOps = allOpsSorted.filter((op) => {
                                    if (prodTab === "INHOUSE") return op.type === "inhouse";
                                    if (prodTab === "SUBCONTRACT") return op.type === "subcontract";
                                    return true;
                                });

                                return (
                                    <div className="qa2-prod-unique-container">
                                        {/* 1. Chronological Shopfloor Stepper Pipeline - 6 Aligned Steps */}
                                        <div className="qa2-prod-stepper-box">
                                            <div className="qa2-prod-stepper-title">
                                                <div className="qa2-timeline-title-with-pill">
                                                    <Factory size={16} style={{ color: "#d97706" }} />
                                                    <span className="qa2-stepper-heading">Manufacturing Process Flow & IPQA Verification Route</span>
                                                </div>
                                                <span className="qa2-prod-flow-hint">Chronological Routing ({allOpsSorted.length} Operations)</span>
                                            </div>
                                            <div className="qa2-prod-stepper-flow">
                                                {allOpsSorted.map((stepItem, sIdx) => {
                                                    const isInhouse = stepItem.type === "inhouse";
                                                    const processName = stepItem.process || stepItem.name || "Machining Operation";
                                                    return (
                                                        <div key={sIdx} className={`qa2-prod-step-node ${isInhouse ? "node-inhouse" : "node-subcontract"}`}>
                                                            <div className="qa2-step-node-top">
                                                                <span className="qa2-step-num">STEP 0{sIdx + 1}</span>
                                                                {isInhouse ? <Cpu size={12} className="qa2-step-ico inhouse" /> : <Flame size={12} className="qa2-step-ico subcontract" />}
                                                            </div>
                                                            <div className="qa2-step-node-op" title={processName}>{processName}</div>
                                                            <div className="qa2-step-node-sub">
                                                                <span className={`qa2-step-pill-tag ${isInhouse ? "pill-inhouse" : "pill-subcontract"}`}>
                                                                    {isInhouse ? "Inhouse CNC" : "Subcontract"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 2. Interactive Navigation & View Switcher */}
                                        <div className="qa2-prod-action-bar">
                                            <div className="qa2-prod-filter-tabs">
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn ${prodTab === "ALL" ? "active" : ""}`}
                                                    onClick={() => setProdTab("ALL")}
                                                >
                                                    <Layers size={15} />
                                                    <span>All Operations</span>
                                                    <span className="qa2-tab-count">{allOpsSorted.length}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn inhouse ${prodTab === "INHOUSE" ? "active" : ""}`}
                                                    onClick={() => setProdTab("INHOUSE")}
                                                >
                                                    <Cpu size={15} />
                                                    <span>Inhouse CNC</span>
                                                    <span className="qa2-tab-count inhouse">{inhouseList.length}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`qa2-prod-tab-btn subcontract ${prodTab === "SUBCONTRACT" ? "active" : ""}`}
                                                    onClick={() => setProdTab("SUBCONTRACT")}
                                                >
                                                    <Flame size={15} />
                                                    <span>Subcontract Job Order</span>
                                                    <span className="qa2-tab-count subcontract">{subcontractList.length}</span>
                                                </button>
                                            </div>

                                            <div className="qa2-prod-count-badge">
                                                <span>{filteredOps.length} Operations Listed</span>
                                            </div>
                                        </div>

                                        {/* Process & Route Card Inspection Sheet Table */}
                                        <div className="qa2-timeline-table-wrapper" style={{ marginTop: 12 }}>
                                            <table className="qa2-timeline-dim-table qa2-prod-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: "40px" }}>#</th>
                                                        <th style={{ width: "110px" }}>Op Code</th>
                                                        <th style={{ width: "130px" }}>Category</th>
                                                        <th>Process / Routing Description</th>
                                                        <th>Station / Subcontractor</th>
                                                        <th>Operator / Challan</th>
                                                        <th>IPQA Slip / Cert</th>
                                                        <th>In-Process Quality Finding / Criteria</th>
                                                        <th style={{ textAlign: "center", width: "90px" }}>Verdict</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredOps.map((op, tIdx) => {
                                                        const isInhouse = op.type === "inhouse";
                                                        return (
                                                            <tr key={tIdx}>
                                                                <td className="text-slate-400 font-mono text-xs">{tIdx + 1}</td>
                                                                <td className="font-mono text-xs font-bold text-amber-600">
                                                                    {op.op}
                                                                </td>
                                                                <td>
                                                                    <span className={`qa2-prod-table-badge ${isInhouse ? "badge-inhouse" : "badge-subcontract"}`}>
                                                                        {isInhouse ? "Inhouse CNC" : "Subcontract"}
                                                                    </span>
                                                                </td>
                                                                <td className="font-medium text-slate-800" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                                    {op.process || op.name || "Machining Operation"}
                                                                </td>
                                                                <td className="text-slate-700 text-xs" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                                    {isInhouse ? op.machine : op.vendorName}
                                                                </td>
                                                                <td className="text-slate-600 text-xs font-mono">
                                                                    {isInhouse ? op.operator : `${op.subcontractDC} / ${op.inwardChallan}`}
                                                                </td>
                                                                <td className="font-mono text-xs font-semibold text-slate-700">
                                                                    {isInhouse ? op.ipqa : op.cert}
                                                                </td>
                                                                <td className="text-xs">
                                                                    <span className={`qa2-prod-table-qa-pill ${isInhouse ? "qa-inhouse" : "qa-subcontract"}`}>
                                                                        {isInhouse ? op.keyMetric : op.specs}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <span className="qa2-timeline-pass-tag">
                                                                        <Check size={11} strokeWidth={3} />
                                                                        {op.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Specific Deep Dive for Stage 5: GRN Inward Quality Inspection & Clearance Table */}
                            {(modalStageData.key === "grn" || modalStageData.key === "grnMtc") && (
                                <div className="qa2-timeline-dimension-box">
                                    <div className="qa2-timeline-inner-title">
                                        <div className="qa2-timeline-title-with-pill">
                                            <Package size={16} style={{ color: "#0891b2" }} />
                                            <span>GRN Inward Inspection & Clearance Details</span>
                                        </div>
                                        <span className="qa2-timeline-badge-count" style={{ background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}>
                                            {(modalStageData.grnRecords || []).length || 1} Record Verified
                                        </span>
                                    </div>
                                    <div className="qa2-timeline-table-wrapper">
                                        <table className="qa2-timeline-dim-table qa2-grn-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "40px" }}>#</th>
                                                    <th>GRN Number</th>
                                                    <th>GRN Inward Date</th>
                                                    <th style={{ textAlign: "right" }}>GRN Qty</th>
                                                    <th style={{ textAlign: "center", width: "70px" }}>UOM</th>
                                                    <th style={{ textAlign: "right" }}>OK Qty</th>
                                                    <th style={{ textAlign: "right" }}>Rej Qty</th>
                                                    <th>Insp By</th>
                                                    <th style={{ textAlign: "center", width: "90px" }}>Verdict</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {modalStageData.grnRecords && modalStageData.grnRecords.length > 0 ? (
                                                    modalStageData.grnRecords.map((rec, gIdx) => (
                                                        <tr key={gIdx}>
                                                            <td className="text-slate-400 font-mono text-xs">{gIdx + 1}</td>
                                                            <td className="font-mono text-xs font-bold text-cyan-700">
                                                                {rec.grnNo}
                                                            </td>
                                                            <td className="font-mono text-xs font-semibold text-slate-700">
                                                                {rec.grnDate}
                                                            </td>
                                                            <td className="font-mono text-right text-slate-900 font-bold text-xs">
                                                                {rec.grnQty || rec.materialQty}
                                                            </td>
                                                            <td className="font-mono text-center text-slate-700 font-semibold text-xs">
                                                                <span className="qa2-grn-uom-badge">{rec.uom}</span>
                                                            </td>
                                                            <td className="font-mono text-right text-emerald-600 font-bold text-xs">
                                                                {rec.okQty}
                                                            </td>
                                                            <td className="font-mono text-right text-slate-400 font-medium text-xs">
                                                                {rec.rejQty}
                                                            </td>
                                                            <td className="text-slate-800 text-xs font-semibold" style={{ fontFamily: "var(--qa-font-body)" }}>
                                                                {rec.inspBy}
                                                            </td>
                                                            <td style={{ textAlign: "center" }}>
                                                                <span className="qa2-timeline-pass-tag">
                                                                    <Check size={11} strokeWidth={3} />
                                                                    {rec.verdict || "PASS"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={9} style={{ textAlign: "center", padding: "20px 16px", color: "#64748b" }}>
                                                            No inward GRN store records associated with this route card.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Specific Deep Dive for Stage 6: Supplier Purchase Order & Mill Lineage Table */}
                            {modalStageData.key === "supplier" && (
                                <>
                                    <div className="qa2-timeline-dimension-box" style={{ marginBottom: 16 }}>
                                        <div className="qa2-timeline-inner-title">
                                            <div className="qa2-timeline-title-with-pill">
                                                <Building2 size={16} style={{ color: "#db2777" }} />
                                                <span>Raw Material Mill Procurement & Purchase Order Lineage</span>
                                            </div>
                                            <span className="qa2-timeline-badge-count" style={{ background: "#fdf2f8", color: "#9d174d", border: "1px solid #fbcfe8" }}>
                                                Tier-1 Certified Mill
                                            </span>
                                        </div>
                                        <div className="qa2-timeline-table-wrapper">
                                            <table className="qa2-timeline-dim-table qa2-supplier-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: "40px" }}>#</th>
                                                        <th>Supplier / Mill Name</th>
                                                        <th>Raw Material PO Ref</th>
                                                        <th>PO Date</th>
                                                        <th style={{ textAlign: "right" }}>Qty</th>
                                                        <th style={{ textAlign: "center", width: "70px" }}>UOM</th>
                                                        <th style={{ textAlign: "center", width: "120px" }}>Approval Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {modalStageData.supplierRecords && modalStageData.supplierRecords.length > 0 ? (
                                                        modalStageData.supplierRecords.map((rec, sIdx) => (
                                                            <tr key={sIdx}>
                                                                <td className="text-slate-400 font-mono text-xs">{sIdx + 1}</td>
                                                                <td className="font-semibold text-slate-900" style={{ fontFamily: "var(--qa-font-heading)" }}>
                                                                    {rec.supplierName}
                                                                </td>
                                                                <td className="font-mono text-xs font-bold text-pink-700">
                                                                    {rec.poRef}
                                                                </td>
                                                                <td className="font-mono text-xs font-semibold text-slate-700">
                                                                    {rec.poDate}
                                                                </td>
                                                                <td className="font-mono text-right text-slate-900 font-bold text-xs">
                                                                    {rec.qty}
                                                                </td>
                                                                <td className="font-mono text-center text-slate-700 font-semibold text-xs">
                                                                    <span className="qa2-grn-uom-badge">{rec.uom}</span>
                                                                </td>
                                                                <td style={{ textAlign: "center" }}>
                                                                    <span className="qa2-timeline-pass-tag">
                                                                        <Check size={11} strokeWidth={3} />
                                                                        {rec.status || "APPROVED"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={7} style={{ textAlign: "center", padding: "20px 16px", color: "#64748b" }}>
                                                                No raw material purchase orders linked with this inward receipt.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 3 Dedicated High-Contrast KPI Cards: Vendor Rating, Rejection PPM, Traceability */}
                                    <div className="qa2-supp-kpi-grid">
                                        {/* 1. Vendor Rating Tile */}
                                        <div className="qa2-supp-kpi-card kpi-emerald">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-emerald">
                                                    <Award size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-emerald">Vendor Rating</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-emerald">
                                                {modalStageData.vendorRating || "98.5% Grade A"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-emerald">
                                                <span>Tier-1 Preferred Mill</span>
                                            </div>
                                        </div>

                                        {/* 2. Rejection PPM Tile */}
                                        <div className="qa2-supp-kpi-card kpi-blue">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-blue">
                                                    <ShieldCheck size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-blue">Rejection PPM</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-blue">
                                                {modalStageData.rejectionPpm || "0 PPM (Zero Defect)"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-blue">
                                                <span>100% Acceptance Rate</span>
                                            </div>
                                        </div>

                                        {/* 3. Traceability Tile */}
                                        <div className="qa2-supp-kpi-card kpi-purple">
                                            <div className="qa2-supp-kpi-header">
                                                <div className="qa2-supp-kpi-icon-wrap kpi-purple">
                                                    <CheckCheck size={17} />
                                                </div>
                                                <span className="qa2-supp-kpi-label kpi-purple">Traceability</span>
                                            </div>
                                            <div className="qa2-supp-kpi-value kpi-purple">
                                                {modalStageData.traceability || "100% Heat Lot Matched"}
                                            </div>
                                            <div className="qa2-supp-kpi-sub kpi-purple">
                                                <span>Full Billet-to-Bar Lineage</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Stage Footnote / Auditor Notes */}
                            {modalStageData.notes && (
                                <div className="qa2-timeline-card-footnote">
                                    <Info size={14} style={{ color: "#64748b", flexShrink: 0, marginTop: "2px" }} />
                                    <span>{modalStageData.notes}</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer with Stepper & Next/Prev Controls */}
                        <div className="qa2-timeline-modal-footer">
                            <div className="qa2-timeline-modal-nav-pills">
                                {activeInvoice.stages.map((s) => (
                                    <button
                                        key={s.step}
                                        type="button"
                                        onClick={() => setSelectedStageModal(s.step)}
                                        className={`qa2-timeline-modal-pill-btn ${s.step === selectedStageModal ? "active" : ""}`}
                                        title={`Jump to Stage 0${s.step}: ${s.title}`}
                                        style={s.step === selectedStageModal ? { background: s.accentColor, borderColor: s.accentColor } : {}}
                                    >
                                        <span>0{s.step}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="qa2-timeline-modal-nav-actions">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(selectedStageModal - 1)}
                                    disabled={selectedStageModal <= 1}
                                    className="qa2-timeline-modal-nav-btn"
                                >
                                    <ChevronLeft size={14} />
                                    <span>Prev Stage</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(selectedStageModal + 1)}
                                    disabled={selectedStageModal >= 6}
                                    className="qa2-timeline-modal-nav-btn"
                                >
                                    <span>Next Stage</span>
                                    <ChevronRight size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedStageModal(null)}
                                    className="qa2-timeline-modal-done-btn"
                                >
                                    Done
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


export default QualityTimelineSection;
