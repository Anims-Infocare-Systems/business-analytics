# ════════════════════════════════════════════
#  views_capa_report.py
#  Plant Performance — Quality Action Plan (CAPA)
#  Source: CustCompMas, CustCompDet, CustComp_RouCauseDet, CustComp_RouCardDet
# ════════════════════════════════════════════

from datetime import date

from .views import find_first_table, find_first_column
from .views_customer_complaint_report import _fetch_complaint_rows
from .views_efficiency_report import _efficiency_query_date_range


def _capa_status(raw_status):
    st = str(raw_status or "").strip()
    if st.lower() == "closed":
        return "Closed"
    if st.lower() == "open":
        return "Open"
    return st or "Open"


def _split_part_description(part_no, product):
    part = (str(part_no or "").strip() or "—")
    prod = (str(product or "").strip() or "")
    desc = prod
    if prod and part != "—" and prod.startswith(part):
        remainder = prod[len(part):].lstrip(" -").strip()
        if remainder:
            desc = remainder
    elif " - " in prod:
        left, right = prod.split(" - ", 1)
        if not part or part == "—":
            part = left.strip() or part
        desc = right.strip() or prod
    return part, desc or "—"


def _fetch_rca_map(cursor, complaint_ids):
    """Load Why-Why / root-cause fields from CustComp_RouCauseDet keyed by CmpNo."""
    if not complaint_ids:
        return {}

    tbl_rc = find_first_table(cursor, ["CustComp_RouCauseDet", "custcomp_roucausedet", "CUSTCOMP_ROUCAUSEDET"])
    if not tbl_rc:
        return {}

    cmpno_rc = find_first_column(cursor, tbl_rc, ["CmpNo", "cmpno", "CMPNO"])
    del_rc = find_first_column(cursor, tbl_rc, ["deleted", "Deleted", "IsDeleted"])
    if not cmpno_rc:
        return {}

    why_cols = {}
    for i in range(1, 6):
        col = find_first_column(
            cursor,
            tbl_rc,
            [
                f"why{i}",
                f"Why{i}",
                f"WHY{i}",
                f"rcwhy{i}",
                f"RcWhy{i}",
                f"RCWhy{i}",
            ],
        )
        if col:
            why_cols[i] = col

    root_col = find_first_column(
        cursor,
        tbl_rc,
        ["rootcause", "RootCause", "ROOTCAUSE", "Root_Cause", "Cause"],
    )
    cnt1_col = find_first_column(
        cursor, tbl_rc, ["cntmeas1", "CntMeas1", "CNTMEAS1", "CounterMeasure1"]
    )
    cnt2_col = find_first_column(
        cursor, tbl_rc, ["cntmeas2", "CntMeas2", "CNTMEAS2", "CounterMeasure2"]
    )

    select_parts = [f"LTRIM(RTRIM(CAST(RC.[{cmpno_rc}] AS NVARCHAR(64)))) AS CmpNo"]
    if root_col:
        select_parts.append(f"CAST(RC.[{root_col}] AS NVARCHAR(MAX)) AS RootCause")
    for i, col in why_cols.items():
        select_parts.append(f"CAST(RC.[{col}] AS NVARCHAR(MAX)) AS Why{i}")
    if cnt1_col:
        select_parts.append(f"CAST(RC.[{cnt1_col}] AS NVARCHAR(MAX)) AS CntMeas1")
    if cnt2_col:
        select_parts.append(f"CAST(RC.[{cnt2_col}] AS NVARCHAR(MAX)) AS CntMeas2")

    del_sql = f" AND ISNULL(RC.[{del_rc}], 0) = 0" if del_rc else ""
    placeholders = ",".join("?" for _ in complaint_ids)
    sql = f"""
        SELECT {", ".join(select_parts)}
        FROM [{tbl_rc}] RC
        WHERE LTRIM(RTRIM(CAST(RC.[{cmpno_rc}] AS NVARCHAR(64)))) IN ({placeholders}){del_sql}
    """

    cursor.execute(sql, list(complaint_ids))
    columns = [d[0] for d in cursor.description]
    out = {}
    for row in cursor.fetchall() or []:
        rec = dict(zip(columns, row))
        key = str(rec.get("CmpNo") or "").strip()
        if not key or key in out:
            continue
        entry = {}
        if rec.get("RootCause") is not None:
            entry["rootCause"] = str(rec.get("RootCause") or "").strip()
        for i in why_cols:
            val = rec.get(f"Why{i}")
            if val is not None and str(val).strip():
                entry[f"rcWhy{i}"] = str(val).strip()
        if rec.get("CntMeas1") is not None:
            entry["counterMeasure1"] = str(rec.get("CntMeas1") or "").strip()
        if rec.get("CntMeas2") is not None:
            entry["counterMeasure2"] = str(rec.get("CntMeas2") or "").strip()
        out[key] = entry
    return out


def _complaint_to_capa_row(src, rca=None):
    rca = rca or {}
    part_no, description = _split_part_description(src.get("partNo"), src.get("product"))
    status = _capa_status(src.get("status"))
    compl_no = src.get("complaintId") or "—"
    compl_date = src.get("date") or ""
    open_date = src.get("opnDt") or compl_date
    closed_date = src.get("cloDt") or ""

    row = {
        "complNo": compl_no,
        "complDate": compl_date,
        "complOpenDate": open_date,
        "customer": src.get("customer") or "—",
        "partNo": part_no,
        "description": description,
        "complDescription": src.get("complaintDescription") or "—",
        "qcIncharge": src.get("empName") or "—",
        "correctiveAction": src.get("correctiveAction") or "—",
        "permanentAction": src.get("permanentAction") or "—",
        "actionTaken": src.get("actionTaken") or "Pending",
        "status": status,
        "closedDate": closed_date,
        "ageDays": int(src.get("ageDays") or 0),
        "remarks": src.get("actionRemarks") or "—",
        "repeatedComplaint": "YES" if src.get("isRepeatComp") else "NO",
        "routeCardNo": src.get("routeCardNo") or "—",
        "rootCause": src.get("rootCause") or rca.get("rootCause") or "—",
        "counterMeasure1": src.get("counterMeasure1") or rca.get("counterMeasure1") or "—",
        "counterMeasure2": src.get("counterMeasure2") or rca.get("counterMeasure2") or "—",
        "rcWhy1": rca.get("rcWhy1") or (src.get("rootCause") if src.get("rootCause") not in (None, "", "—") else ""),
        "rcWhy2": rca.get("rcWhy2", ""),
        "rcWhy3": rca.get("rcWhy3", ""),
        "rcWhy4": rca.get("rcWhy4", ""),
        "rcWhy5": rca.get("rcWhy5", ""),
    }
    return row


def _compute_capa_kpis(rows):
    if not rows:
        return {
            "totalComplaints": 0,
            "openCapa": 0,
            "closedCapa": 0,
            "avgResolutionAge": 0,
            "rowCount": 0,
        }

    open_count = sum(1 for r in rows if str(r.get("status") or "").lower() == "open")
    closed_count = sum(1 for r in rows if str(r.get("status") or "").lower() == "closed")
    ages = [int(r.get("ageDays") or 0) for r in rows]
    avg_age = round(sum(ages) / len(ages)) if ages else 0

    return {
        "totalComplaints": len(rows),
        "openCapa": open_count,
        "closedCapa": closed_count,
        "avgResolutionAge": avg_age,
        "rowCount": len(rows),
    }


def _filter_options_from_rows(rows):
    customers = sorted({r.get("customer") for r in rows if r.get("customer") and r["customer"] != "—"})
    statuses = sorted({r.get("status") for r in rows if r.get("status")})
    if not statuses:
        statuses = ["Open", "Closed"]
    return {"customers": customers, "statuses": statuses}


def build_capa_compare_payload(cursor, start_date, end_date, load_full_fy=True):
    from .views import current_financial_year

    if load_full_fy:
        query_start, query_end = _efficiency_query_date_range(True, start_date, end_date)
    else:
        query_start, query_end = start_date, end_date

    raw_rows = _fetch_complaint_rows(cursor, query_start, query_end)
    if not raw_rows and load_full_fy:
        fy_start, _fy_end = current_financial_year()
        prev_start = date(fy_start.year - 1, 4, 1)
        prev_end = date(fy_start.year, 3, 31)
        raw_rows = _fetch_complaint_rows(cursor, prev_start, prev_end)
        if raw_rows:
            query_start, query_end = prev_start, prev_end

    cmp_ids = [
        str(r.get("complaintId") or "").strip()
        for r in raw_rows
        if r.get("complaintId") and r.get("complaintId") != "—"
    ]
    rca_map = _fetch_rca_map(cursor, cmp_ids)

    rows = []
    for src in raw_rows:
        cid = str(src.get("complaintId") or "").strip()
        rows.append(_complaint_to_capa_row(src, rca_map.get(cid, {})))

    kpis = _compute_capa_kpis(rows)

    return {
        "from": str(start_date),
        "to": str(end_date),
        "queryFrom": str(query_start),
        "queryTo": str(query_end),
        "rows": rows,
        "kpis": kpis,
        "filterOptions": _filter_options_from_rows(rows),
        "statusSummary": {
            "open": kpis["openCapa"],
            "closed": kpis["closedCapa"],
        },
    }
