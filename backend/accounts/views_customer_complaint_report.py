# ════════════════════════════════════════════
#  views_customer_complaint_report.py
#  Plant Performance — Customer Complaint dashboard
#  Source: CustCompMas, CustCompDet, CustComp_RouCauseDet, CustComp_RouCardDet
# ════════════════════════════════════════════

from datetime import datetime, date

from .views import find_first_table, find_first_column, table_exists
from .views_efficiency_report import (
    _efficiency_query_date_range,
    _month_labels_for_payload,
)

_MONTH_FULL = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def _complaint_month_label(dt_val):
    if dt_val is None:
        return "—"
    if hasattr(dt_val, "month") and hasattr(dt_val, "year"):
        mo, yr = dt_val.month, dt_val.year
    else:
        try:
            parsed = datetime.strptime(str(dt_val).strip()[:10], "%Y-%m-%d")
            mo, yr = parsed.month, parsed.year
        except Exception:
            return "—"
    return f"{_MONTH_FULL[mo - 1]} {yr}"


def _iso_date(dt_val):
    if dt_val is None:
        return ""
    if hasattr(dt_val, "isoformat"):
        return dt_val.isoformat()[:10]
    return str(dt_val).strip()[:10]


def _display_date(dt_val):
    iso = _iso_date(dt_val)
    if not iso:
        return "—"
    try:
        parsed = datetime.strptime(iso, "%Y-%m-%d")
        return f"{parsed.day:02d}-{_MONTH_FULL[parsed.month - 1]}-{parsed.year}"
    except Exception:
        return iso


def _dashboard_status(comp_status):
    st = str(comp_status or "").strip()
    if st.lower() == "closed":
        return "Resolved"
    if st.lower() == "open":
        return "Active"
    return "Pending"


def _build_complaint_customer_sql(cursor, cid_m, mas_alias="M"):
    """Join CustCompMas.CId to CustMast / CustAliasMast (varchar-safe) and resolve CName."""
    if not cid_m:
        return "", "CAST(N'—' AS NVARCHAR(512))"

    cid_expr = (
        f"LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL({mas_alias}.[{cid_m}], N''))))"
    )
    cm_join = ""
    customer_sql = "CAST(N'—' AS NVARCHAR(512))"

    tbl_cm = find_first_table(cursor, ["CustMast", "custmast", "CUSTMAST"])
    if not tbl_cm:
        return cm_join, customer_sql

    id_cm = find_first_column(cursor, tbl_cm, ["Id", "id", "ID", "CId", "cid", "CID", "CustId", "custid"])
    cname_cm = find_first_column(cursor, tbl_cm, ["CName", "cname", "CNAME", "CustName", "custname", "Name"])
    del_cm = find_first_column(cursor, tbl_cm, ["Deleted", "deleted", "IsDeleted"])
    if not id_cm or not cname_cm:
        return cm_join, customer_sql

    cm_del = f" AND ISNULL(CM.[{del_cm}], 0) = 0" if del_cm else ""
    cm_join = f"""
        LEFT JOIN [{tbl_cm}] CM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CM.[{id_cm}], N'')))) = {cid_expr}{cm_del}
    """
    customer_sql = f"LTRIM(RTRIM(CAST(CM.[{cname_cm}] AS NVARCHAR(512))))"

    if table_exists(cursor, "CustAliasMast"):
        tbl_am = find_first_table(cursor, ["CustAliasMast", "custaliasmast", "CUSTALIASMAST"])
        if tbl_am:
            id_am = find_first_column(cursor, tbl_am, ["Id", "id", "ID", "CId", "cid", "CID", "CustId", "custid"])
            cname_am = find_first_column(cursor, tbl_am, ["CName", "cname", "CNAME", "CustName", "custname", "Name"])
            del_am = find_first_column(cursor, tbl_am, ["Deleted", "deleted", "IsDeleted"])
            if id_am and cname_am:
                am_del = f" AND ISNULL(CAM.[{del_am}], 0) = 0" if del_am else ""
                cm_join += f"""
        LEFT JOIN [{tbl_am}] CAM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CAM.[{id_am}], N'')))) = {cid_expr}{am_del}
    """
                customer_sql = f"""LTRIM(RTRIM(ISNULL(
                    NULLIF(LTRIM(RTRIM(CAST(CM.[{cname_cm}] AS NVARCHAR(512)))), N''),
                    NULLIF(LTRIM(RTRIM(CAST(CAM.[{cname_am}] AS NVARCHAR(512)))), N'')
                )))"""

    return cm_join, customer_sql


def _age_days_to_today(cmp_date):
    iso = _iso_date(cmp_date)
    if not iso:
        return 0
    try:
        d = datetime.strptime(iso, "%Y-%m-%d").date()
        return max(0, (date.today() - d).days)
    except Exception:
        return 0


def _fetch_complaint_rows(cursor, query_start, query_end):
    tbl_m = find_first_table(cursor, ["CustCompMas", "custcompmas", "CUSTCOMPMAS"])
    if not tbl_m:
        return []

    cmpno_m = find_first_column(cursor, tbl_m, ["CmpNo", "cmpno", "CMPNO"])
    cid_m = find_first_column(cursor, tbl_m, ["CId", "cid", "CID", "CustId", "custid"])
    date_m = find_first_column(cursor, tbl_m, ["CmpDate", "cmpdate", "CMPDATE"])
    del_m = find_first_column(cursor, tbl_m, ["Deleted", "deleted", "IsDeleted"])
    part_m = find_first_column(cursor, tbl_m, ["partno", "PartNo", "PARTNO"])
    desc_m = find_first_column(cursor, tbl_m, ["description", "Description", "DESCRIPTION"])
    rejqty_m = find_first_column(cursor, tbl_m, ["rejqty", "RejQty", "REJQTY"])
    rwqty_m = find_first_column(cursor, tbl_m, ["rwqty", "ReworkQty", "RWQTY"])
    repeat_m = find_first_column(cursor, tbl_m, ["IsRepeatComp", "isrepeatcomp", "ISREPEATCOMP"])

    if not cmpno_m or not date_m:
        return []

    part_expr = f"LTRIM(RTRIM(CAST(M.[{part_m}] AS NVARCHAR(256))))" if part_m else "N''"
    desc_expr = f"LTRIM(RTRIM(CAST(M.[{desc_m}] AS NVARCHAR(512))))" if desc_m else "N''"
    product_expr = (
        f"CASE WHEN LEN({desc_expr}) > 0 THEN "
        f"CASE WHEN LEN({part_expr}) > 0 THEN {part_expr} + N' - ' + {desc_expr} ELSE {desc_expr} END "
        f"ELSE {part_expr} END"
    )
    rejqty_sql = f"CAST(ISNULL(M.[{rejqty_m}], 0) AS FLOAT)" if rejqty_m else "CAST(0 AS FLOAT)"
    rwqty_sql = f"CAST(ISNULL(M.[{rwqty_m}], 0) AS FLOAT)" if rwqty_m else "CAST(0 AS FLOAT)"
    repeat_sql = f"CAST(ISNULL(M.[{repeat_m}], 0) AS INT)" if repeat_m else "CAST(0 AS INT)"

    cm_join, customer_sql = _build_complaint_customer_sql(cursor, cid_m)
    customer_id_sql = (
        f"LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(M.[{cid_m}], N''))))"
        if cid_m else "CAST(N'' AS NVARCHAR(128))"
    )

    det_apply = """OUTER APPLY (
        SELECT
            CAST(NULL AS NVARCHAR(MAX)) AS ComplaintDescription,
            CAST(NULL AS NVARCHAR(MAX)) AS ActionTaken,
            CAST(NULL AS NVARCHAR(256)) AS EmpName,
            CAST(NULL AS NVARCHAR(64)) AS CompStatus,
            CAST(NULL AS NVARCHAR(MAX)) AS ActionRemarks,
            CAST(NULL AS DATETIME) AS OpnDt,
            CAST(NULL AS DATETIME) AS CloDt,
            CAST(NULL AS NVARCHAR(MAX)) AS rootcause
    ) AS Det"""

    tbl_d = find_first_table(cursor, ["CustCompDet", "custcompdet", "CUSTCOMPDET"])
    if tbl_d:
        cmpno_d = find_first_column(cursor, tbl_d, ["CmpNo", "cmpno", "CMPNO"])
        del_d = find_first_column(cursor, tbl_d, ["Deleted", "deleted", "IsDeleted"])
        desc_d = find_first_column(cursor, tbl_d, ["Description", "description", "DESCRIPTION"])
        action_d = find_first_column(cursor, tbl_d, ["ActionTaken", "actiontaken", "ACTIONTAKEN"])
        emp_d = find_first_column(cursor, tbl_d, ["EmpName", "empname", "EMPNAME"])
        status_d = find_first_column(cursor, tbl_d, ["CompStatus", "compstatus", "COMPSTATUS", "Status", "status"])
        remarks_d = find_first_column(cursor, tbl_d, ["Remarks", "remarks", "REMARKS"])
        opn_d = find_first_column(cursor, tbl_d, ["OpnDt", "opndt", "OPNDT"])
        clo_d = find_first_column(cursor, tbl_d, ["CloDt", "clodt", "CLODT"])
        root_d = find_first_column(cursor, tbl_d, ["rootcause", "RootCause", "ROOTCAUSE"])
        if cmpno_d:
            del_dx = f" AND ISNULL(D.[{del_d}], 0) = 0" if del_d else ""
            sel_desc = f"CAST(D.[{desc_d}] AS NVARCHAR(MAX))" if desc_d else "CAST(NULL AS NVARCHAR(MAX))"
            sel_action = f"CAST(D.[{action_d}] AS NVARCHAR(MAX))" if action_d else "CAST(NULL AS NVARCHAR(MAX))"
            sel_emp = f"CAST(D.[{emp_d}] AS NVARCHAR(256))" if emp_d else "CAST(NULL AS NVARCHAR(256))"
            sel_status = f"CAST(D.[{status_d}] AS NVARCHAR(64))" if status_d else "CAST(NULL AS NVARCHAR(64))"
            sel_remarks = f"CAST(D.[{remarks_d}] AS NVARCHAR(MAX))" if remarks_d else "CAST(NULL AS NVARCHAR(MAX))"
            sel_opn = f"D.[{opn_d}]" if opn_d else "CAST(NULL AS DATETIME)"
            sel_clo = f"D.[{clo_d}]" if clo_d else "CAST(NULL AS DATETIME)"
            sel_root = f"CAST(D.[{root_d}] AS NVARCHAR(MAX))" if root_d else "CAST(NULL AS NVARCHAR(MAX))"
            order_sql = f"D.[{opn_d}] DESC" if opn_d else f"D.[{cmpno_d}] DESC"
            det_apply = f"""OUTER APPLY (
                SELECT TOP 1
                    {sel_desc} AS ComplaintDescription,
                    {sel_action} AS ActionTaken,
                    {sel_emp} AS EmpName,
                    {sel_status} AS CompStatus,
                    {sel_remarks} AS ActionRemarks,
                    {sel_opn} AS OpnDt,
                    {sel_clo} AS CloDt,
                    {sel_root} AS rootcause
                FROM [{tbl_d}] D
                WHERE D.[{cmpno_d}] = M.[{cmpno_m}]{del_dx}
                ORDER BY {order_sql}
            ) AS Det"""

    rc_join = ""
    cnt1_sql = "CAST(NULL AS NVARCHAR(MAX))"
    cnt2_sql = "CAST(NULL AS NVARCHAR(MAX))"
    rc_root_sql = "Det.rootcause"
    tbl_rc = find_first_table(cursor, ["CustComp_RouCauseDet", "custcomp_roucausedet", "CUSTCOMP_ROUCAUSEDET"])
    if tbl_rc:
        cmpno_rc = find_first_column(cursor, tbl_rc, ["CmpNo", "cmpno", "CMPNO"])
        del_rc = find_first_column(cursor, tbl_rc, ["deleted", "Deleted", "IsDeleted"])
        root_rc = find_first_column(cursor, tbl_rc, ["rootcause", "RootCause", "ROOTCAUSE", "Root_Cause", "Cause"])
        cnt1_rc = find_first_column(cursor, tbl_rc, ["cntmeas1", "CntMeas1", "CNTMEAS1", "CounterMeasure1"])
        cnt2_rc = find_first_column(cursor, tbl_rc, ["cntmeas2", "CntMeas2", "CNTMEAS2", "CounterMeasure2"])
        if cmpno_rc:
            del_rc_sql = f" AND ISNULL(RC.[{del_rc}], 0) = 0" if del_rc else ""
            rc_join = f"""
            LEFT JOIN [{tbl_rc}] RC
                ON RC.[{cmpno_rc}] = M.[{cmpno_m}]{del_rc_sql}
            """
            if root_rc:
                rc_root_sql = f"COALESCE(CAST(RC.[{root_rc}] AS NVARCHAR(MAX)), Det.rootcause)"
            if cnt1_rc:
                cnt1_sql = f"CAST(RC.[{cnt1_rc}] AS NVARCHAR(MAX))"
            if cnt2_rc:
                cnt2_sql = f"CAST(RC.[{cnt2_rc}] AS NVARCHAR(MAX))"

    rd_join = ""
    roucard_sql = "CAST(NULL AS NVARCHAR(128))"
    tbl_rd = find_first_table(cursor, ["CustComp_RouCardDet", "custcomp_roucarddet", "CUSTCOMP_ROUCARDDET"])
    if tbl_rd:
        cmpno_rd = find_first_column(cursor, tbl_rd, ["CmpNo", "cmpno", "CMPNO"])
        del_rd = find_first_column(cursor, tbl_rd, ["deleted", "Deleted", "IsDeleted"])
        roucard_rd = find_first_column(cursor, tbl_rd, ["roucardno", "RouCardNo", "ROUCARDNO", "RouteCardNo"])
        if cmpno_rd and roucard_rd:
            del_rd_sql = f" AND ISNULL(RD.[{del_rd}], 0) = 0" if del_rd else ""
            rd_join = f"""
            LEFT JOIN [{tbl_rd}] RD
                ON RD.[{cmpno_rd}] = M.[{cmpno_m}]{del_rd_sql}
            """
            roucard_sql = f"CAST(RD.[{roucard_rd}] AS NVARCHAR(128))"

    mas_where = f"CAST(M.[{date_m}] AS DATE) BETWEEN ? AND ?"
    params = [query_start, query_end]
    if del_m:
        mas_where += f" AND ISNULL(M.[{del_m}], 0) = 0"

    def mas_col(candidates, cast="NVARCHAR(256)", default="NULL"):
        found = find_first_column(cursor, tbl_m, candidates)
        if found:
            return f"CAST(M.[{found}] AS {cast})"
        return f"CAST({default} AS {cast})"

    sql = f"""
        SELECT
            LTRIM(RTRIM(CAST(M.[{cmpno_m}] AS NVARCHAR(64)))) AS ComplaintID,
            M.[{date_m}] AS ComplaintDate,
            {customer_id_sql} AS CustomerID,
            {customer_sql} AS CustomerName,
            {mas_col(['Cmpby', 'cmpby', 'CMPBY'])} AS ComplaintBy,
            {part_expr} AS PartNo,
            {product_expr} AS ProductDescription,
            {mas_col(['pono', 'PONo', 'PONO'])} AS PONo,
            {mas_col(['invno', 'InvNo', 'INVNO'])} AS InvNo,
            {mas_col(['process', 'Process', 'PROCESS'])} AS ProcessLine,
            {mas_col(['rejtype', 'RejType', 'REJTYPE'])} AS RejType,
            {mas_col(['rejdet', 'RejDet', 'REJDET'], 'NVARCHAR(MAX)')} AS RejDet,
            {mas_col(['oprname', 'OprName', 'OPRNAME'])} AS OperatorName,
            {mas_col(['macno', 'MacNo', 'MACNO'])} AS MacNo,
            {rejqty_sql} AS RejQty,
            {rwqty_sql} AS ReworkQty,
            {mas_col(['targetdt', 'TargetDt', 'TARGETDT'], 'DATETIME')} AS TargetDt,
            {mas_col(['coraction', 'CorAction', 'CORACTION'], 'NVARCHAR(MAX)')} AS CorrectiveAction,
            {mas_col(['peraction', 'PerAction', 'PERACTION'], 'NVARCHAR(MAX)')} AS PermanentAction,
            {repeat_sql} AS IsRepeatComp,
            Det.ComplaintDescription,
            Det.ActionTaken,
            Det.EmpName,
            Det.CompStatus,
            Det.ActionRemarks,
            Det.OpnDt,
            Det.CloDt,
            DATEDIFF(DAY, Det.OpnDt, ISNULL(Det.CloDt, GETDATE())) AS ResolutionDays,
            {rc_root_sql} AS RootCause,
            {cnt1_sql} AS CounterMeasure1,
            {cnt2_sql} AS CounterMeasure2,
            {roucard_sql} AS RouteCardNo
        FROM [{tbl_m}] M
        {det_apply}
        {rc_join}
        {rd_join}
        {cm_join}
        WHERE {mas_where}
        ORDER BY M.[{date_m}] DESC, M.[{cmpno_m}] DESC
    """

    cursor.execute(sql, params)
    raw = cursor.fetchall() or []
    columns = [d[0] for d in cursor.description]

    rows = []
    seen = set()
    for tup in raw:
        rec = dict(zip(columns, tup))
        cid = str(rec.get("ComplaintID") or "").strip()
        if cid and cid in seen:
            continue
        if cid:
            seen.add(cid)
        cmp_date = rec.get("ComplaintDate")
        status = str(rec.get("CompStatus") or "").strip() or "—"
        rows.append({
            "complaintId": cid or "—",
            "date": _iso_date(cmp_date),
            "complaintDateDisplay": _display_date(cmp_date),
            "month": _complaint_month_label(cmp_date),
            "customerId": (str(rec.get("CustomerID") or "").strip() or "—"),
            "customer": (str(rec.get("CustomerName") or "").strip() or "—"),
            "complaintBy": (str(rec.get("ComplaintBy") or "").strip() or "—"),
            "partNo": (str(rec.get("PartNo") or "").strip() or "—"),
            "product": (str(rec.get("ProductDescription") or rec.get("PartNo") or "").strip() or "—"),
            "pono": (str(rec.get("PONo") or "").strip() or "—"),
            "invno": (str(rec.get("InvNo") or "").strip() or "—"),
            "process": (str(rec.get("ProcessLine") or "").strip() or "—"),
            "rejType": (str(rec.get("RejType") or "").strip() or "—"),
            "rejDet": (str(rec.get("RejDet") or "").strip() or "—"),
            "operatorName": (str(rec.get("OperatorName") or "").strip() or "—"),
            "macNo": (str(rec.get("MacNo") or "").strip() or "—"),
            "rejQty": float(rec.get("RejQty") or 0),
            "reworkQty": float(rec.get("ReworkQty") or 0),
            "targetDate": _iso_date(rec.get("TargetDt")),
            "complaintDescription": (str(rec.get("ComplaintDescription") or "").strip() or "—"),
            "actionTaken": (str(rec.get("ActionTaken") or "").strip() or "—"),
            "empName": (str(rec.get("EmpName") or "").strip() or "—"),
            "status": status,
            "dashboardStatus": _dashboard_status(status),
            "actionRemarks": (str(rec.get("ActionRemarks") or "").strip() or "—"),
            "opnDt": _iso_date(rec.get("OpnDt")),
            "cloDt": _iso_date(rec.get("CloDt")),
            "resolutionDays": int(rec.get("ResolutionDays") or 0) if rec.get("ResolutionDays") is not None else None,
            "ageDays": _age_days_to_today(cmp_date),
            "rootCause": (str(rec.get("RootCause") or "").strip() or "—"),
            "counterMeasure1": (str(rec.get("CounterMeasure1") or "").strip() or "—"),
            "counterMeasure2": (str(rec.get("CounterMeasure2") or "").strip() or "—"),
            "routeCardNo": (str(rec.get("RouteCardNo") or "").strip() or "—"),
            "correctiveAction": (str(rec.get("CorrectiveAction") or "").strip() or "—"),
            "permanentAction": (str(rec.get("PermanentAction") or "").strip() or "—"),
            "isRepeatComp": bool(int(rec.get("IsRepeatComp") or 0)),
        })
    return rows


def _compute_complaint_kpis(rows):
    if not rows:
        return {
            "activeComplaints": 0,
            "resolvedComplaints": 0,
            "avgResolutionDays": 0.0,
            "satisfactionPct": 0.0,
            "repeatComplaints": 0,
            "rowCount": 0,
        }

    active = sum(1 for r in rows if str(r.get("status") or "").lower() == "open")
    resolved = sum(1 for r in rows if str(r.get("status") or "").lower() == "closed")
    repeat = sum(1 for r in rows if r.get("isRepeatComp"))

    res_days = [
        float(r["resolutionDays"])
        for r in rows
        if r.get("resolutionDays") is not None and str(r.get("status") or "").lower() == "closed"
    ]
    avg_res = round(sum(res_days) / len(res_days), 1) if res_days else 0.0

    with_status = [r for r in rows if str(r.get("status") or "").strip()]
    satisfaction = round((resolved / len(with_status)) * 100, 1) if with_status else 0.0

    return {
        "activeComplaints": active,
        "resolvedComplaints": resolved,
        "avgResolutionDays": avg_res,
        "satisfactionPct": satisfaction,
        "repeatComplaints": repeat,
        "rowCount": len(rows),
    }


def _monthwise_complaints(rows, month_labels):
    received, open_counts, closed_counts = [], [], []
    for mo in month_labels:
        month_rows = [r for r in rows if r.get("month") == mo]
        received.append(len(month_rows))
        open_counts.append(sum(1 for r in month_rows if str(r.get("status") or "").lower() == "open"))
        closed_counts.append(sum(1 for r in month_rows if str(r.get("status") or "").lower() == "closed"))
    return {
        "labels": month_labels,
        "received": received,
        "open": open_counts,
        "closed": closed_counts,
    }


def _filter_options_from_rows(rows):
    customers = sorted({r.get("customer") for r in rows if r.get("customer") and r["customer"] != "—"})
    statuses = sorted({r.get("status") for r in rows if r.get("status") and r["status"] != "—"})
    if not statuses:
        statuses = ["Open", "Closed"]
    return {"customers": customers, "statuses": statuses}


def _pending_actions(rows):
    pending = []
    for r in rows:
        if str(r.get("status") or "").lower() != "open":
            continue
        pending.append({
            "complaintId": r.get("complaintId"),
            "customer": r.get("customer"),
            "product": r.get("product"),
            "ageDays": r.get("ageDays"),
            "actionTaken": r.get("actionTaken"),
            "targetDate": r.get("targetDate"),
        })
    return pending


def build_customer_complaint_compare_payload(cursor, start_date, end_date, load_full_fy=True):
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    rows = _fetch_complaint_rows(cursor, query_start, query_end)
    if not rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        rows = _fetch_complaint_rows(cursor, prev_start, prev_end)
        if rows:
            query_start, query_end = prev_start, prev_end

    month_labels_raw = _month_labels_for_payload(rows, start_date, end_date, query_start, query_end)
    month_labels = []
    for lbl in month_labels_raw:
        if "-" in lbl and len(lbl.split("-")) == 2:
            abbr, yy = lbl.split("-", 1)
            try:
                yr = 2000 + int(yy)
                idx = _MONTH_FULL.index(abbr) + 1 if abbr in _MONTH_FULL else None
                if idx:
                    month_labels.append(f"{abbr} {yr}")
                    continue
            except Exception:
                pass
        month_labels.append(lbl)

    for r in rows:
        if r.get("date"):
            r["month"] = _complaint_month_label(r["date"])

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "monthLabels": month_labels,
        "monthwise": _monthwise_complaints(rows, month_labels),
        "kpis": _compute_complaint_kpis(rows),
        "filterOptions": _filter_options_from_rows(rows),
        "pendingActions": _pending_actions(rows),
    }
