# ════════════════════════════════════════════
#  views_rejection_rework_report.py
#  Plant Performance — Rejection & Rework from inspection tables
#  (patterns aligned with views_qualityanalysis.py)
# ════════════════════════════════════════════

from datetime import datetime, date

from .views import table_exists
from .views_efficiency_report import (
    _parse_bool_param,
    _month_label_from_date,
    _months_in_range,
    _month_labels_for_payload,
    _efficiency_query_date_range,
)


def _is_vendor_job(dtype_val):
    d = str(dtype_val or "").lower().strip()
    return any(k in d for k in ("vendor", "sub contract", "subcontract", "outside", "job work"))


def _map_rej_type_ui(insp_source, is_vendor_job=False):
    if insp_source == "Supplier":
        return "Supplier Rej"
    if insp_source == "Final Insp":
        return "Final Insp Rej"
    if insp_source == "Job Order":
        return "Vendor Rej" if is_vendor_job else "In-house Rej"
    if insp_source == "Intermediate":
        return "In-house Rej"
    return "In-house Rej"


def _map_rework_group_ui(insp_source, is_vendor_job=False):
    if insp_source == "Final Insp":
        return "Final Insp"
    if insp_source == "Job Order":
        return "Vendor" if is_vendor_job else "In-House"
    if insp_source == "Intermediate":
        return "In-House"
    if insp_source == "Customer":
        return "Customer Rework"
    return "In-House"


def _part_rate_expr(part_col):
    return f"""(
        SELECT TOP 1 CAST(CBD.BaseRate AS FLOAT)
        FROM Commer_BaseRateDet CBD
        WHERE CBD.PartNo = {part_col}
          AND ISNULL(CBD.deleted, 0) = 0
        ORDER BY CBD.BReffdt DESC
    )"""


def _fetch_quality_inspection_rows(cursor, start_date, end_date):
    """Unified inspection rows with rejection + rework qty from ERP tables."""
    if not all(
        table_exists(cursor, t)
        for t in (
            "InJob_Mas",
            "InJob_Det",
            "InterInspectionEntry",
            "FinalInspectionEntry",
        )
    ):
        return []

    has_process_det = table_exists(cursor, "ProcessDet")
    has_commer = table_exists(cursor, "Commer_Mas")
    has_cust = table_exists(cursor, "CustMast")

    pd_join = (
        "LEFT JOIN ProcessDet pd ON d.process = pd.pcode AND ISNULL(pd.deleted, 0) = 0"
        if has_process_det
        else ""
    )
    pd_join_i = (
        "LEFT JOIN ProcessDet pd ON i.process = pd.pcode AND ISNULL(pd.deleted, 0) = 0"
        if has_process_det
        else ""
    )
    pd_join_f = (
        "LEFT JOIN ProcessDet pd ON f.process = pd.pcode AND ISNULL(pd.deleted, 0) = 0"
        if has_process_det
        else ""
    )
    process_inj = "ISNULL(pd.process, ISNULL(d.process, N''))" if has_process_det else "ISNULL(d.process, N'')"
    process_int = "ISNULL(pd.process, ISNULL(i.process, N''))" if has_process_det else "ISNULL(i.process, N'')"
    process_fin = "ISNULL(pd.process, ISNULL(f.process, N''))" if has_process_det else "ISNULL(f.process, N'')"

    cust_inj = (
        "LTRIM(RTRIM(ISNULL(cust.CName, N'—')))"
        if has_cust
        else "N'—'"
    )
    cust_int = (
        """LTRIM(RTRIM(ISNULL(cust_i.CName, N'—')))"""
        if has_cust and has_commer
        else "N'—'"
    )
    cust_fin = cust_int.replace("cust_i", "cust_f").replace("com_i", "com_f")

    com_join_i = (
        "LEFT JOIN Commer_Mas com_i ON i.partno = com_i.PartNo AND ISNULL(com_i.deleted, 0) = 0"
        if has_commer
        else ""
    )
    com_join_f = (
        "LEFT JOIN Commer_Mas com_f ON f.partno = com_f.PartNo AND ISNULL(com_f.deleted, 0) = 0"
        if has_commer
        else ""
    )
    cust_join_inj = (
        "LEFT JOIN CustMast cust ON m.cid = cust.Id AND ISNULL(cust.deleted, 0) = 0"
        if has_cust
        else ""
    )
    cust_join_i = (
        "LEFT JOIN CustMast cust_i ON com_i.cid = cust_i.Id AND ISNULL(cust_i.deleted, 0) = 0"
        if has_cust and has_commer
        else ""
    )
    cust_join_f = (
        "LEFT JOIN CustMast cust_f ON com_f.cid = cust_f.Id AND ISNULL(cust_f.deleted, 0) = 0"
        if has_cust and has_commer
        else ""
    )

    rate_inj = _part_rate_expr("d.partno")
    rate_int = _part_rate_expr("i.partno")
    rate_fin = _part_rate_expr("f.partno")

    reason_inj = """ISNULL((
        SELECT STUFF((
            SELECT ', ' + r.rejection
            FROM RejDetail_Table rd
            INNER JOIN Rejection r ON rd.RejCode = r.rcode
            WHERE rd.ins_Dc = m.inspno AND rd.PartNo = d.partno AND ISNULL(rd.deleted, 0) = 0
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
    ), N'')"""

    reason_int = """ISNULL((
        SELECT STUFF((
            SELECT ', ' + r.rejection
            FROM RejDetail_Table rd
            INNER JOIN Rejection r ON rd.RejCode = r.rcode
            WHERE rd.ins_Dc = i.inter_inspno AND rd.PartNo = i.partno AND ISNULL(rd.deleted, 0) = 0
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
    ), N'')"""

    reason_fin = """ISNULL((
        SELECT STUFF((
            SELECT ', ' + r.rejection
            FROM RejDetail_Table rd
            INNER JOIN Rejection r ON rd.RejCode = r.rcode
            WHERE rd.ins_Dc = f.finspno AND rd.PartNo = f.partno AND ISNULL(rd.deleted, 0) = 0
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
    ), N'')"""

    vendor_flag = """
        CASE
            WHEN LOWER(LTRIM(RTRIM(ISNULL(m.dtype, N'')))) LIKE N'%vendor%'
              OR LOWER(LTRIM(RTRIM(ISNULL(m.dtype, N'')))) LIKE N'%sub%'
              OR LOWER(LTRIM(RTRIM(ISNULL(m.dtype, N'')))) LIKE N'%outside%'
            THEN 1 ELSE 0
        END
    """

    branches = [f"""
        SELECT
            CAST(m.inspdate AS DATE) AS EntryDate,
            N'Job Order' AS InspSource,
            {vendor_flag} AS IsVendorJob,
            {cust_inj} AS CustomerName,
            {cust_inj} AS VendorName,
            CAST(N'' AS NVARCHAR(256)) AS SupplierName,
            LTRIM(RTRIM(CAST(d.partno AS NVARCHAR(128)))) AS PartNo,
            LTRIM(RTRIM(CAST(ISNULL(d.description, N'') AS NVARCHAR(512)))) AS PartName,
            LTRIM(RTRIM(CAST({process_inj} AS NVARCHAR(256)))) AS ProcessLine,
            LTRIM(RTRIM(CAST(ISNULL(m.inspby, N'') AS NVARCHAR(256)))) AS OperatorName,
            LTRIM(RTRIM(CAST(ISNULL(m.inspby, N'') AS NVARCHAR(256)))) AS InspectorName,
            LTRIM(RTRIM(CAST(ISNULL(m.inspno, N'') AS NVARCHAR(64)))) AS InspNo,
            {reason_inj} AS Reason,
            CAST(ISNULL(d.matrej, 0) + ISNULL(d.macrej, 0) AS FLOAT) AS RejQty,
            CAST(ISNULL(d.rwqty, 0) AS FLOAT) AS ReworkQty,
            CAST(ISNULL(d.jobqty, 0) AS FLOAT) AS InspQty,
            CAST(ISNULL({rate_inj}, 0) AS FLOAT) AS UnitRate
        FROM InJob_Mas m
        INNER JOIN InJob_Det d ON m.inspno = d.inspno
        {pd_join}
        {cust_join_inj}
        WHERE ISNULL(m.deleted, 0) = 0 AND ISNULL(d.deleted, 0) = 0
          AND CAST(m.inspdate AS DATE) BETWEEN ? AND ?
          AND (
              CAST(ISNULL(d.matrej, 0) + ISNULL(d.macrej, 0) AS FLOAT) > 0
              OR CAST(ISNULL(d.rwqty, 0) AS FLOAT) > 0
          )
    """, f"""
        SELECT
            CAST(i.inter_inspdate AS DATE) AS EntryDate,
            N'Intermediate' AS InspSource,
            CAST(0 AS INT) AS IsVendorJob,
            {cust_int} AS CustomerName,
            CAST(N'' AS NVARCHAR(256)) AS VendorName,
            CAST(N'' AS NVARCHAR(256)) AS SupplierName,
            LTRIM(RTRIM(CAST(i.partno AS NVARCHAR(128)))) AS PartNo,
            LTRIM(RTRIM(CAST(ISNULL(i.description, N'') AS NVARCHAR(512)))) AS PartName,
            LTRIM(RTRIM(CAST({process_int} AS NVARCHAR(256)))) AS ProcessLine,
            LTRIM(RTRIM(CAST(ISNULL(i.inspby, N'') AS NVARCHAR(256)))) AS OperatorName,
            LTRIM(RTRIM(CAST(ISNULL(i.inspby, N'') AS NVARCHAR(256)))) AS InspectorName,
            LTRIM(RTRIM(CAST(ISNULL(i.inter_inspno, N'') AS NVARCHAR(64)))) AS InspNo,
            {reason_int} AS Reason,
            CAST(ISNULL(i.rejqty, 0) AS FLOAT) AS RejQty,
            CAST(ISNULL(i.rwqty, 0) AS FLOAT) AS ReworkQty,
            CAST(ISNULL(i.inspqty, 0) AS FLOAT) AS InspQty,
            CAST(ISNULL({rate_int}, 0) AS FLOAT) AS UnitRate
        FROM InterInspectionEntry i
        {pd_join_i}
        {com_join_i}
        {cust_join_i}
        WHERE ISNULL(i.deleted, 0) = 0
          AND CAST(i.inter_inspdate AS DATE) BETWEEN ? AND ?
          AND (
              CAST(ISNULL(i.rejqty, 0) AS FLOAT) > 0
              OR CAST(ISNULL(i.rwqty, 0) AS FLOAT) > 0
          )
    """, f"""
        SELECT
            CAST(f.finspdate AS DATE) AS EntryDate,
            N'Final Insp' AS InspSource,
            CAST(0 AS INT) AS IsVendorJob,
            {cust_fin} AS CustomerName,
            CAST(N'' AS NVARCHAR(256)) AS VendorName,
            CAST(N'' AS NVARCHAR(256)) AS SupplierName,
            LTRIM(RTRIM(CAST(f.partno AS NVARCHAR(128)))) AS PartNo,
            LTRIM(RTRIM(CAST(ISNULL(f.description, N'') AS NVARCHAR(512)))) AS PartName,
            LTRIM(RTRIM(CAST({process_fin} AS NVARCHAR(256)))) AS ProcessLine,
            LTRIM(RTRIM(CAST(ISNULL(f.inspby, N'') AS NVARCHAR(256)))) AS OperatorName,
            LTRIM(RTRIM(CAST(ISNULL(f.inspby, N'') AS NVARCHAR(256)))) AS InspectorName,
            LTRIM(RTRIM(CAST(ISNULL(f.finspno, N'') AS NVARCHAR(64)))) AS InspNo,
            {reason_fin} AS Reason,
            CAST(ISNULL(f.rejqty, 0) AS FLOAT) AS RejQty,
            CAST(ISNULL(f.matrejqty, 0) AS FLOAT) AS ReworkQty,
            CAST(ISNULL(f.totqty, 0) AS FLOAT) AS InspQty,
            CAST(ISNULL({rate_fin}, 0) AS FLOAT) AS UnitRate
        FROM FinalInspectionEntry f
        {pd_join_f}
        {com_join_f}
        {cust_join_f}
        WHERE ISNULL(f.deleted, 0) = 0
          AND CAST(f.finspdate AS DATE) BETWEEN ? AND ?
          AND (
              CAST(ISNULL(f.rejqty, 0) AS FLOAT) > 0
              OR CAST(ISNULL(f.matrejqty, 0) AS FLOAT) > 0
          )
    """]

    supplier_rows = _fetch_supplier_iqc_rows(cursor, start_date, end_date)
    sql = "\n    UNION ALL\n".join(branches) + "\nORDER BY EntryDate, InspNo"
    params = []
    for _ in branches:
        params.extend([start_date, end_date])

    try:
        cursor.execute(sql, params)
        raw = cursor.fetchall() or []
    except Exception:
        return supplier_rows

    return list(raw) + supplier_rows


def _fetch_supplier_iqc_rows(cursor, start_date, end_date):
    """IQC / GRN supplier rejections → Supplier Rej rows."""
    if not all(table_exists(cursor, t) for t in ("grn_mas", "inspmas", "inspdet")):
        return []
    try:
        sql = """
        SELECT
            CAST(IM.irdate AS DATE) AS EntryDate,
            N'Supplier' AS InspSource,
            CAST(0 AS INT) AS IsVendorJob,
            LTRIM(RTRIM(ISNULL(CM.CName, N'—'))) AS CustomerName,
            CAST(N'' AS NVARCHAR(256)) AS VendorName,
            LTRIM(RTRIM(ISNULL(CM.CName, N'—'))) AS SupplierName,
            LTRIM(RTRIM(CAST(ISNULL(D.partno, N'') AS NVARCHAR(128)))) AS PartNo,
            LTRIM(RTRIM(CAST(ISNULL(D.description, N'') AS NVARCHAR(512)))) AS PartName,
            CAST(N'' AS NVARCHAR(256)) AS ProcessLine,
            CAST(N'' AS NVARCHAR(256)) AS OperatorName,
            CAST(N'' AS NVARCHAR(256)) AS InspectorName,
            LTRIM(RTRIM(CAST(ISNULL(D.irno, N'') AS NVARCHAR(64)))) AS InspNo,
            CAST(N'' AS NVARCHAR(512)) AS Reason,
            CAST(ISNULL(D.matrej, 0) + ISNULL(D.macrej, 0) AS FLOAT) AS RejQty,
            CAST(0 AS FLOAT) AS ReworkQty,
            CAST(ISNULL(D.inspqty, 0) AS FLOAT) AS InspQty,
            CAST(ISNULL((
                SELECT TOP 1 CAST(CBD.BaseRate AS FLOAT)
                FROM Commer_BaseRateDet CBD
                WHERE CBD.PartNo = D.partno AND ISNULL(CBD.deleted, 0) = 0
                ORDER BY CBD.BReffdt DESC
            ), 0) AS FLOAT) AS UnitRate
        FROM grn_mas GM
        INNER JOIN inspmas IM ON GM.grnno = IM.grnno AND ISNULL(IM.deleted, 0) = 0
        INNER JOIN inspdet D ON IM.irno = D.irno AND ISNULL(D.deleted, 0) = 0
        LEFT JOIN CustMast CM ON GM.cid = CM.Id AND ISNULL(CM.deleted, 0) = 0
        WHERE ISNULL(GM.deleted, 0) = 0
          AND CAST(IM.irdate AS DATE) BETWEEN ? AND ?
          AND CAST(ISNULL(D.matrej, 0) + ISNULL(D.macrej, 0) AS FLOAT) > 0
        """
        cursor.execute(sql, [start_date, end_date])
        return cursor.fetchall() or []
    except Exception:
        return []


def _row_to_dict(raw_row):
    (
        entry_date,
        insp_source,
        is_vendor_job,
        customer_name,
        vendor_name,
        supplier_name,
        part_no,
        part_name,
        process_line,
        operator_name,
        inspector_name,
        insp_no,
        reason,
        rej_qty,
        rework_qty,
        insp_qty,
        unit_rate,
    ) = raw_row[:17]

    is_vendor = bool(is_vendor_job)
    insp_src = str(insp_source or "").strip()
    rej_type = _map_rej_type_ui(insp_src, is_vendor)
    rework_group = _map_rework_group_ui(insp_src, is_vendor)

    rej_q = float(rej_qty or 0)
    rwk_q = float(rework_qty or 0)
    insp_q = float(insp_qty or 0)
    rate = float(unit_rate or 0)
    if rate <= 0:
        rate = 100.0

    date_str = ""
    month_label = "—"
    if entry_date:
        if hasattr(entry_date, "strftime"):
            date_str = entry_date.strftime("%Y-%m-%d")
            month_label = _month_label_from_date(entry_date)
        else:
            date_str = str(entry_date).strip()[:10]
            try:
                parsed = datetime.strptime(date_str, "%Y-%m-%d")
                month_label = _month_label_from_date(parsed)
            except Exception:
                pass

    rej_pct = round((rej_q / insp_q) * 100, 2) if insp_q > 0 and rej_q > 0 else 0.0
    rwk_pct = round((rwk_q / insp_q) * 100, 2) if insp_q > 0 and rwk_q > 0 else 0.0

    cust = str(customer_name or "—").strip() or "—"
    vendor = str(vendor_name or "").strip()
    supplier = str(supplier_name or "").strip()
    proc = str(process_line or "—").strip() or "—"
    oper = str(operator_name or "—").strip() or "—"
    insp = str(inspector_name or "—").strip() or "—"
    reason_s = str(reason or "").strip()

    insp_label = {
        "Job Order": "Job order",
        "Intermediate": "Intermediate",
        "Final Insp": "Final Insp",
        "Supplier": "Supplier IQC",
    }.get(insp_src, insp_src)

    return {
        "date": date_str,
        "month": month_label,
        "inspSource": insp_src,
        "inspLabel": insp_label,
        "rejType": rej_type,
        "reworkGroup": rework_group,
        "customer": cust,
        "vendor": vendor or cust,
        "supplier": supplier or vendor or cust,
        "partNo": str(part_no or "").strip(),
        "partName": str(part_name or "").strip(),
        "process": proc,
        "operator": oper,
        "inspector": insp,
        "inspNo": str(insp_no or "").strip(),
        "reason": reason_s,
        "rejQty": round(rej_q, 2),
        "reworkQty": round(rwk_q, 2),
        "inspQty": round(insp_q, 2),
        "rejPct": rej_pct,
        "reworkPct": rwk_pct,
        "unitRate": round(rate, 2),
        "rejValue": round(rej_q * rate, 2),
        "reworkValue": round(rwk_q * rate, 2),
        "isVendorJob": is_vendor,
    }


def _compute_rejection_kpis(rows, start_date, end_date):
    scoped = [r for r in rows if r.get("rejQty", 0) > 0]
    if not scoped:
        return {"avgRejPct": 0, "totalRejQty": 0, "totalRejValue": 0, "rowCount": 0}

    total_rej = sum(float(r.get("rejQty") or 0) for r in scoped)
    total_insp = sum(float(r.get("inspQty") or 0) for r in scoped)
    total_val = sum(float(r.get("rejValue") or 0) for r in scoped)
    avg_pct = round((total_rej / total_insp) * 100, 2) if total_insp > 0 else 0.0

    return {
        "avgRejPct": avg_pct,
        "totalRejQty": round(total_rej, 2),
        "totalRejValue": round(total_val, 2),
        "rowCount": len(scoped),
    }


def _compute_rework_kpis(rows, start_date, end_date):
    scoped = [r for r in rows if r.get("reworkQty", 0) > 0]
    if not scoped:
        return {"avgReworkPct": 0, "totalReworkQty": 0, "totalReworkValue": 0, "rowCount": 0}

    total_rwk = sum(float(r.get("reworkQty") or 0) for r in scoped)
    total_insp = sum(float(r.get("inspQty") or 0) for r in scoped)
    total_val = sum(float(r.get("reworkValue") or 0) for r in scoped)
    avg_pct = round((total_rwk / total_insp) * 100, 2) if total_insp > 0 else 0.0

    return {
        "avgReworkPct": avg_pct,
        "totalReworkQty": round(total_rwk, 2),
        "totalReworkValue": round(total_val, 2),
        "rowCount": len(scoped),
    }


def _monthwise_rejection(rows, month_labels):
    rates, qtys = [], []
    for mo in month_labels:
        month_rows = [r for r in rows if r.get("month") == mo and r.get("rejQty", 0) > 0]
        if not month_rows:
            rates.append(0.0)
            qtys.append(0)
            continue
        total_rej = sum(float(r.get("rejQty") or 0) for r in month_rows)
        total_insp = sum(float(r.get("inspQty") or 0) for r in month_rows)
        rates.append(round((total_rej / total_insp) * 100, 2) if total_insp > 0 else 0.0)
        qtys.append(int(round(total_rej)))
    return {"labels": month_labels, "rates": rates, "qtys": qtys}


def _monthwise_rework(rows, month_labels):
    rates, qtys = [], []
    for mo in month_labels:
        month_rows = [r for r in rows if r.get("month") == mo and r.get("reworkQty", 0) > 0]
        if not month_rows:
            rates.append(0.0)
            qtys.append(0)
            continue
        total_rwk = sum(float(r.get("reworkQty") or 0) for r in month_rows)
        total_insp = sum(float(r.get("inspQty") or 0) for r in month_rows)
        rates.append(round((total_rwk / total_insp) * 100, 2) if total_insp > 0 else 0.0)
        qtys.append(int(round(total_rwk)))
    return {"labels": month_labels, "rates": rates, "qtys": qtys}


def _filter_options_from_rows(rows):
    customers = sorted({r.get("customer") for r in rows if r.get("customer") and r["customer"] != "—"})
    part_nos = sorted({r.get("partNo") for r in rows if r.get("partNo")})
    reasons = sorted({r.get("reason") for r in rows if r.get("reason")})
    return {"customers": customers, "partNos": part_nos, "reasons": reasons}


def build_rejection_compare_payload(cursor, start_date, end_date, load_full_fy=True):
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_quality_inspection_rows(cursor, query_start, query_end)
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_quality_inspection_rows(cursor, prev_start, prev_end)
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = [_row_to_dict(r) for r in raw_rows]
    month_labels = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "monthLabels": month_labels,
        "monthwise": _monthwise_rejection(rows, month_labels),
        "kpis": _compute_rejection_kpis(rows, start_date, end_date),
        "filterOptions": _filter_options_from_rows(rows),
    }


def build_rework_compare_payload(cursor, start_date, end_date, load_full_fy=True):
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_quality_inspection_rows(cursor, query_start, query_end)
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_quality_inspection_rows(cursor, prev_start, prev_end)
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    rows = [_row_to_dict(r) for r in raw_rows]
    month_labels = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "monthLabels": month_labels,
        "monthwise": _monthwise_rework(rows, month_labels),
        "kpis": _compute_rework_kpis(rows, start_date, end_date),
        "filterOptions": _filter_options_from_rows(rows),
    }
