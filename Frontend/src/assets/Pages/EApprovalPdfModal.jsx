/**
 * EApprovalPdfModal.jsx
 * Interactive PDF Document Studio & Print Modal for E-Approval
 * Features:
 *  - High-fidelity A4 Document Sheet with Company Header, Metadata, Line Items, Financials
 *  - Draggable Rubber Status Stamp (APPROVED, PENDING, VERIFIED, CONFIDENTIAL)
 *  - Draggable Authorized Signature & Signatory Box
 *  - Draggable Annotation / Sticky Memo Note
 *  - Multi-theme Selector (Modern Indigo, Executive Slate, Teal Classic, Minimal Clean)
 *  - Live Editable Terms & Remarks
 *  - Zoom In / Out / Fit Width Controls
 *  - Vector Print Support (@media print) & jsPDF Vector Download
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./EApprovalPdfModal.css";

// ── Number to Words Converter (Indian Numbering System) ─────────
function numberToWordsIndian(num) {
    if (!num || isNaN(num)) return "Zero Rupees Only";
    const n = Math.floor(Math.abs(Number(num)));
    if (n === 0) return "Zero Rupees Only";

    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(val) {
        if (val === 0) return "";
        let str = "";
        if (val >= 10000000) {
            str += inWords(Math.floor(val / 10000000)) + " Crore ";
            val %= 10000000;
        }
        if (val >= 100000) {
            str += inWords(Math.floor(val / 100000)) + " Lakh ";
            val %= 100000;
        }
        if (val >= 1000) {
            str += inWords(Math.floor(val / 1000)) + " Thousand ";
            val %= 1000;
        }
        if (val >= 100) {
            str += inWords(Math.floor(val / 100)) + " Hundred ";
            val %= 100;
        }
        if (val > 0) {
            if (str !== "") str += "and ";
            if (val < 20) {
                str += a[val] + " ";
            } else {
                str += b[Math.floor(val / 10)] + " ";
                if (val % 10 > 0) str += a[val % 10] + " ";
            }
        }
        return str;
    }

    const words = inWords(n).trim();
    return `Rupees ${words} Only`;
}

export default function EApprovalPdfModal({ card, onClose }) {
    if (!card) return null;

    // Retrieve dynamic company details from card (tenants_signup) or fallback to storage
    const companyDetails = useMemo(() => {
        let userCompany = "";
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            userCompany = user.company || "";
        } catch { }

        const info = card.companyInfo || {};
        const name = (info.companyName || card.companyName || userCompany || "").trim();
        const addr1 = (info.address1 || card.companyAddress1 || "").trim();
        const addr2 = (info.address2 || card.companyAddress2 || "").trim();
        const city = (info.city || card.companyCity || "").trim();
        const state = (info.state || card.companyState || "").trim();
        const pin = (info.pincode || card.companyPinCode || "").trim();
        const gst = (info.gstNumber || card.companyGst || "").trim();
        const phone = (info.phone || card.companyPhone || "").trim();
        const email = (info.email || card.companyEmail || "").trim();

        const addrLine = [addr1, addr2].filter(Boolean).join(", ");
        const locLine = [[city, state].filter(Boolean).join(", "), pin ? `${pin}` : ""].filter(Boolean).join(" — ");

        return {
            name,
            addr1,
            addr2,
            city,
            state,
            pin,
            gst,
            phone,
            email,
            addrLine,
            locLine,
        };
    }, [card]);

    const companyName = companyDetails.name;

    // ── Document State ──
    const [theme, setTheme] = useState("indigo"); // indigo | executive | slate | minimal
    const [zoom, setZoom] = useState(1.0);
    const [isDragMode, setIsDragMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedStamp, setSelectedStamp] = useState(
        card.status === "Approved" ? "approved" : "pending"
    );

    // Section Toggles
    const [toggles, setToggles] = useState({
        stamp: false,
        sign: true,
        memo: false,
        watermark: false,
        terms: true,
    });

    // Draggable Elements Positions (percentage / relative coordinates)
    const [positions, setPositions] = useState({
        stamp: { x: 540, y: 840 },
        memo: { x: 50, y: 780 },
    });

    const [draggingItem, setDraggingItem] = useState(null);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });
    const pageRef = useRef(null);

    // Responsive initial zoom & sidebar state
    useEffect(() => {
        const handleAdaptiveResize = () => {
            const w = window.innerWidth;
            if (w < 1024) {
                setSidebarOpen(false);
            }
            if (w < 900) {
                const pad = w < 500 ? 16 : 40;
                const availableW = w - pad;
                const optimalZoom = Math.max(0.35, Math.min(1.0, +(availableW / 820).toFixed(2)));
                setZoom(optimalZoom);
            } else {
                setZoom(1.0);
            }
        };
        handleAdaptiveResize();
        window.addEventListener("resize", handleAdaptiveResize);
        return () => window.removeEventListener("resize", handleAdaptiveResize);
    }, []);

    // Editable content
    const [memoText, setMemoText] = useState("Checked & Approved for Procurement");
    const [remarksText, setRemarksText] = useState(
        card?.pocomment || card?.remarks || card?.comment || ""
    );

    // Financial calculations
    const items = card.items || [];
    const fin = card.financial;
    const lineSum = items.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalAmount = fin ? Number(fin.lineItemsTotal) || lineSum : lineSum;
    const discount = Number(fin ? fin.discount : card.discount) || 0;
    const bfTaxPF = Number(fin ? fin.beforeTaxPF : card.bfTaxPF) || 0;
    const afTaxPF = Number(fin ? fin.afterTaxPF : card.afTaxPF) || 0;
    const roundOff = Number(fin ? fin.roundOff : card.roundOff) || 0;
    const taxes = fin?.taxes || [];

    let cgstPct = Number(card.cgstPct) || 9;
    let sgstPct = Number(card.sgstPct) || 9;
    let cgstAmt = 0;
    let sgstAmt = 0;

    const pick = re => taxes.find(t => re.test(String(t.ttype || "")));
    const cgst = pick(/cgst/i);
    const sgst = pick(/sgst/i);
    if (cgst) {
        cgstPct = Number(cgst.tp) || cgstPct;
        cgstAmt = Number(cgst.txAmt) || 0;
    }
    if (sgst) {
        sgstPct = Number(sgst.tp) || sgstPct;
        sgstAmt = Number(sgst.txAmt) || 0;
    }
    if (!cgst && !sgst && taxes.length >= 1) {
        cgstAmt = Number(taxes[0].txAmt) || 0;
        cgstPct = Number(taxes[0].tp) || cgstPct;
    }
    if (!cgst && !sgst && taxes.length >= 2) {
        sgstAmt = Number(taxes[1].txAmt) || 0;
        sgstPct = Number(taxes[1].tp) || sgstPct;
    }

    const afterDiscount = totalAmount - discount;
    const bfTax = afterDiscount + bfTaxPF;
    if ((!fin || taxes.length === 0) && cgstAmt === 0 && sgstAmt === 0) {
        cgstAmt = +(bfTax * cgstPct / 100).toFixed(2);
        sgstAmt = +(bfTax * sgstPct / 100).toFixed(2);
    }

    const afTax = bfTax + afTaxPF;
    const grandTotal = fin
        ? Math.round(Number(fin.grandTotal) || 0)
        : Math.round(afTax + cgstAmt + sgstAmt + roundOff);

    const fmt = n => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 });
    const amountInWords = useMemo(() => numberToWordsIndian(grandTotal), [grandTotal]);

    // ── Drag & Drop Handlers ──
    const handleDragStart = (e, itemKey) => {
        if (!isDragMode) return;
        e.preventDefault();
        e.stopPropagation();

        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        setDraggingItem(itemKey);
        dragStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            itemX: positions[itemKey]?.x || 0,
            itemY: positions[itemKey]?.y || 0,
        };
    };

    const handlePointerMove = useCallback((e) => {
        if (!draggingItem) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

        const deltaX = (clientX - dragStartRef.current.mouseX) / zoom;
        const deltaY = (clientY - dragStartRef.current.mouseY) / zoom;

        setPositions(prev => ({
            ...prev,
            [draggingItem]: {
                x: Math.max(10, Math.min(680, dragStartRef.current.itemX + deltaX)),
                y: Math.max(10, Math.min(1100, dragStartRef.current.itemY + deltaY)),
            },
        }));
    }, [draggingItem, zoom]);

    const handlePointerUp = useCallback(() => {
        if (draggingItem) {
            setDraggingItem(null);
        }
    }, [draggingItem]);

    useEffect(() => {
        if (draggingItem) {
            window.addEventListener("mousemove", handlePointerMove);
            window.addEventListener("mouseup", handlePointerUp);
            window.addEventListener("touchmove", handlePointerMove);
            window.addEventListener("touchend", handlePointerUp);
        }
        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
            window.removeEventListener("touchmove", handlePointerMove);
            window.removeEventListener("touchend", handlePointerUp);
        };
    }, [draggingItem, handlePointerMove, handlePointerUp]);

    // ── Escape Key Close ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // ── Reset Layout Positions ──
    const handleResetLayout = () => {
        setPositions({
            stamp: { x: 540, y: 840 },
            sign: { x: 570, y: 990 },
            memo: { x: 50, y: 780 },
        });
        setZoom(1.0);
    };

    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // ── Direct High-Fidelity Print (Exact A4 Center Alignment matching Download PDF) ──
    const handlePrint = async () => {
        const pageEl = pageRef.current;
        if (!pageEl) {
            window.print();
            return;
        }

        setIsPrinting(true);
        try {
            const canvas = await html2canvas(pageEl, {
                scale: 3, // Ultra-high 300+ DPI resolution for crisp print
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
                imageTimeout: 15000,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                onclone: (clonedDoc) => {
                    if (clonedDoc.defaultView) {
                        clonedDoc.defaultView.scrollTo(0, 0);
                    }
                    const clonedViewport = clonedDoc.querySelector(".eap-pdf-viewport");
                    if (clonedViewport) {
                        clonedViewport.scrollTop = 0;
                        clonedViewport.scrollLeft = 0;
                        clonedViewport.style.padding = "0";
                        clonedViewport.style.margin = "0";
                        clonedViewport.style.overflow = "visible";
                    }

                    const clonedWrapper = clonedDoc.querySelector(".eap-pdf-canvas-wrapper");
                    if (clonedWrapper) {
                        clonedWrapper.style.transform = "none";
                        clonedWrapper.style.margin = "0";
                        clonedWrapper.style.padding = "0";
                    }

                    clonedDoc.body.style.webkitFontSmoothing = "antialiased";
                    clonedDoc.body.style.mozOsxFontSmoothing = "grayscale";
                    clonedDoc.body.style.textRendering = "optimizeLegibility";

                    const clonedPage = clonedDoc.getElementById("eap-pdf-canvas");
                    if (clonedPage) {
                        clonedPage.style.transform = "none";
                        clonedPage.style.boxShadow = "none";
                        clonedPage.style.margin = "0 auto";
                        clonedPage.style.position = "relative";
                        clonedPage.style.top = "0";
                        clonedPage.style.left = "0";
                        clonedPage.style.webkitFontSmoothing = "antialiased";
                        clonedPage.style.mozOsxFontSmoothing = "grayscale";
                        clonedPage.style.textRendering = "optimizeLegibility";
                    }

                    const handles = clonedDoc.querySelectorAll(".eap-pdf-drag-handle, .eap-pdf-drag-remove-btn");
                    handles.forEach(h => { h.style.display = "none"; });

                    const editableTexts = clonedDoc.querySelectorAll(".eap-doc-editable-text");
                    editableTexts.forEach(el => {
                        el.style.outline = "none";
                        el.style.border = "none";
                        el.style.background = "transparent";
                    });
                },
            });

            const imgData = canvas.toDataURL("image/png", 1.0);

            let printFrame = document.getElementById("eap-print-iframe");
            if (!printFrame) {
                printFrame = document.createElement("iframe");
                printFrame.id = "eap-print-iframe";
                printFrame.style.position = "fixed";
                printFrame.style.top = "-9999px";
                printFrame.style.left = "-9999px";
                printFrame.style.width = "0px";
                printFrame.style.height = "0px";
                printFrame.style.border = "none";
                document.body.appendChild(printFrame);
            }

            const frameDoc = printFrame.contentWindow.document;
            frameDoc.open();
            frameDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PO_${card.poNo || "Order"}_${card.vendor || "Doc"}</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        html, body {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                            height: 100%;
                            background: #ffffff;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        img {
                            width: 100%;
                            max-width: 210mm;
                            height: auto;
                            max-height: 297mm;
                            display: block;
                            margin: 0 auto;
                            object-fit: contain;
                        }
                    </style>
                </head>
                <body>
                    <img src="${imgData}" onload="setTimeout(() => { window.focus(); window.print(); }, 250);" />
                </body>
                </html>
            `);
            frameDoc.close();
        } catch (err) {
            console.error("Print generation failed:", err);
            window.print();
        } finally {
            setIsPrinting(false);
        }
    };

    // ── High-Fidelity Ultra-Sharp Exact WYSIWYG PDF Download (100% Matches Preview Sheet) ──
    const handleDownloadPdf = async () => {
        const pageEl = pageRef.current;
        if (!pageEl) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(pageEl, {
                scale: 3, // Ultra-high 300+ DPI resolution for razor-sharp text and borders
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
                imageTimeout: 15000,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                onclone: (clonedDoc) => {
                    // Reset scroll on window and viewport so capture starts exactly at top (0,0)
                    if (clonedDoc.defaultView) {
                        clonedDoc.defaultView.scrollTo(0, 0);
                    }
                    const clonedViewport = clonedDoc.querySelector(".eap-pdf-viewport");
                    if (clonedViewport) {
                        clonedViewport.scrollTop = 0;
                        clonedViewport.scrollLeft = 0;
                        clonedViewport.style.padding = "0";
                        clonedViewport.style.margin = "0";
                        clonedViewport.style.overflow = "visible";
                    }

                    const clonedWrapper = clonedDoc.querySelector(".eap-pdf-canvas-wrapper");
                    if (clonedWrapper) {
                        clonedWrapper.style.transform = "none";
                        clonedWrapper.style.margin = "0";
                        clonedWrapper.style.padding = "0";
                    }

                    // Set global font smoothing for crisp vector-like text rendering
                    clonedDoc.body.style.webkitFontSmoothing = "antialiased";
                    clonedDoc.body.style.mozOsxFontSmoothing = "grayscale";
                    clonedDoc.body.style.textRendering = "optimizeLegibility";

                    const clonedPage = clonedDoc.getElementById("eap-pdf-canvas");
                    if (clonedPage) {
                        clonedPage.style.transform = "none";
                        clonedPage.style.boxShadow = "none";
                        clonedPage.style.margin = "0 auto";
                        clonedPage.style.position = "relative";
                        clonedPage.style.top = "0";
                        clonedPage.style.left = "0";
                        clonedPage.style.webkitFontSmoothing = "antialiased";
                        clonedPage.style.mozOsxFontSmoothing = "grayscale";
                        clonedPage.style.textRendering = "optimizeLegibility";
                    }

                    // Hide drag handles & remove buttons from clean PDF render
                    const handles = clonedDoc.querySelectorAll(".eap-pdf-drag-handle, .eap-pdf-drag-remove-btn");
                    handles.forEach(h => { h.style.display = "none"; });

                    // Clean editable fields styling in PDF
                    const editableTexts = clonedDoc.querySelectorAll(".eap-doc-editable-text");
                    editableTexts.forEach(el => {
                        el.style.outline = "none";
                        el.style.border = "none";
                        el.style.background = "transparent";
                    });
                },
            });

            const imgData = canvas.toDataURL("image/png", 1.0);
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });
            const pageW = pdf.internal.pageSize.getWidth(); // 210 mm
            const pageH = pdf.internal.pageSize.getHeight(); // 297 mm

            let renderW = pageW;
            let renderH = (canvas.height * renderW) / canvas.width;

            if (renderH > pageH) {
                renderH = pageH;
                renderW = (canvas.width * renderH) / canvas.height;
            }

            // Exactly center on A4 page horizontally and vertically
            const posX = (pageW - renderW) / 2;
            const posY = (pageH - renderH) / 2;

            pdf.addImage(imgData, "PNG", posX, posY, renderW, renderH, undefined, "FAST");

            pdf.save(`PO_${card.poNo || "Order"}_${card.vendor || "Doc"}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            window.print();
        } finally {
            setIsDownloading(false);
        }
    };

    return createPortal(
        <div className="eap-pdf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>

            {/* ── Top Floating Studio Toolbar ── */}
            <header className="eap-pdf-toolbar">
                <div className="eap-pdf-toolbar__left">
                    <div className="eap-pdf-toolbar__badge-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                    </div>
                    <div className="eap-pdf-toolbar__title">
                        <span className="eap-pdf-title-full">PO Print Studio & PDF Preview</span>
                        <span className="eap-pdf-title-short">PO Preview</span>
                        <span className="eap-pdf-toolbar__tag">{card.poNo || "PR260805"}</span>
                    </div>
                </div>

                {/* ── Center Controls: Zoom, Drag Mode, Reset ── */}
                <div className="eap-pdf-toolbar__center">
                    <button
                        type="button"
                        className={`eap-pdf-tool-btn ${sidebarOpen ? "eap-pdf-tool-btn--active" : ""}`}
                        onClick={() => setSidebarOpen(o => !o)}
                        title="Toggle Studio Customizer Sidebar"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                        <span className="eap-btn-label-options">{sidebarOpen ? "Hide Options" : "Show Options"}</span>
                        <span className="eap-btn-label-options-short">Options</span>
                    </button>

                    <div className="eap-pdf-divider" />

                    {/* Drag Mode Toggle */}
                    <button
                        type="button"
                        className={`eap-pdf-tool-btn ${isDragMode ? "eap-pdf-tool-btn--active" : ""}`}
                        onClick={() => setIsDragMode(m => !m)}
                        title="Toggle Drag & Reposition Stamps/Signatures"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="5 9 2 12 5 15" />
                            <polyline points="9 5 12 2 15 5" />
                            <polyline points="15 19 12 22 9 19" />
                            <polyline points="19 9 22 12 19 15" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <line x1="12" y1="2" x2="12" y2="22" />
                        </svg>
                        <span className="eap-btn-label-drag">{isDragMode ? "Drag Mode Active" : "View Mode"}</span>
                        <span className="eap-btn-label-drag-short">{isDragMode ? "Drag Active" : "View"}</span>
                    </button>

                    <div className="eap-pdf-divider" />

                    {/* Zoom In / Out / Reset */}
                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--zoom"
                        onClick={() => setZoom(z => Math.max(0.3, +(z - 0.05).toFixed(2)))}
                        title="Zoom Out"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>
                    <span className="eap-pdf-zoom-val">{Math.round(zoom * 100)}%</span>
                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--zoom"
                        onClick={() => setZoom(z => Math.min(1.5, +(z + 0.05).toFixed(2)))}
                        title="Zoom In"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--reset"
                        onClick={handleResetLayout}
                        title="Reset Layout & Positions"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        <span className="eap-btn-label-reset">Reset</span>
                    </button>
                </div>

                {/* ── Right Actions: Print, Download, Close ── */}
                <div className="eap-pdf-toolbar__right">
                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--ghost"
                        onClick={handlePrint}
                        disabled={isPrinting || isDownloading}
                        title="Print High-Quality Document"
                    >
                        {isPrinting ? (
                            <svg className="eap-spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                            </svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                            </svg>
                        )}
                        <span className="eap-btn-label">{isPrinting ? "Printing..." : "Print"}</span>
                    </button>

                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--primary"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        title="Download Exact PDF"
                    >
                        {isDownloading ? (
                            <svg className="eap-spin-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                            </svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        )}
                        <span className="eap-btn-label">{isDownloading ? "Downloading..." : "Download PDF"}</span>
                    </button>

                    <button
                        type="button"
                        className="eap-pdf-tool-btn eap-pdf-tool-btn--close"
                        onClick={onClose}
                        aria-label="Close PDF Viewer"
                        title="Close (Esc)"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── Main Workspace Area ── */}
            <div className="eap-pdf-workspace">
                {/* Mobile/Tablet Sidebar Backdrop */}
                {sidebarOpen && (
                    <div
                        className="eap-pdf-sidebar-backdrop"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* ── Left Sidebar Options Panel ── */}
                {sidebarOpen && (
                    <aside className="eap-pdf-sidebar">
                        {/* Mobile Drawer Header */}
                        <div className="eap-pdf-sidebar-mobile-hdr">
                            <div className="eap-pdf-sidebar-mobile-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <line x1="9" y1="3" x2="9" y2="21" />
                                </svg>
                                Document Options
                            </div>
                            <button
                                type="button"
                                className="eap-pdf-sidebar-close-btn"
                                onClick={() => setSidebarOpen(false)}
                                aria-label="Close Options"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Theme Preset */}
                        <div className="eap-pdf-side-sec">
                            <div className="eap-pdf-side-sec__title">Document Theme</div>
                            <div className="eap-pdf-theme-grid">
                                {[
                                    { id: "indigo", label: "Indigo Modern", color: "#4f46e5" },
                                    { id: "executive", label: "Slate Executive", color: "#0f172a" },
                                    { id: "slate", label: "Teal Corporate", color: "#0f766e" },
                                    { id: "minimal", label: "Minimalist", color: "#27272a" },
                                ].map(t => (
                                    <div
                                        key={t.id}
                                        className={`eap-pdf-theme-card ${theme === t.id ? "eap-pdf-theme-card--active" : ""}`}
                                        onClick={() => setTheme(t.id)}
                                    >
                                        <div className="eap-pdf-theme-dot" style={{ background: t.color }} />
                                        <span>{t.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stamp Selector */}
                        <div className="eap-pdf-side-sec">
                            <div className="eap-pdf-side-sec__title">Rubber Status Stamp</div>
                            <div className="eap-pdf-stamp-grid">
                                {[
                                    { id: "approved", label: "Approved", cls: "eap-pdf-stamp-opt--approved" },
                                    { id: "pending", label: "Pending", cls: "eap-pdf-stamp-opt--pending" },
                                    { id: "verified", label: "Verified", cls: "eap-pdf-stamp-opt--verified" },
                                    { id: "confidential", label: "Confidential", cls: "eap-pdf-stamp-opt--confidential" },
                                ].map(s => (
                                    <div
                                        key={s.id}
                                        className={`eap-pdf-stamp-opt ${s.cls} ${selectedStamp === s.id && toggles.stamp ? "eap-pdf-stamp-opt--selected" : ""}`}
                                        onClick={() => {
                                            if (selectedStamp === s.id && toggles.stamp) {
                                                setToggles(prev => ({ ...prev, stamp: false }));
                                            } else {
                                                setSelectedStamp(s.id);
                                                setToggles(prev => ({ ...prev, stamp: true }));
                                            }
                                        }}
                                    >
                                        {s.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="eap-pdf-side-sec">
                            <div className="eap-pdf-side-sec__title">Layer Visibility</div>

                            <div className="eap-pdf-toggle-row" onClick={() => setToggles(prev => ({ ...prev, stamp: !prev.stamp }))}>
                                <span>Rubber Status Stamp</span>
                                <div className={`eap-pdf-toggle-switch ${toggles.stamp ? "eap-pdf-toggle-switch--on" : ""}`}>
                                    <div className="eap-pdf-toggle-knob" />
                                </div>
                            </div>

                            <div className="eap-pdf-toggle-row" onClick={() => setToggles(prev => ({ ...prev, sign: !prev.sign }))}>
                                <span>Signature Box</span>
                                <div className={`eap-pdf-toggle-switch ${toggles.sign ? "eap-pdf-toggle-switch--on" : ""}`}>
                                    <div className="eap-pdf-toggle-knob" />
                                </div>
                            </div>

                            <div className="eap-pdf-toggle-row" onClick={() => setToggles(prev => ({ ...prev, memo: !prev.memo }))}>
                                <span>Sticky Memo Note</span>
                                <div className={`eap-pdf-toggle-switch ${toggles.memo ? "eap-pdf-toggle-switch--on" : ""}`}>
                                    <div className="eap-pdf-toggle-knob" />
                                </div>
                            </div>

                            <div className="eap-pdf-toggle-row" onClick={() => setToggles(prev => ({ ...prev, watermark: !prev.watermark }))}>
                                <span>Background Watermark</span>
                                <div className={`eap-pdf-toggle-switch ${toggles.watermark ? "eap-pdf-toggle-switch--on" : ""}`}>
                                    <div className="eap-pdf-toggle-knob" />
                                </div>
                            </div>

                            <div className="eap-pdf-toggle-row" onClick={() => setToggles(prev => ({ ...prev, terms: !prev.terms }))}>
                                <span>Approval Remarks & Notes</span>
                                <div className={`eap-pdf-toggle-switch ${toggles.terms ? "eap-pdf-toggle-switch--on" : ""}`}>
                                    <div className="eap-pdf-toggle-knob" />
                                </div>
                            </div>
                        </div>

                        {/* Sticky Note Content */}
                        {toggles.memo && (
                            <div className="eap-pdf-side-sec">
                                <div className="eap-pdf-side-sec__title">Sticky Memo Text</div>
                                <input
                                    type="text"
                                    className="eap-doc-editable-text"
                                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                                    value={memoText}
                                    onChange={e => setMemoText(e.target.value)}
                                />
                            </div>
                        )}
                    </aside>
                )}

                {/* ── Document Viewport & A4 Sheet ── */}
                <div className="eap-pdf-viewport">
                    <div
                        className="eap-pdf-canvas-wrapper"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: "top center",
                            marginBottom: zoom < 1.0 ? `-${Math.round((1 - zoom) * 1160)}px` : undefined,
                        }}
                    >
                        <div
                            id="eap-pdf-canvas"
                            ref={pageRef}
                            className={`eap-pdf-page eap-pdf-page--theme-${theme}`}
                        >
                            {/* Watermark */}
                            {toggles.watermark && (
                                <div className="eap-pdf-watermark-overlay">
                                    {selectedStamp.toUpperCase()}
                                </div>
                            )}

                            {/* ── Document Header ── */}
                            <div className="eap-doc-header">
                                <div className="eap-doc-company">
                                    <div className="eap-doc-company__logo-badge">
                                        {companyDetails.name}
                                    </div>
                                    <div className="eap-doc-company__sub">
                                        {companyDetails.addrLine && (
                                            <div className="eap-doc-company__line">{companyDetails.addrLine}</div>
                                        )}
                                        {companyDetails.locLine && (
                                            <div className="eap-doc-company__line">{companyDetails.locLine}</div>
                                        )}
                                        {companyDetails.gst && (
                                            <div className="eap-doc-company__line">
                                                <strong>GSTIN:</strong> {companyDetails.gst}
                                                {companyDetails.phone ? ` | Phone: ${companyDetails.phone}` : ""}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Vendor & Purchase Order Details Grid ── */}
                            <div className="eap-doc-parties-grid">
                                <div className="eap-doc-party-card">
                                    <div className="eap-doc-party-card__label">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        Vendor / Supplier Details
                                    </div>
                                    <div className="eap-doc-party-card__name">{card.vendor || "—"}</div>
                                    <div className="eap-doc-party-card__detail">
                                        {card.vendorAddress && <div className="eap-doc-party-card__line">{card.vendorAddress}</div>}
                                        {(card.vendorAddress1 || card.vendorAddress2) && (
                                            <div className="eap-doc-party-card__line">{[card.vendorAddress1, card.vendorAddress2].filter(Boolean).join(", ")}</div>
                                        )}
                                        {(card.vendorCity || card.vendorState || card.vendorPinCode) && (
                                            <div className="eap-doc-party-card__line">
                                                {[card.vendorCity, card.vendorState].filter(Boolean).join(", ")}
                                                {card.vendorPinCode ? ` — ${card.vendorPinCode}` : ""}
                                            </div>
                                        )}
                                        {card.vendorGst ? (
                                            <div className="eap-doc-party-card__line"><strong>GSTIN:</strong> {card.vendorGst}</div>
                                        ) : (
                                            <div className="eap-doc-party-card__line"><strong>GSTIN:</strong> —</div>
                                        )}
                                        {card.vendorContact && (
                                            <div className="eap-doc-party-card__line"><strong>Contact:</strong> {card.vendorContact}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="eap-doc-party-card eap-doc-party-card--po">
                                    <div className="eap-doc-party-card__label-row">
                                        <div className="eap-doc-party-card__label">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14,2 14,8 20,8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <line x1="10" y1="9" x2="8" y2="9" />
                                            </svg>
                                            Purchase Order Details
                                        </div>
                                        <div className="eap-doc-po-pill-row">
                                            <span className="eap-doc-meta-badge" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                                                {card.type || "Raw Material"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="eap-doc-party-card__name">
                                        PO Number: {card.poNo || "—"}
                                    </div>

                                    <div className="eap-doc-party-card__detail">
                                        {card.amdNo && (
                                            <div className="eap-doc-party-card__line">
                                                Amnd No: <strong>{card.amdNo}</strong>
                                            </div>
                                        )}
                                        <div className="eap-doc-party-card__line">
                                            PO Date: <strong>{card.poDate || "—"}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Line Items Table ── */}
                            <div className="eap-doc-items-section">
                                <table className="eap-doc-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "44px" }} className="text-center">S.No</th>
                                            <th className="text-center">Item Description</th>
                                            <th style={{ width: "80px" }} className="text-center">HSN Code</th>
                                            <th style={{ width: "55px" }} className="text-center">UOM</th>
                                            <th style={{ width: "65px" }} className="text-center">Qty</th>
                                            <th style={{ width: "70px" }} className="text-center">Qty Kgs</th>
                                            <th style={{ width: "75px" }} className="text-center">Rate</th>
                                            <th style={{ width: "95px" }} className="text-center">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((row, i) => (
                                            <tr key={i} className="eap-doc-row">
                                                <td style={{ width: "44px" }} className="text-center">{row.sNo || i + 1}</td>
                                                <td className="eap-doc-item-combined-cell">
                                                    <div className="eap-doc-item-combo">
                                                        {row.codeNo && row.codeNo !== "—" && (
                                                            <span className="eap-doc-item-code">{row.codeNo}</span>
                                                        )}
                                                        <span className="eap-doc-item-desc">{row.description || "—"}</span>
                                                    </div>
                                                </td>
                                                <td style={{ width: "80px" }} className="text-center">
                                                    {row.hsnCode || row.hsn || row.hsn_code || row.tarrifHeadingNo || row.tariffHeadingNo || "—"}
                                                </td>
                                                <td style={{ width: "55px" }} className="text-center">{row.uom || "NOS"}</td>
                                                <td style={{ width: "65px" }} className="text-right">{Number(row.qty || 0).toLocaleString("en-IN")}</td>
                                                <td style={{ width: "70px" }} className="text-right">
                                                    {row.qtyKgs !== undefined && row.qtyKgs !== null && row.qtyKgs !== ""
                                                        ? Number(row.qtyKgs).toLocaleString("en-IN")
                                                        : row.qtyOthers !== undefined && row.qtyOthers !== null && row.qtyOthers !== ""
                                                            ? Number(row.qtyOthers).toLocaleString("en-IN")
                                                            : "—"}
                                                </td>
                                                <td style={{ width: "75px" }} className="text-right">{Number(row.rate || 0).toLocaleString("en-IN")}</td>
                                                <td style={{ width: "95px" }} className="text-right eap-doc-item-amt">{fmt(row.amount)}</td>
                                            </tr>
                                        ))}
                                        <tr className="eap-doc-filler-row" aria-hidden="true">
                                            <td style={{ width: "44px" }}></td>
                                            <td></td>
                                            <td style={{ width: "80px" }}></td>
                                            <td style={{ width: "55px" }}></td>
                                            <td style={{ width: "65px" }}></td>
                                            <td style={{ width: "70px" }}></td>
                                            <td style={{ width: "75px" }}></td>
                                            <td style={{ width: "95px" }}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Bottom Grid: Terms, Words & Financial Summary ── */}
                            <div className="eap-doc-bottom-grid">

                                {/* Left Side: Words & Remarks unified box */}
                                <div className="eap-doc-notes-block">
                                    <div className="eap-doc-words-box">
                                        <div className="eap-doc-words-section">
                                            <div className="eap-doc-words-label">Amount Chargeable (in words):</div>
                                            <div className="eap-doc-words-val">{amountInWords}</div>
                                        </div>

                                        {toggles.terms && (
                                            <div className="eap-doc-remarks-section">
                                                <div className="eap-doc-remarks-label">Approval Remarks & Notes:</div>
                                                <div
                                                    className="eap-doc-remarks-val eap-doc-editable-text"
                                                    contentEditable={isDragMode}
                                                    suppressContentEditableWarning
                                                    onBlur={e => {
                                                        const val = e.currentTarget.textContent;
                                                        setRemarksText(val);
                                                    }}
                                                >
                                                    {remarksText}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Structured Financial Summary */}
                                <div className="eap-doc-fin-wrap">
                                    <div className="eap-doc-fin-title">
                                        Financial Summary
                                    </div>
                                    <div className="eap-doc-fin-card">
                                        {fin?.summaryRows && fin.summaryRows.length > 0 ? (
                                            fin.summaryRows.map(r => (
                                                <div key={r.label} className={`eap-doc-fin-row${r.sub ? " eap-doc-fin-row--sub" : ""}${r.grand ? " eap-doc-fin-row--grand" : ""}`}>
                                                    <span className="eap-doc-fin-label">{r.label}</span>
                                                    <span className="eap-doc-fin-val">
                                                        {r.grand ? `₹ ${fmt(r.value)}` : r.neg && r.value > 0 ? `- ${fmt(r.value)}` : fmt(r.value)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <>
                                                <div className="eap-doc-fin-row">
                                                    <span className="eap-doc-fin-label">Total Amount</span>
                                                    <span className="eap-doc-fin-val">{fmt(totalAmount)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row eap-doc-fin-row--sub">
                                                    <span className="eap-doc-fin-label">Discount</span>
                                                    <span className="eap-doc-fin-val">{discount > 0 ? `- ${fmt(discount)}` : "0"}</span>
                                                </div>
                                                <div className="eap-doc-fin-row eap-doc-fin-row--sub">
                                                    <span className="eap-doc-fin-label">Before Tax P & F</span>
                                                    <span className="eap-doc-fin-val">{fmt(bfTaxPF)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row eap-doc-fin-row--sub">
                                                    <span className="eap-doc-fin-label">After Tax P & F</span>
                                                    <span className="eap-doc-fin-val">{fmt(afTaxPF)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row">
                                                    <span className="eap-doc-fin-label">Tax CGST @ {cgstPct} %</span>
                                                    <span className="eap-doc-fin-val">{fmt(cgstAmt)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row">
                                                    <span className="eap-doc-fin-label">Tax SGST @ {sgstPct} %</span>
                                                    <span className="eap-doc-fin-val">{fmt(sgstAmt)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row eap-doc-fin-row--sub">
                                                    <span className="eap-doc-fin-label">Round Off</span>
                                                    <span className="eap-doc-fin-val">{fmt(roundOff)}</span>
                                                </div>
                                                <div className="eap-doc-fin-row eap-doc-fin-row--grand">
                                                    <span className="eap-doc-fin-label">GRAND TOTAL</span>
                                                    <span className="eap-doc-fin-val">₹ {fmt(grandTotal)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Document Footer & Signatories Row ── */}
                            <div className="eap-doc-footer-sec">
                                {toggles.sign && (
                                    <>
                                        {/* 1. Prepared By */}
                                        <div className="eap-doc-sign-box">
                                            <div className="eap-pdf-sign-label">Prepared By</div>
                                            <div className="eap-pdf-sign-line" />
                                            <div className="eap-pdf-sign-user">
                                                <strong>{card.createdBy || "Store / Purchase"}</strong>
                                                <span>Prepared Signatory</span>
                                            </div>
                                        </div>

                                        {/* 2. Checked By */}
                                        <div className="eap-doc-sign-box">
                                            <div className="eap-pdf-sign-label">Checked By</div>
                                            <div className="eap-pdf-sign-line" />
                                            <div className="eap-pdf-sign-user">
                                                <strong>{card.checkedBy || "Accounts / Quality"}</strong>
                                                <span>Verified Signatory</span>
                                            </div>
                                        </div>

                                        {/* 3. Authorized Signatory */}
                                        <div className="eap-doc-sign-box eap-doc-sign-box--auth">
                                            <div className="eap-pdf-sign-label">For {companyName}</div>
                                            <div className="eap-pdf-sign-line" />
                                            <div className="eap-pdf-sign-user">
                                                <strong>{card.approvedBy || "Authorized Signatory"}</strong>
                                                <span>Purchase / Material Head</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ── DRAGGABLE INTERACTIVE LAYER (Stamp & Memo) ── */}
                            <div className="eap-pdf-drag-layer">

                                {/* 1. Draggable Rubber Stamp */}
                                {toggles.stamp && (
                                    <div
                                        className={`eap-pdf-draggable ${draggingItem === "stamp" ? "eap-pdf-draggable--active" : ""}`}
                                        style={{ left: `${positions.stamp.x}px`, top: `${positions.stamp.y}px` }}
                                        onMouseDown={e => handleDragStart(e, "stamp")}
                                        onTouchStart={e => handleDragStart(e, "stamp")}
                                        title={isDragMode ? "Click & Drag Rubber Stamp" : ""}
                                    >
                                        <div className={`eap-pdf-rubber-stamp eap-pdf-rubber-stamp--${selectedStamp}`}>
                                            {selectedStamp.toUpperCase()}
                                            <span className="eap-pdf-rubber-stamp__sub">
                                                {card.approvedBy ? `By: ${card.approvedBy}` : "Electronic Seal"}
                                            </span>
                                        </div>
                                        {isDragMode && (
                                            <>
                                                <div className="eap-pdf-drag-handle">✥</div>
                                                <button
                                                    type="button"
                                                    className="eap-pdf-drag-remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setToggles(prev => ({ ...prev, stamp: false }));
                                                    }}
                                                    title="Remove Stamp"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* 2. Draggable Sticky Annotation Memo */}
                                {toggles.memo && (
                                    <div
                                        className={`eap-pdf-draggable ${draggingItem === "memo" ? "eap-pdf-draggable--active" : ""}`}
                                        style={{ left: `${positions.memo.x}px`, top: `${positions.memo.y}px` }}
                                        onMouseDown={e => handleDragStart(e, "memo")}
                                        onTouchStart={e => handleDragStart(e, "memo")}
                                        title={isDragMode ? "Click & Drag Sticky Memo" : ""}
                                    >
                                        <div className="eap-pdf-draggable-memo">
                                            <div className="eap-pdf-draggable-memo__pin" />
                                            <div>{memoText}</div>
                                        </div>
                                        {isDragMode && (
                                            <>
                                                <div className="eap-pdf-drag-handle">✥</div>
                                                <button
                                                    type="button"
                                                    className="eap-pdf-drag-remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setToggles(prev => ({ ...prev, memo: false }));
                                                    }}
                                                    title="Remove Sticky Memo"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Drag Mode Floating Tip */}
            {isDragMode && (
                <div className="eap-pdf-drag-tip">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="5 9 2 12 5 15" />
                        <polyline points="9 5 12 2 15 5" />
                        <polyline points="15 19 12 22 9 19" />
                        <polyline points="19 9 22 12 19 15" />
                    </svg>
                    Drag Mode Enabled: Click and drag the Rubber Stamp, Signature, or Memo to reposition before printing.
                </div>
            )}

        </div>,
        document.body
    );
}
