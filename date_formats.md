# Non-Standard Date Formats Analysis

Below is the list of modules, fields, and formats used across the codebase that are **not** in the standard `DD-MM-YYYY` format (such as `YYYY-MM-DD`, `DD/MM/YYYY`, `MMM-YY`, and long month descriptions).

---

## 1. Production Analysis Module
- **Date Range parameters** (`from` / `to`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.toISOString().slice(0, 10)` in `ProductionAnalysis.jsx`.
- **Chart Month Labels** (`month_label`): `MMM YY` (e.g. `Jul 26`)
  - *Location:* Sourced via `.strftime("%b %y")` in `views_production_analysis.py`.

---

## 2. Plant Performance Module
- **GRN Date** (`grn_date_str`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.strftime("%Y-%m-%d")` in `views_plantperformance.py`.
- **Chart Month Label** (`month_label`): `MMM-YY` (e.g. `Jul-26`)
  - *Location:* Sourced via `.strftime("%b-%y")` in `views_plantperformance.py`.
- **Invoice Date** (`inv_date_str`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.strftime("%Y-%m-%d")` in `views_plantperformance.py`.
- **PO Date** (`po_date_str`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.strftime("%Y-%m-%d")` in `views_plantperformance.py`.

---

## 3. Settings & Billing Module
- **Plan Period Range** (`plan_start_str` / `plan_end_str` / `signup_date_str`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.strftime("%Y-%m-%d")` in `views_settings.py`.
- **Invoice Month Label**: `Month YYYY` (e.g. `July 2026`)
  - *Location:* Sourced via `.strftime("%B %Y")` in `views_settings.py`.
- **Invoice Date String**: `MMM DD, YYYY` (e.g. `Jul 25, 2026`)
  - *Location:* Sourced via `.strftime("%b %d, %Y")` in `views_settings.py`.
- **Renewal Display**: `Month DD, YYYY` (e.g. `July 25, 2026`)
  - *Location:* Sourced via `.strftime("%B %d, %Y")` in `views_settings.py`.
- **Signup / End Date**: `DD/MM/YYYY` (e.g. `25/07/2026`)
  - *Location:* Formatted in frontend `Settings.jsx` via `formatDateDMY`.
- **Plan Start / End Period**: `MMM DD, YYYY` (e.g. `Jul 25, 2026`)
  - *Location:* Formatted in frontend `Settings.jsx` via `formatBillingDate`.

---

## 4. Sales Analysis Module
- **PO Month / Schedule Month** (`po_month` / `schd_month`): `Month YYYY` (e.g. `July 2026`)
  - *Location:* Sourced via `.strftime("%B %Y")` in `views_sales_analysis.py`.
- **Invoice Date** (`inv_date_str`): `DD/MM/YYYY` (e.g. `25/07/2026`)
  - *Location:* Sourced via `.strftime("%d/%m/%Y")` in `views_sales_analysis.py`.

---

## 5. Quality Analysis Module
- **Inspection / Calibration Date** (`formatted_date` / `date` / `last_calib`): `DD-MMM-YYYY` (e.g. `25-Jul-2026`)
  - *Location:* Sourced via `.strftime("%d-%b-%Y")` in `views_qualityanalysis.py`.
- **Period Label** (`period_lbl`): `DD-MMM-YYYY – DD-MMM-YYYY` (e.g. `01-Jul-2026 – 25-Jul-2026`)
  - *Location:* Sourced via `.strftime("%d-%b-%Y")` in `views_qualityanalysis.py`.

---

## 6. Purchase Analysis Module
- **Indent / PO / GRN Dates** (`indDt` / `poDt` / `grnDt`): `DD-MMM-YYYY` (e.g. `25-Jul-2026`)
  - *Location:* Sourced via `.strftime("%d-%b-%Y")` in `views_purchaseanalysis.py`.

---

## 7. Rejection & Rework Module
- **Entry Date** (`date_str`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.strftime("%Y-%m-%d")` in `views_rejection_rework_report.py`.

---

## 8. Transaction Approval Module
- **Approval Date** (`approved_dt` / `date`): `DD/MM/YYYY` (e.g. `25/07/2026`)
  - *Location:* Sourced via `.strftime("%d/%m/%Y")` in `views_tapproval.py`.
- **Approval Timestamp** (`approved_dt`): `DD/MM/YYYY HH:MM AM/PM` (e.g. `25/07/2026 11:37 AM`)
  - *Location:* Sourced via `.strftime("%d/%m/%Y %I:%M %p")` in `views_tapproval.py`.

---

## 9. User Transaction Report Module
- **Transaction Timestamp** (`timestamp`): `DD/MM/YYYY` (e.g. `25/07/2026`)
  - *Location:* Sourced via `.toLocaleDateString("en-GB")` in `UserTransactionReport.jsx`.
- **Query range parameters** (`fromDate` / `toDate`): `YYYY-MM-DD` (e.g. `2026-07-25`)
  - *Location:* Sourced via `.toISOString().split("T")[0]` in `UserTransactionReport.jsx`.
