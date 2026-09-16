"""
Quality Timeline / End-to-End Traceability Services & Query Engine.

Traceability Flow:
  INVOICE (Bill_Mas, Bill_Det)
    ↓
  DC (Bill_DcOrdDet, DC_Det, DC_Mas)
    ↓
  ROUTE CARD (Dc_RouCardDet -> RouCardNo)
    ↓
  INSPECTION (FinalInspRouteCard, InterInspEntryRouteCard)
  & PRODUCTION (CncProd_TouchRouteCardDet -> ProductionEntry,
                ConvProdEntryRouteCard, ConvProdEntryRodRouteCard,
                JobIncomeDetRouteCard -> Job_mas/InJob_Mas, RouteCardStock)
    ↓
  GRN TRACKING (RouCard_RmGrnDet -> grn_mas, grn_det, inspmas, inspdet)
    ↓
  SUPPLIER & MILL (grninsubdet -> POMas, PODet, CustMast)
"""

from datetime import datetime, date
from typing import Dict, List, Any, Optional, Tuple


def _safe_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _format_date(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        # Default placeholder dates like 1900-01-01 or 1800-01-01 in SQL Server
        if val.year <= 1900:
            return None
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    return s if s else None


def _format_in_clause(cursor, query_template: str, items: List[Any]) -> Tuple[str, List[Any]]:
    """Helper to dynamically generate parameterized IN (?, ?, ...) clause."""
    clean_items = list(dict.fromkeys(item for item in items if item is not None and str(item).strip() != ""))
    if not clean_items:
        return "", []
    placeholders = ", ".join(["?"] * len(clean_items))
    return query_template.replace("%IN%", placeholders), clean_items


# =============================================================================
# 1. INVOICE LIST & SEARCH
# =============================================================================

def get_invoice_list(conn, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve list of recent invoices with customer name, parts count, and total value."""
    query = """
    SELECT TOP (?)
        B.invno,
        B.invdt,
        COALESCE(C.CName, CA.CName, N'') AS customer_name,
        ISNULL(B.namt, 0) AS invoice_value,
        ISNULL(D.parts_count, 0) AS parts_count
    FROM Bill_Mas B
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
    OUTER APPLY (
        SELECT COUNT(DISTINCT BD.itcode) AS parts_count
        FROM Bill_Det BD
        WHERE BD.invno = B.invno AND ISNULL(BD.deleted, 0) = 0
    ) D
    WHERE ISNULL(B.deleted, 0) = 0
    ORDER BY B.invdt DESC, B.invno DESC
    """
    cursor = conn.cursor()
    cursor.execute(query, (limit,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "invoice_no": _safe_str(r[0]),
            "invoice_date": _format_date(r[1]),
            "customer_name": _safe_str(r[2]),
            "invoice_value": _safe_float(r[3]),
            "parts_count": int(r[4] or 0),
        })
    return results


def search_invoices(conn, search_q: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Search invoices across:
    - Invoice No
    - Part No
    - Customer Name
    - DC No
    - Route Card No
    - GRN No
    - Supplier Name
    SQL-safe & fully parameterized.
    """
    term = f"%{search_q.strip()}%"
    query = """
    ;WITH MATCHED_INV AS (
        -- Direct match on Invoice No or Customer Name
        SELECT TOP (?) B.invno
        FROM Bill_Mas B
        LEFT JOIN CustMast C ON LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N'')))) AND ISNULL(C.Deleted, 0) = 0
        LEFT JOIN CustAliasMast CA ON LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N'')))) AND ISNULL(CA.Deleted, 0) = 0
        WHERE ISNULL(B.deleted, 0) = 0
          AND (B.invno LIKE ? OR COALESCE(C.CName, CA.CName, N'') LIKE ?)

        UNION

        -- Match on Part No or Part Description
        SELECT TOP (?) BD.invno
        FROM Bill_Det BD
        WHERE ISNULL(BD.deleted, 0) = 0
          AND (BD.itcode LIKE ? OR BD.itdesc LIKE ?)

        UNION

        -- Match on Delivery Challan (DC)
        SELECT TOP (?) BDO.invno
        FROM Bill_DcOrdDet BDO
        WHERE ISNULL(BDO.deleted, 0) = 0
          AND BDO.dcno LIKE ?

        UNION

        -- Match on Route Card
        SELECT TOP (?) BDO.invno
        FROM Bill_DcOrdDet BDO
        INNER JOIN Dc_RouCardDet RCD ON BDO.dcno = RCD.dcno AND ISNULL(RCD.deleted, 0) = 0
        WHERE ISNULL(BDO.deleted, 0) = 0
          AND RCD.RouCardNo LIKE ?

        UNION

        -- Match on GRN or Supplier
        SELECT TOP (?) BDO.invno
        FROM Bill_DcOrdDet BDO
        INNER JOIN Dc_RouCardDet RCD ON BDO.dcno = RCD.dcno AND ISNULL(RCD.deleted, 0) = 0
        INNER JOIN RouCard_RmGrnDet RG ON RCD.RouCardNo = RG.roucardno AND ISNULL(RG.deleted, 0) = 0
        LEFT JOIN grn_mas GM ON RG.grnno = GM.grnno AND ISNULL(GM.deleted, 0) = 0
        LEFT JOIN CustMast SupM ON GM.cid = SupM.Id AND ISNULL(SupM.Deleted, 0) = 0
        WHERE ISNULL(BDO.deleted, 0) = 0
          AND (RG.grnno LIKE ? OR SupM.CName LIKE ?)
    )
    SELECT TOP (?)
        B.invno,
        B.invdt,
        COALESCE(C.CName, CA.CName, N'') AS customer_name,
        ISNULL(B.namt, 0) AS invoice_value,
        ISNULL(D.parts_count, 0) AS parts_count
    FROM MATCHED_INV M
    INNER JOIN Bill_Mas B ON M.invno = B.invno AND ISNULL(B.deleted, 0) = 0
    LEFT JOIN CustMast C ON LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N'')))) AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N'')))) AND ISNULL(CA.Deleted, 0) = 0
    OUTER APPLY (
        SELECT COUNT(DISTINCT BD.itcode) AS parts_count
        FROM Bill_Det BD
        WHERE BD.invno = B.invno AND ISNULL(BD.deleted, 0) = 0
    ) D
    ORDER BY B.invdt DESC, B.invno DESC
    """
    cursor = conn.cursor()
    cursor.execute(query, (limit, term, term, limit, term, term, limit, term, limit, term, limit, term, term, limit))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "invoice_no": _safe_str(r[0]),
            "invoice_date": _format_date(r[1]),
            "customer_name": _safe_str(r[2]),
            "invoice_value": _safe_float(r[3]),
            "parts_count": int(r[4] or 0),
        })
    return results


# =============================================================================
# 2. STAGE 1 - INVOICE DETAILS
# =============================================================================

def get_invoice_details(conn, invoice_no: str) -> Optional[Dict[str, Any]]:
    """
    Stage 1: Invoice Header and Line Details from Bill_Mas and Bill_Det.
    """
    cursor = conn.cursor()

    # 1. Invoice Header
    header_query = """
    SELECT
        B.invno,
        B.invdt,
        B.cid,
        COALESCE(C.CName, CA.CName, N'') AS customer_name,
        ISNULL(B.tamt, 0) AS taxable_subtotal,
        ISNULL(B.txamt, 0) AS gst,
        ISNULL(B.namt, 0) AS total_net_payable,
        B.prnpono,
        B.Transport,
        B.VehicleNo,
        B.einvirnno,
        B.einvqrcode,
        B.eWayPdfDowLoadPath,
        B.einvPdfDowLoadPath
    FROM Bill_Mas B
    LEFT JOIN CustMast C ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(C.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(C.Deleted, 0) = 0
    LEFT JOIN CustAliasMast CA ON
        LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CA.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(B.cid, N''))))
        AND ISNULL(CA.Deleted, 0) = 0
    WHERE B.invno = ? AND ISNULL(B.deleted, 0) = 0
    """
    cursor.execute(header_query, (invoice_no,))
    h_row = cursor.fetchone()
    if not h_row:
        return None

    # PO and Order details from Bill_DcOrdDet
    po_query = """
    SELECT TOP 1 ordno, orddt
    FROM Bill_DcOrdDet
    WHERE invno = ? AND ISNULL(deleted, 0) = 0 AND ordno IS NOT NULL AND LTRIM(RTRIM(ordno)) <> N''
    ORDER BY orddt DESC
    """
    cursor.execute(po_query, (invoice_no,))
    po_row = cursor.fetchone()
    customer_po_ref = _safe_str(po_row[0]) if po_row else ""
    po_order_date = _format_date(po_row[1]) if po_row else None

    # Fallback to Bill_Mas.prnpono if ordno is empty
    if not customer_po_ref and h_row[7]:
        customer_po_ref = _safe_str(h_row[7])

    # 2. Line Items from Bill_Det
    det_query = """
    SELECT
        BD.itcode AS part_no,
        BD.itdesc AS description,
        ISNULL(BD.qty, 0) AS billed_qty,
        BD.uom,
        ISNULL(BD.rate, 0) AS unit_rate,
        ISNULL(BD.amt, 0) AS amount,
        PD.process AS process_name,
        BD.process AS process_code,
        BD.RowNo
    FROM Bill_Det BD
    LEFT JOIN ProcessDet PD ON BD.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
    WHERE BD.invno = ? AND ISNULL(BD.deleted, 0) = 0
    ORDER BY BD.RowNo ASC, BD.itcode ASC
    """
    cursor.execute(det_query, (invoice_no,))
    lines = cursor.fetchall()

    records = []
    tot_billed_qty = 0.0
    first_part = ""
    first_desc = ""
    first_uom = "Nos"
    first_rate = 0.0

    for idx, l in enumerate(lines):
        p_no = _safe_str(l[0])
        desc = _safe_str(l[1])
        b_qty = _safe_float(l[2])
        uom_str = _safe_str(l[3]) or "Nos"
        u_rate = _safe_float(l[4])
        amt = _safe_float(l[5])
        p_name = _safe_str(l[6])
        p_code = _safe_str(l[7])

        if idx == 0:
            first_part = p_no
            first_desc = desc
            first_uom = uom_str
            first_rate = u_rate

        tot_billed_qty += b_qty
        records.append({
            "part_no": p_no,
            "description": desc,
            "billed_qty": b_qty,
            "uom": uom_str,
            "unit_rate": u_rate,
            "amount": amt,
            "process_code": p_code,
            "process_name": p_name,
        })

    irn_qr = _safe_str(h_row[10]) or _safe_str(h_row[11]) or None

    return {
        "invoice_no": _safe_str(h_row[0]),
        "invoice_date": _format_date(h_row[1]),
        "customer_name": _safe_str(h_row[3]),
        "part_no": first_part,
        "description": first_desc,
        "billed_qty": tot_billed_qty,
        "uom": first_uom,
        "unit_rate": first_rate,
        "amount": _safe_float(h_row[4]),
        "gst": _safe_float(h_row[5]),
        "total_net_payable": _safe_float(h_row[6]),
        "customer_po_ref": customer_po_ref,
        "po_order_date": po_order_date,
        "irn_qr_code": irn_qr,
        "vehicle_no": _safe_str(h_row[9]),
        "transporter_name": _safe_str(h_row[8]),
        "records": records,
    }


# =============================================================================
# 3. STAGE 2 - DELIVERY CHALLAN (DC) DETAILS
# =============================================================================

def get_dc_details(conn, invoice_no: str) -> Dict[str, Any]:
    """
    Stage 2: Delivery Challan (DC) Details
    Links: Bill_DcOrdDet.invno -> Bill_DcOrdDet.dcno -> DC_Det, DC_Mas, Dc_RouCardDet
    """
    cursor = conn.cursor()

    query_dc = """
    SELECT DISTINCT
        BDO.dcno,
        COALESCE(DM.dcdate, BDO.dcdt) AS dcdate,
        DD.partno,
        DD.description,
        ISNULL(DD.okqty, 0) AS qty,
        DD.uom,
        DD.process AS process_code,
        PD.process AS process_name,
        DM.transport,
        COALESCE(BM.VehicleNo, N'') AS vehicle_no,
        DM.eWayPdfDowLoadPath,
        BDO.ordno
    FROM Bill_DcOrdDet BDO
    INNER JOIN DC_Det DD ON BDO.dcno = DD.dcno AND ISNULL(DD.deleted, 0) = 0
    LEFT JOIN DC_Mas DM ON DD.dcno = DM.dcno AND ISNULL(DM.deleted, 0) = 0
    LEFT JOIN Bill_Mas BM ON BDO.invno = BM.invno AND ISNULL(BM.deleted, 0) = 0
    LEFT JOIN ProcessDet PD ON DD.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
    WHERE BDO.invno = ? AND ISNULL(BDO.deleted, 0) = 0
    ORDER BY BDO.dcno ASC, DD.partno ASC
    """
    cursor.execute(query_dc, (invoice_no,))
    dc_rows = cursor.fetchall()

    if not dc_rows:
        return {
            "dc_no": None,
            "dc_date": None,
            "dispatched_qty": 0.0,
            "uom": "Nos",
            "vehicle_no": None,
            "transporter_name": None,
            "eway_bill_no": None,
            "grn_po_reference": None,
            "records": [],
            "all_dc_numbers": [],
            "all_route_cards": [],
        }

    all_dc_nos = list(dict.fromkeys(_safe_str(r[0]) for r in dc_rows if _safe_str(r[0])))

    # Fetch route cards for these DC numbers
    rc_by_dc_part = {}
    all_route_cards = []
    if all_dc_nos:
        rc_sql, rc_params = _format_in_clause(
            cursor,
            """
            SELECT DISTINCT
                RCD.dcno,
                RCD.PartNo,
                RCD.RouCardNo,
                ISNULL(RCD.qty, 0) AS qty
            FROM Dc_RouCardDet RCD
            WHERE RCD.dcno IN (%IN%) AND ISNULL(RCD.deleted, 0) = 0
            ORDER BY RCD.dcno, RCD.RouCardNo
            """,
            all_dc_nos
        )
        if rc_sql:
            cursor.execute(rc_sql, rc_params)
            for r_rc in cursor.fetchall():
                dc_key = _safe_str(r_rc[0])
                part_key = _safe_str(r_rc[1])
                rc_no = _safe_str(r_rc[2])
                all_route_cards.append(rc_no)
                rc_by_dc_part.setdefault((dc_key, part_key), []).append({
                    "route_card_no": rc_no,
                    "qty": _safe_float(r_rc[3])
                })

    all_route_cards = list(dict.fromkeys(rc for rc in all_route_cards if rc))

    records = []
    tot_dispatched_qty = 0.0
    first_dc_no = _safe_str(dc_rows[0][0])
    first_dc_date = _format_date(dc_rows[0][1])
    first_uom = _safe_str(dc_rows[0][5]) or "Nos"
    first_transport = _safe_str(dc_rows[0][8]) or None
    first_vehicle = _safe_str(dc_rows[0][9]) or None
    first_eway = _safe_str(dc_rows[0][10]) or None
    first_po_ref = _safe_str(dc_rows[0][11]) or None

    for r in dc_rows:
        dc_n = _safe_str(r[0])
        p_no = _safe_str(r[1])
        desc = _safe_str(r[2])
        qty = _safe_float(r[3])
        uom_s = _safe_str(r[4]) or "Nos"
        proc_code = _safe_str(r[5])
        proc_name = _safe_str(r[6])

        tot_dispatched_qty += qty
        matched_rcs = rc_by_dc_part.get((dc_n, p_no), [])
        if not matched_rcs:
            # Fallback matching by DC alone if part format differs slightly
            matched_rcs = [
                {"route_card_no": item["route_card_no"], "qty": item["qty"]}
                for (d, p), items in rc_by_dc_part.items() if d == dc_n
                for item in items
            ]

        records.append({
            "dc_no": dc_n,
            "part_no": p_no,
            "description": desc,
            "process_code": proc_code,
            "process_name": proc_name,
            "qty": qty,
            "uom": uom_s,
            "route_cards": matched_rcs,
        })

    return {
        "dc_no": first_dc_no,
        "dc_date": first_dc_date,
        "dispatched_qty": tot_dispatched_qty,
        "uom": first_uom,
        "vehicle_no": first_vehicle,
        "transporter_name": first_transport,
        "eway_bill_no": first_eway,
        "grn_po_reference": first_po_ref,
        "records": records,
        "all_dc_numbers": all_dc_nos,
        "all_route_cards": all_route_cards,
    }


# =============================================================================
# 4. STAGE 3 - FINAL & INTERMEDIATE INSPECTION DETAILS
# =============================================================================

def get_inspection_details(conn, route_card_numbers: List[str]) -> Dict[str, Any]:
    """
    Stage 3: Inspection Details
    Sources:
      - FinalInspRouteCard: RouCardNo, FinspNo, partno, description, process, qty, rwqty, rejqty
      - InterInspEntryRouteCard: RouCardNo, inter_inspno, prodid, partno, process, okqty
    """
    if not route_card_numbers:
        return {
            "final_insp_no": None,
            "inspection_date": None,
            "total_qty": 0.0,
            "inspected_qty": 0.0,
            "rej_qty": 0.0,
            "rw_qty": 0.0,
            "routecard_no": None,
            "insp_by": None,
            "operations": [],
            "records": [],
        }

    cursor = conn.cursor()

    # 1. Final Inspection
    final_sql, final_params = _format_in_clause(
        cursor,
        """
        SELECT
            F.FinspNo,
            F.RouCardNo,
            F.partno,
            F.description,
            F.process AS process_code,
            PD.process AS process_name,
            ISNULL(F.qty, 0) AS qty,
            ISNULL(F.rwqty, 0) AS rwqty,
            ISNULL(F.rejqty, 0) AS rejqty
        FROM FinalInspRouteCard F
        LEFT JOIN ProcessDet PD ON F.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE F.RouCardNo IN (%IN%) AND ISNULL(F.deleted, 0) = 0
        ORDER BY F.FinspNo DESC
        """,
        route_card_numbers
    )
    final_rows = []
    if final_sql:
        cursor.execute(final_sql, final_params)
        final_rows = cursor.fetchall()

    # 2. Intermediate Inspection
    inter_sql, inter_params = _format_in_clause(
        cursor,
        """
        SELECT
            I.inter_inspno,
            I.prodid,
            I.partno,
            I.process AS process_code,
            PD.process AS process_name,
            I.RouCardNo,
            ISNULL(I.okqty, 0) AS okqty
        FROM InterInspEntryRouteCard I
        LEFT JOIN ProcessDet PD ON I.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE I.RouCardNo IN (%IN%) AND ISNULL(I.deleted, 0) = 0
        ORDER BY I.inter_inspno ASC
        """,
        route_card_numbers
    )
    inter_rows = []
    if inter_sql:
        cursor.execute(inter_sql, inter_params)
        inter_rows = cursor.fetchall()

    # Aggregate summaries
    tot_qty = sum(_safe_float(r[6]) for r in final_rows)
    tot_rw = sum(_safe_float(r[7]) for r in final_rows)
    tot_rej = sum(_safe_float(r[8]) for r in final_rows)

    first_finsp = _safe_str(final_rows[0][0]) if final_rows else None
    first_rc = route_card_numbers[0] if route_card_numbers else None

    # Operations breakdown
    operations = []
    op_num = 1
    # Add intermediate inspection operations
    for ir in inter_rows:
        operations.append({
            "routecard_no": _safe_str(ir[5]),
            "operation_no": op_num,
            "inspection_no": _safe_str(ir[0]),
            "process_code": _safe_str(ir[3]),
            "process_name": _safe_str(ir[4]) or "Intermediate Inspection",
            "machine": _safe_str(ir[1]),
            "shift": "Standard",
            "total_qty": _safe_float(ir[6]),
            "type": "Intermediate"
        })
        op_num += 1

    # Add final inspection operations
    for fr in final_rows:
        operations.append({
            "routecard_no": _safe_str(fr[1]),
            "operation_no": op_num,
            "inspection_no": _safe_str(fr[0]),
            "process_code": _safe_str(fr[4]),
            "process_name": _safe_str(fr[5]) or "Final Inspection",
            "machine": "QA Lab / Test Bench",
            "shift": "General",
            "total_qty": _safe_float(fr[6]),
            "rej_qty": _safe_float(fr[8]),
            "rw_qty": _safe_float(fr[7]),
            "type": "Final"
        })
        op_num += 1

    records = [
        {
            "final_insp_no": _safe_str(r[0]),
            "route_card_no": _safe_str(r[1]),
            "part_no": _safe_str(r[2]),
            "description": _safe_str(r[3]),
            "process_code": _safe_str(r[4]),
            "process_name": _safe_str(r[5]),
            "qty": _safe_float(r[6]),
            "rw_qty": _safe_float(r[7]),
            "rej_qty": _safe_float(r[8]),
        }
        for r in final_rows
    ]

    return {
        "final_insp_no": first_finsp,
        "inspection_date": None,
        "total_qty": tot_qty,
        "inspected_qty": tot_qty + tot_rej,
        "rej_qty": tot_rej,
        "rw_qty": tot_rw,
        "routecard_no": first_rc,
        "insp_by": "QA Inspection Team",
        "operations": operations,
        "records": records,
    }


# =============================================================================
# 5. STAGE 4 - PRODUCTION / JOB ORDER WITH QUALITY
# =============================================================================

def get_production_details(conn, route_card_numbers: List[str]) -> Dict[str, Any]:
    """
    Stage 4: Production (Inhouse CNC, Conventional, Rod, Job Order) & RouteCardStock
    """
    if not route_card_numbers:
        return {
            "route_card_no": None,
            "summary": {
                "production_qty": 0.0,
                "inter_inspection_qty": 0.0,
                "final_inspection_qty": 0.0,
                "dc_qty": 0.0,
                "job_qty": 0.0,
                "rejection_qty": 0.0,
                "rework_qty": 0.0,
            },
            "operations": [],
            "cnc_production": [],
            "conventional_production": [],
            "rod_production": [],
            "job_orders": [],
        }

    cursor = conn.cursor()

    # 1. RouteCardStock summary
    # NOTE: RouteCardStock does NOT contain 'deleted' column
    rcs_sql, rcs_params = _format_in_clause(
        cursor,
        """
        SELECT
            roucardno,
            partno,
            process AS process_code,
            ISNULL(prodqty, 0) AS prodqty,
            ISNULL(interinspqty, 0) AS interinspqty,
            ISNULL(finalinspqty, 0) AS finalinspqty,
            ISNULL(dcqty, 0) AS dcqty,
            ISNULL(Jobqty, 0) AS jobqty,
            ISNULL(rejqty, 0) AS rejqty,
            ISNULL(rwqty, 0) AS rwqty,
            ISNULL(finalinsprejqty, 0) AS finalinsprejqty,
            ISNULL(CustRWQty, 0) AS custrwqty
        FROM RouteCardStock
        WHERE roucardno IN (%IN%)
        """,
        route_card_numbers
    )
    rcs_rows = []
    if rcs_sql:
        cursor.execute(rcs_sql, rcs_params)
        rcs_rows = cursor.fetchall()

    sum_prod = sum(_safe_float(r[3]) for r in rcs_rows)
    sum_inter = sum(_safe_float(r[4]) for r in rcs_rows)
    sum_final = sum(_safe_float(r[5]) for r in rcs_rows)
    sum_dc = sum(_safe_float(r[6]) for r in rcs_rows)
    sum_job = sum(_safe_float(r[7]) for r in rcs_rows)
    sum_rej = sum(_safe_float(r[8]) + _safe_float(r[10]) for r in rcs_rows)
    sum_rw = sum(_safe_float(r[9]) + _safe_float(r[11]) for r in rcs_rows)

    # 2. CNC Production: CncProd_TouchRouteCardDet -> ProductionEntry
    cnc_sql, cnc_params = _format_in_clause(
        cursor,
        """
        SELECT
            CT.RouCardNo,
            CT.partno,
            CT.prgno,
            CT.process AS process_code,
            PD.process AS process_name,
            PE.prodid,
            PE.proddate,
            PE.macno,
            PE.shift,
            PE.oprname,
            ISNULL(PE.okqty, 0) AS okqty,
            ISNULL(PE.rejqty, 0) AS rejqty,
            ISNULL(PE.rwqty, 0) AS rwqty,
            PE.cycletime
        FROM CncProd_TouchRouteCardDet CT
        INNER JOIN ProductionEntry PE ON (
            (CT.prodid IS NOT NULL AND CT.prodid = PE.prodid)
            OR (CT.prodid IS NULL AND CT.TchEntryNo = PE.TchEntryNo)
        ) AND ISNULL(PE.deleted, 0) = 0
        LEFT JOIN ProcessDet PD ON CT.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE CT.RouCardNo IN (%IN%) AND ISNULL(CT.deleted, 0) = 0
        ORDER BY PE.proddate ASC, PE.prodid ASC
        """,
        route_card_numbers
    )
    cnc_rows = []
    if cnc_sql:
        cursor.execute(cnc_sql, cnc_params)
        cnc_rows = cursor.fetchall()

    cnc_production = [
        {
            "route_card_no": _safe_str(r[0]),
            "part_no": _safe_str(r[1]),
            "prg_no": _safe_str(r[2]),
            "process_code": _safe_str(r[3]),
            "process_name": _safe_str(r[4]) or "CNC Machining",
            "prod_id": _safe_str(r[5]),
            "prod_date": _format_date(r[6]),
            "machine": _safe_str(r[7]),
            "shift": _safe_str(r[8]),
            "operator": _safe_str(r[9]),
            "ok_qty": _safe_float(r[10]),
            "rej_qty": _safe_float(r[11]),
            "rw_qty": _safe_float(r[12]),
            "cycle_time": _safe_float(r[13]),
        }
        for r in cnc_rows
    ]

    # 3. Conventional Production: ConvProdEntryRouteCard
    conv_sql, conv_params = _format_in_clause(
        cursor,
        """
        SELECT
            CP.RouCardNo,
            CP.EntryNo,
            CP.macno,
            CP.shift,
            CP.partno,
            CP.description,
            CP.process AS process_code,
            PD.process AS process_name,
            ISNULL(CP.okqty, 0) AS okqty,
            ISNULL(CP.CustRWQty, 0) AS rwqty
        FROM ConvProdEntryRouteCard CP
        LEFT JOIN ProcessDet PD ON CP.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE CP.RouCardNo IN (%IN%) AND ISNULL(CP.deleted, 0) = 0
        ORDER BY CP.EntryNo ASC
        """,
        route_card_numbers
    )
    conv_rows = []
    if conv_sql:
        cursor.execute(conv_sql, conv_params)
        conv_rows = cursor.fetchall()

    conventional_production = [
        {
            "route_card_no": _safe_str(r[0]),
            "entry_no": _safe_str(r[1]),
            "machine": _safe_str(r[2]),
            "shift": _safe_str(r[3]),
            "part_no": _safe_str(r[4]),
            "description": _safe_str(r[5]),
            "process_code": _safe_str(r[6]),
            "process_name": _safe_str(r[7]) or "Conventional Machining",
            "ok_qty": _safe_float(r[8]),
            "rw_qty": _safe_float(r[9]),
        }
        for r in conv_rows
    ]

    # 4. Conventional Rod Production: ConvProdEntryRodRouteCard
    rod_sql, rod_params = _format_in_clause(
        cursor,
        """
        SELECT
            CR.RouCardNo,
            CR.EntryNo,
            CR.macno,
            CR.shift,
            CR.partno,
            CR.description,
            CR.process AS process_code,
            PD.process AS process_name,
            CR.RmName,
            CR.Dia,
            ISNULL(CR.qty, 0) AS qty,
            ISNULL(CR.QtyKgs, 0) AS qty_kgs
        FROM ConvProdEntryRodRouteCard CR
        LEFT JOIN ProcessDet PD ON CR.process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE CR.RouCardNo IN (%IN%) AND ISNULL(CR.deleted, 0) = 0
        ORDER BY CR.EntryNo ASC
        """,
        route_card_numbers
    )
    rod_rows = []
    if rod_sql:
        cursor.execute(rod_sql, rod_params)
        rod_rows = cursor.fetchall()

    rod_production = [
        {
            "route_card_no": _safe_str(r[0]),
            "entry_no": _safe_str(r[1]),
            "machine": _safe_str(r[2]),
            "shift": _safe_str(r[3]),
            "part_no": _safe_str(r[4]),
            "description": _safe_str(r[5]),
            "process_code": _safe_str(r[6]),
            "process_name": _safe_str(r[7]) or "Rod Turning",
            "rm_name": _safe_str(r[8]),
            "dia": _safe_str(r[9]),
            "qty": _safe_float(r[10]),
            "qty_kgs": _safe_float(r[11]),
        }
        for r in rod_rows
    ]

    # 5. Job Orders: JobIncomeDetRouteCard
    # NOTE: JobIncomeDetRouteCard does NOT have 'deleted'
    job_sql, job_params = _format_in_clause(
        cursor,
        """
        SELECT
            JRC.RouCardNo,
            JRC.JiNo,
            JRC.JbNo,
            JRC.PartNo,
            JRC.Process AS process_code,
            PD.process AS process_name,
            COALESCE(CM.CName, N'Subcontractor') AS subcontractor_name,
            ISNULL(JRC.Qty, 0) AS qty,
            JRC.IsRej,
            JM.jbdate,
            JM.remarks
        FROM JobIncomeDetRouteCard JRC
        LEFT JOIN Job_mas JM ON JRC.JbNo = JM.jbno AND ISNULL(JM.deleted, 0) = 0
        LEFT JOIN CustMast CM ON JRC.CId = CM.Id AND ISNULL(CM.Deleted, 0) = 0
        LEFT JOIN ProcessDet PD ON JRC.Process = PD.pcode AND ISNULL(PD.deleted, 0) = 0
        WHERE JRC.RouCardNo IN (%IN%)
        ORDER BY JRC.JiNo ASC
        """,
        route_card_numbers
    )
    job_rows = []
    if job_sql:
        cursor.execute(job_sql, job_params)
        job_rows = cursor.fetchall()

    job_orders = [
        {
            "route_card_no": _safe_str(r[0]),
            "income_no": _safe_str(r[1]),
            "job_no": _safe_str(r[2]),
            "part_no": _safe_str(r[3]),
            "process_code": _safe_str(r[4]),
            "process_name": _safe_str(r[5]) or "Subcontract Process",
            "subcontractor": _safe_str(r[6]),
            "qty": _safe_float(r[7]),
            "is_rej": bool(r[8]),
            "job_date": _format_date(r[9]),
            "remarks": _safe_str(r[10]),
        }
        for r in job_rows
    ]

    # Combine all operations for UI timeline flow
    operations = []
    for c in cnc_production:
        operations.append({
            "op_code": c["process_code"] or "CNC",
            "category": "Inhouse CNC",
            "process_name": c["process_name"],
            "station": c["machine"],
            "operator": c["operator"],
            "quality_reference": f"OK: {c['ok_qty']} | Rej: {c['rej_qty']}",
        })
    for cp in conventional_production:
        operations.append({
            "op_code": cp["process_code"] or "CONV",
            "category": "Inhouse Conventional",
            "process_name": cp["process_name"],
            "station": cp["machine"],
            "operator": cp["shift"],
            "quality_reference": f"OK: {cp['ok_qty']}",
        })
    for j in job_orders:
        operations.append({
            "op_code": j["process_code"] or "SUB",
            "category": "Subcontract",
            "process_name": j["process_name"],
            "station": j["subcontractor"],
            "operator_or_challan": j["job_no"],
            "quality_reference": f"Qty: {j['qty']}",
        })

    # If RouteCardStock had values but individual prod entries weren't loaded, fallback summary
    if sum_prod == 0.0:
        sum_prod = sum(c["ok_qty"] for c in cnc_production) + sum(cp["ok_qty"] for cp in conventional_production)

    return {
        "route_card_no": route_card_numbers[0] if route_card_numbers else None,
        "summary": {
            "production_qty": sum_prod,
            "inter_inspection_qty": sum_inter,
            "final_inspection_qty": sum_final,
            "dc_qty": sum_dc,
            "job_qty": sum_job,
            "rejection_qty": sum_rej,
            "rework_qty": sum_rw,
        },
        "operations": operations,
        "cnc_production": cnc_production,
        "conventional_production": conventional_production,
        "rod_production": rod_production,
        "job_orders": job_orders,
    }


# =============================================================================
# 6. STAGE 5 - GRN TRACKING
# =============================================================================

def get_grn_details(conn, route_card_numbers: List[str]) -> Dict[str, Any]:
    """
    Stage 5: GRN Tracking
    Links: RouteCardNo -> RouCard_RmGrnDet -> grn_mas, grn_det, inspmas, inspdet
    """
    if not route_card_numbers:
        return {
            "grn_no": None,
            "grn_inward_date": None,
            "material_qty": 0.0,
            "uom": "Kg",
            "records": [],
            "all_grn_numbers": [],
        }

    cursor = conn.cursor()

    rm_grn_sql, rm_grn_params = _format_in_clause(
        cursor,
        """
        SELECT
            RG.roucardno,
            RG.grnno,
            RG.grndate,
            RG.partno,
            RG.rmname,
            RG.mattype,
            ISNULL(RG.grnqty, 0) AS grnqty,
            RG.RmUom,
            GM.pono,
            GM.cid,
            COALESCE(CM.CName, CAM.CName, N'') AS supplier_name
        FROM RouCard_RmGrnDet RG
        LEFT JOIN grn_mas GM ON RG.grnno = GM.grnno AND ISNULL(GM.deleted, 0) = 0
        LEFT JOIN CustMast CM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
            AND ISNULL(CM.Deleted, 0) = 0
        LEFT JOIN CustAliasMast CAM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CAM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
            AND ISNULL(CAM.Deleted, 0) = 0
        WHERE RG.roucardno IN (%IN%) AND ISNULL(RG.deleted, 0) = 0
        ORDER BY RG.grndate DESC, RG.grnno DESC
        """,
        route_card_numbers
    )
    rm_rows = []
    if rm_grn_sql:
        cursor.execute(rm_grn_sql, rm_grn_params)
        rm_rows = cursor.fetchall()

    if not rm_rows:
        return {
            "grn_no": None,
            "grn_inward_date": None,
            "material_qty": 0.0,
            "uom": "Kg",
            "records": [],
            "all_grn_numbers": [],
        }

    all_grn_nos = list(dict.fromkeys(_safe_str(r[1]) for r in rm_rows if _safe_str(r[1])))

    # Fetch GRN Inspection details from inspmas & inspdet
    grn_insp_map = {}
    if all_grn_nos:
        insp_sql, insp_params = _format_in_clause(
            cursor,
            """
            SELECT
                IM.grnno,
                IM.irno,
                IM.irdate,
                IM.inspby,
                ID.partno,
                ISNULL(ID.grnqty, 0) AS grnqty,
                ISNULL(ID.okqty, 0) AS okqty,
                ISNULL(ID.matrej, 0) + ISNULL(ID.macrej, 0) AS rejqty
            FROM inspmas IM
            INNER JOIN inspdet ID ON IM.irno = ID.irno AND ISNULL(ID.deleted, 0) = 0
            WHERE IM.grnno IN (%IN%) AND ISNULL(IM.deleted, 0) = 0
            """,
            all_grn_nos
        )
        if insp_sql:
            cursor.execute(insp_sql, insp_params)
            for i_row in cursor.fetchall():
                g_no = _safe_str(i_row[0])
                grn_insp_map[g_no] = {
                    "irno": _safe_str(i_row[1]),
                    "irdate": _format_date(i_row[2]),
                    "insp_by": _safe_str(i_row[3]) or "Store QA Inspector",
                    "ok_qty": _safe_float(i_row[6]),
                    "rej_qty": _safe_float(i_row[7]),
                }

    records = []
    tot_mat_qty = 0.0
    first_grn_no = _safe_str(rm_rows[0][1])
    first_grn_date = _format_date(rm_rows[0][2])
    first_uom = _safe_str(rm_rows[0][7]) or "Kg"

    for r in rm_rows:
        g_no = _safe_str(r[1])
        g_date = _format_date(r[2])
        p_no = _safe_str(r[3])
        rm_name = _safe_str(r[4])
        mat_type = _safe_str(r[5])
        g_qty = _safe_float(r[6])
        uom_str = _safe_str(r[7]) or "Kg"
        sup_name = _safe_str(r[10])

        tot_mat_qty += g_qty
        insp_info = grn_insp_map.get(g_no, {})
        ok_q = insp_info.get("ok_qty", g_qty)
        rej_q = insp_info.get("rej_qty", 0.0)
        verdict = "PASS" if rej_q == 0 else "PARTIAL"

        records.append({
            "grn_no": g_no,
            "grn_date": g_date,
            "part_no": p_no,
            "raw_material": f"{rm_name} - {mat_type}" if mat_type else rm_name,
            "material_qty": g_qty,
            "uom": uom_str,
            "ok_qty": ok_q,
            "rej_qty": rej_q,
            "insp_by": insp_info.get("insp_by", "Store Inspector"),
            "verdict": verdict,
            "supplier_name": sup_name,
        })

    return {
        "grn_no": first_grn_no,
        "grn_inward_date": first_grn_date,
        "material_qty": tot_mat_qty,
        "uom": first_uom,
        "records": records,
        "all_grn_numbers": all_grn_nos,
    }


# =============================================================================
# 7. STAGE 6 - SUPPLIER & RAW MATERIAL PO DETAILS
# =============================================================================

def get_supplier_details(conn, grn_numbers: List[str]) -> Dict[str, Any]:
    """
    Stage 6: Supplier Details & Raw Material PO
    Links: grnno -> grninsubdet -> POMas, PODet, CustMast
    """
    if not grn_numbers:
        return {
            "supplier_name": None,
            "raw_material_po_ref": None,
            "po_date": None,
            "qty": 0.0,
            "uom": "Kg",
            "vendor_rating": None,
            "rejection_ppm": None,
            "traceability": None,
            "records": [],
        }

    cursor = conn.cursor()

    sup_sql, sup_params = _format_in_clause(
        cursor,
        """
        SELECT DISTINCT
            GM.grnno,
            GM.cid,
            COALESCE(CM.CName, CAM.CName, N'') AS supplier_name,
            GIS.pono,
            GIS.podate,
            GIS.rmname,
            GIS.mattype,
            ISNULL(GIS.qty, 0) AS qty,
            ISNULL(GIS.QtyKgs, 0) AS qty_kgs,
            PM.podate AS po_master_date,
            PM.totamt AS po_total_amt
        FROM grninsubdet GIS
        INNER JOIN grn_mas GM ON GIS.grnno = GM.grnno AND ISNULL(GM.deleted, 0) = 0
        LEFT JOIN POMas PM ON
            LTRIM(RTRIM(GIS.pono)) = LTRIM(RTRIM(PM.pono))
            AND ISNULL(PM.deleted, 0) = 0
        LEFT JOIN CustMast CM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
            AND ISNULL(CM.Deleted, 0) = 0
        LEFT JOIN CustAliasMast CAM ON
            LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CAM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
            AND ISNULL(CAM.Deleted, 0) = 0
        WHERE GIS.grnno IN (%IN%) AND ISNULL(GIS.deleted, 0) = 0
        ORDER BY GM.grnno ASC
        """,
        grn_numbers
    )
    sup_rows = []
    if sup_sql:
        cursor.execute(sup_sql, sup_params)
        sup_rows = cursor.fetchall()

    if not sup_rows:
        # Fallback: Check grn_mas alone if grninsubdet has no link
        fallback_sql, fb_params = _format_in_clause(
            cursor,
            """
            SELECT DISTINCT
                GM.grnno,
                GM.cid,
                COALESCE(CM.CName, CAM.CName, N'') AS supplier_name,
                GM.pono,
                GM.grndate
            FROM grn_mas GM
            LEFT JOIN CustMast CM ON
                LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
                AND ISNULL(CM.Deleted, 0) = 0
            LEFT JOIN CustAliasMast CAM ON
                LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(CAM.Id, N'')))) = LTRIM(RTRIM(CONVERT(NVARCHAR(128), ISNULL(GM.cid, N''))))
                AND ISNULL(CAM.Deleted, 0) = 0
            WHERE GM.grnno IN (%IN%) AND ISNULL(GM.deleted, 0) = 0
            """,
            grn_numbers
        )
        if fallback_sql:
            cursor.execute(fallback_sql, fb_params)
            fb_rows = cursor.fetchall()
            if fb_rows:
                f_sup = _safe_str(fb_rows[0][2])
                f_po = _safe_str(fb_rows[0][3])
                f_date = _format_date(fb_rows[0][4])
                return {
                    "supplier_name": f_sup,
                    "raw_material_po_ref": f_po,
                    "po_date": f_date,
                    "qty": 0.0,
                    "uom": "Kg",
                    "vendor_rating": None,
                    "rejection_ppm": None,
                    "traceability": None,
                    "records": [
                        {
                            "supplier_name": f_sup,
                            "raw_material_po_ref": f_po,
                            "po_date": f_date,
                            "qty": 0.0,
                            "uom": "Kg",
                            "approval_status": "APPROVED",
                        }
                    ],
                }

        return {
            "supplier_name": None,
            "raw_material_po_ref": None,
            "po_date": None,
            "qty": 0.0,
            "uom": "Kg",
            "vendor_rating": None,
            "rejection_ppm": None,
            "traceability": None,
            "records": [],
        }

    records = []
    tot_qty = 0.0
    first_supplier = _safe_str(sup_rows[0][2])
    first_po = _safe_str(sup_rows[0][3])
    first_po_date = _format_date(sup_rows[0][9]) or _format_date(sup_rows[0][4])

    for r in sup_rows:
        s_name = _safe_str(r[2])
        p_ref = _safe_str(r[3])
        p_date = _format_date(r[9]) or _format_date(r[4])
        qty = _safe_float(r[7])
        qty_kgs = _safe_float(r[8])
        use_qty = qty_kgs if qty_kgs > 0 else qty
        tot_qty += use_qty

        records.append({
            "supplier_name": s_name,
            "raw_material_po_ref": p_ref,
            "po_date": p_date,
            "qty": use_qty,
            "uom": "Kg",
            "approval_status": "APPROVED",
        })

    return {
        "supplier_name": first_supplier,
        "raw_material_po_ref": first_po,
        "po_date": first_po_date,
        "qty": tot_qty,
        "uom": "Kg",
        "vendor_rating": None,
        "rejection_ppm": None,
        "traceability": None,
        "records": records,
    }


# =============================================================================
# 8. COMPLETE 6-STAGE TIMELINE BUILDER
# =============================================================================

def build_quality_timeline(conn, invoice_no: str) -> Optional[Dict[str, Any]]:
    """
    Builds the complete end-to-end 6-stage Quality Timeline payload for an invoice.
    Pipeline:
      STAGE 01 - CUSTOMER INVOICE
      STAGE 02 - DELIVERY CHALLAN
      STAGE 03 - FINAL / INTERMEDIATE INSPECTION
      STAGE 04 - PRODUCTION / JOB ORDER
      STAGE 05 - GRN TRACKING
      STAGE 06 - SUPPLIER / MILL DETAILS
    """
    # STAGE 1
    s1_data = get_invoice_details(conn, invoice_no)
    if not s1_data:
        return None

    # STAGE 2
    s2_data = get_dc_details(conn, invoice_no)
    all_route_cards = s2_data.get("all_route_cards", [])

    # STAGE 3
    s3_data = get_inspection_details(conn, all_route_cards)

    # STAGE 4
    s4_data = get_production_details(conn, all_route_cards)

    # STAGE 5
    s5_data = get_grn_details(conn, all_route_cards)
    all_grn_numbers = s5_data.get("all_grn_numbers", [])

    # STAGE 6
    s6_data = get_supplier_details(conn, all_grn_numbers)

    # Determine Stage Statuses: "Verified", "Pending", "Not Available", "Partial"
    status_s1 = "Verified" if s1_data else "Pending"
    status_s2 = "Verified" if s2_data["records"] else "Pending"
    status_s3 = "Verified" if (s3_data["records"] or s3_data["operations"]) else "Pending"
    status_s4 = "Verified" if s4_data["operations"] else "Pending"
    status_s5 = "Verified" if s5_data["records"] else "Pending"
    status_s6 = "Verified" if s6_data["records"] else "Not Available"

    # Parts array for invoice selector header
    parts_list = []
    for r in s1_data["records"]:
        parts_list.append({
            "part_no": r["part_no"],
            "description": r["description"],
            "billed_qty": r["billed_qty"],
            "uom": r["uom"],
            "part_value": r["amount"],
        })

    return {
        "success": True,
        "invoice": {
            "invoice_no": s1_data["invoice_no"],
            "customer_name": s1_data["customer_name"],
            "invoice_date": s1_data["invoice_date"],
            "parts_count": len(parts_list),
            "invoice_value": s1_data["total_net_payable"],
        },
        "parts": parts_list,
        "stages": {
            "stage1": {
                "stage_no": 1,
                "stage_name": "Invoice No",
                "status": status_s1,
                "badge": s1_data["invoice_no"],
                "records": s1_data["records"],
                "data": s1_data,
            },
            "stage2": {
                "stage_no": 2,
                "stage_name": "DC (Delivery Challan)",
                "status": status_s2,
                "badge": s2_data["dc_no"],
                "records": s2_data["records"],
                "data": s2_data,
            },
            "stage3": {
                "stage_no": 3,
                "stage_name": "Final Insp",
                "status": status_s3,
                "badge": s3_data["final_insp_no"],
                "records": s3_data["records"],
                "operations": s3_data["operations"],
                "data": s3_data,
            },
            "stage4": {
                "stage_no": 4,
                "stage_name": "Production (Inhouse & Job Order) with Quality Insp",
                "status": status_s4,
                "badge": s4_data["route_card_no"],
                "records": s4_data["operations"],
                "summary": s4_data["summary"],
                "data": s4_data,
            },
            "stage5": {
                "stage_no": 5,
                "stage_name": "GRN Tracking",
                "status": status_s5,
                "badge": s5_data["grn_no"],
                "records": s5_data["records"],
                "data": s5_data,
            },
            "stage6": {
                "stage_no": 6,
                "stage_name": "Supplier Details",
                "status": status_s6,
                "badge": s6_data["supplier_name"],
                "records": s6_data["records"],
                "data": s6_data,
            },
        },
    }
