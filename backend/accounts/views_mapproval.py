# ════════════════════════════════════════════════════════════════
#  views_mapproval.py
#  M-Approval — Material / Maintenance Approval Module
#  
#  GET  mapproval/list/ | stats/ | detail/
#  POST mapproval/approve/ | mapproval/modify/
# ════════════════════════════════════════════════════════════════
import threading
from django.db import connection, transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import get_tenant_connection

def _log_approval_bg(tenant_id, company_code, form_name, transaction_no, doc_date, doc_type, approved_by):
    try:
        from django.utils import timezone
        from .models import TenantApproval
        if doc_type == "Vendor Rate Master":
            # Allow duplicate Part Numbers using direct create
            TenantApproval.objects.create(
                tenantid=tenant_id,
                companycode=company_code,
                formname=form_name,
                transactionno=transaction_no,
                transactiondate=doc_date,
                transactiontype=doc_type,
                approvedby=approved_by,
                datetime=timezone.now()
            )
        else:
            TenantApproval.objects.update_or_create(
                tenantid=tenant_id,
                companycode=company_code,
                formname=form_name,
                transactionno=transaction_no,
                defaults={
                    "transactiondate": doc_date,
                    "transactiontype": doc_type,
                    "approvedby": approved_by,
                    "datetime": timezone.now(),
                }
            )
        print(f"[M-APPROVAL] Background log saved to tenants_approvals for {transaction_no}")
    except Exception as ex:
        print(f"[M-APPROVAL] Background log approval error for {transaction_no}:", ex)

def _log_reversion_bg(tenant_id, company_code, form_name, transaction_no, doc_date=None, doc_type=None):
    try:
        from .models import TenantApproval
        if doc_type == "Customer PO":
            TenantApproval.objects.filter(
                tenantid=tenant_id,
                companycode=company_code,
                formname=form_name,
                transactionno=transaction_no
            ).delete()
            TenantApproval.objects.filter(
                tenantid=tenant_id,
                companycode=company_code,
                formname=form_name,
                transactionno__startswith=f"{transaction_no}:"
            ).delete()
            print(f"[M-APPROVAL] Background log deleted from tenants_approvals for Customer PO {transaction_no}")
        else:
            q = TenantApproval.objects.filter(
                tenantid=tenant_id,
                companycode=company_code,
                formname=form_name,
                transactionno=transaction_no
            )
            if doc_date and doc_type == "Vendor Rate Master":
                q = q.filter(transactiondate=doc_date)
            q.delete()
            print(f"[M-APPROVAL] Background log deleted from tenants_approvals for {transaction_no} ({doc_type})")
    except Exception as ex:
        print(f"[M-APPROVAL] Background log reversion error for {transaction_no}:", ex)

DUMMY_CARDS = []

def fetch_product_route_cards(request=None, from_date="2026-08-01", to_date="2026-08-31", single_roucardno=None):
    """
    SQL query handler for Product Route Card approvals.
    Executes raw SQL query on RouCardWaitAppr_Mas and child detail tables.
    """
    # Check IsRouCardApprove setting in CompanySetting table
    is_approve_needed = False
    try:
        setting_query = "SELECT TOP 1 IsRouCardApprove FROM CompanySetting"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
        
        if setting_rows and setting_rows[0][0]:
            is_approve_needed = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySetting.IsRouCardApprove:", e)

    if not is_approve_needed:
        return []

    try:
        query = f"""
    DECLARE @FromDate DATE = '{from_date}';
    DECLARE @ToDate   DATE = '{to_date}';

    SELECT
        ------------------------------
        -- Route Card Details
        ------------------------------
        RM.roucardno                              AS [Route Card No],
        RM.roucarddt                              AS [Route Card Date],
        RM.IsApproved                             AS [IsApproved],
        C.CName                                   AS [Customer Name],
        RM.partno                                 AS [Part No],
        RM.description                            AS [Description],

        ------------------------------
        -- Process Details
        ------------------------------
        PD.process                                AS [Process Code],
        PR.process                                AS [Process],
        'Nos'                                     AS [UOM],
        RM.batchqty                               AS [Qty],

        ------------------------------
        -- Raw Material & Supplier DC
        ------------------------------
        S.CName                                   AS [Supplier Name],
        RG.rmname                                 AS [RM Code],
        RG.mattype                                AS [RM Description],
        RG.grnno                                  AS [GRN No],
        RG.grndate                                AS [GRN Date],
        RG.dcno                                   AS [Supplier DC],
        RG.dcdt                                   AS [Supplier DC Date],
        RG.RmUom                                  AS [RM UOM],
        RG.grnqty                                 AS [GRN Qty],
        RG.RouCardQty                             AS [Route Qty],
        RG.RmConsumpQty                           AS [Cons Qty],

        ------------------------------
        -- Heat Traceability
        ------------------------------
        H.HeatNo                                  AS [Heat No],
        H.qty                                     AS [Heat Qty]

    FROM RouCardWaitAppr_Mas RM

    LEFT JOIN CustMast C
           ON RM.cid = C.Id

    LEFT JOIN RouCardWaitAppr_Det PD
           ON RM.roucardno = PD.roucardno
          AND RM.partno    = PD.partno
          AND ISNULL(PD.deleted,0)=0

    LEFT JOIN ProcessDet PR
           ON PD.process = PR.pcode
          AND ISNULL(PR.deleted,0)=0

    LEFT JOIN RouCard_RmGrnDet RG
           ON RM.roucardno = RG.roucardno
          AND ISNULL(RG.deleted,0)=0

    LEFT JOIN CustMast S
           ON RG.cid = S.Id

    LEFT JOIN RouCard_HeatNoDet H
           ON RM.roucardno = H.roucardno
          AND RM.partno    = H.partno
          AND ISNULL(H.deleted,0)=0

    WHERE ISNULL(RM.deleted,0)=0
      {f"AND (LTRIM(RTRIM(RM.roucardno)) = '{single_roucardno}' OR RM.roucardno = '{single_roucardno}')" if single_roucardno else "AND RM.roucarddt >= @FromDate AND RM.roucarddt < DATEADD(DAY,1,@ToDate)"}

    ORDER BY
          RM.roucarddt,
          RM.roucardno,
          PD.seq,
          RG.grnno,
          H.HeatNo;
    """

        raw_rows = []
        columns = []

        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query)
                description = cursor.description or []
                columns = [col[0] for col in description]
                raw_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception as ex:
                print("[M-APPROVAL] Tenant DB fetch warning:", ex)

        if not raw_rows:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(query)
                    description = cursor.description or []
                    columns = [col[0] for col in description]
                    raw_rows = cursor.fetchall()
            except Exception as e:
                print("[M-APPROVAL] Fallback DB fetch warning:", e)

        # Batch fetch approvals to prevent N+1 queries
        approvals_map = {}
        try:
            from .models import TenantApproval
            from django.utils import timezone
            appr_list = TenantApproval.objects.filter(formname="Mapproval")
            for app in list(appr_list):
                app_dt_str = timezone.localtime(app.datetime).strftime("%d/%m/%Y %I:%M %p") if app.datetime else None
                approvals_map[app.transactionno] = {
                    "approvedby": app.approvedby or "Manager",
                    "datetime": app_dt_str
                }
        except Exception as e:
            print("[M-APPROVAL] Warning batch fetching TenantApprovals:", e)

        cards_map = {}
        for row_tuple in raw_rows:
            r = dict(zip(columns, row_tuple))
            rc_no = str(r.get("Route Card No") or "")
            if not rc_no:
                continue

            if rc_no not in cards_map:
                rc_date = r.get("Route Card Date")
                date_str = rc_date.strftime("%d/%m/%Y") if hasattr(rc_date, "strftime") else str(rc_date or "")
                is_appr = bool(r.get("IsApproved"))

                appr_by_str = None
                appr_dt_str = None
                if is_appr:
                    appr_info = approvals_map.get(rc_no)
                    if appr_info:
                        appr_by_str = appr_info["approvedby"]
                        appr_dt_str = appr_info["datetime"]
                    if not appr_by_str:
                        appr_by_str = "Manager"

                cards_map[rc_no] = {
                    "id": f"route_card:{rc_no}",
                    "poNo": rc_no,
                    "poDate": date_str,
                    "type": "Product Route Card",
                    "status": "Approved" if is_appr else "Pending",
                    "vendor": str(r.get("Customer Name") or "Unknown Customer"),
                    "countLabel": "Batch Qty",
                    "countVal": float(r.get("Qty") or 0.0),
                    "docKind": "route_card",
                    "approvedBy": appr_by_str,
                    "approvedDateTime": appr_dt_str,
                    "items": [],
                    "rawMaterials": [],
                    "heatNumbers": [],
                }

            card = cards_map[rc_no]
            items = card["items"]
            raw_mats = card["rawMaterials"]
            heats = card["heatNumbers"]

            part_no = r.get("Part No")
            proc_name = r.get("Process") or r.get("Process Code")
            if part_no:
                already = False
                for it in items:
                    if it.get("codeNo") == part_no and it.get("process") == proc_name:
                        already = True
                        break
                if not already:
                    items.append({
                        "sNo": len(items) + 1,
                        "codeNo": str(part_no),
                        "description": str(r.get("Description") or ""),
                        "process": str(proc_name or "PRE MACHINING & CNC"),
                        "uom": str(r.get("UOM") or "NOS"),
                        "qty": float(r.get("Qty") or 0.0),
                    })

            rm_code = r.get("RM Code")
            grn_no = r.get("GRN No")
            if rm_code:
                already = False
                for rm in raw_mats:
                    if rm.get("rmName") == rm_code and rm.get("grnNo") == grn_no:
                        already = True
                        break
                if not already:
                    grn_dt = r.get("GRN Date")
                    dc_dt = r.get("Supplier DC Date")
                    raw_mats.append({
                        "supplierName": str(r.get("Supplier Name") or "—"),
                        "rmName": str(rm_code),
                        "rmDescription": str(r.get("RM Description") or "—"),
                        "grnNo": str(grn_no or "—"),
                        "grnDate": grn_dt.strftime("%d/%m/%Y") if hasattr(grn_dt, "strftime") else str(grn_dt or "—"),
                        "supplierDcNo": str(r.get("Supplier DC") or "—"),
                        "dcDate": dc_dt.strftime("%d/%m/%Y") if hasattr(dc_dt, "strftime") else str(dc_dt or "—"),
                        "uom": str(r.get("RM UOM") or "NOS"),
                        "grnQty": float(r.get("GRN Qty") or 0.0),
                        "routeCardQty": float(r.get("Route Qty") or 0.0),
                        "rmConsQty": f"{float(r.get('Cons Qty') or 0.0):.3f}",
                    })

            heat_no = r.get("Heat No")
            if heat_no:
                already = False
                for h in heats:
                    if h.get("heatNo") == heat_no:
                        already = True
                        break
                if not already:
                    heats.append({
                        "sNo": len(heats) + 1,
                        "heatNo": str(heat_no),
                        "qty": float(r.get("Heat Qty") or 0.0),
                    })

        return list(cards_map.values())
    except Exception as e:
        print("Error fetching product route cards:", e)
        return []


def fetch_vendor_rate_masters(request=None, from_date="2026-08-01", to_date="2026-08-31", single_rowno=None):
    """
    SQL query handler for Vendor Rate Master.
    Queries VenPrdPrcRate_Mast filtered by UsedDate, joining CustMast and ProcessDet.
    """
    # Check IsVendRateMast setting in CompanySettingFeatures table
    is_approve_needed = False
    try:
        setting_query = "SELECT TOP 1 IsVendRateMast FROM CompanySettingFeatures"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
        
        if setting_rows and setting_rows[0][0]:
            is_approve_needed = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySettingFeatures.IsVendRateMast:", e)

    if not is_approve_needed:
        return []

    try:
        query = f"""
            DECLARE @FromDate DATE = '{from_date}';
            DECLARE @ToDate   DATE = '{to_date}';

            SELECT
                R.cid                                        AS [cid],
                C.CName                                      AS [CName],
                R.PartNo                                     AS [PartNo],
                R.Description                                AS [Description],
                R.Process                                    AS [ProcessCode],
                IP.process                                   AS [IssueProcess],
                R.RtnProcess                                 AS [RtnProcessCode],
                RP.process                                   AS [RtnProcess],
                R.Rate                                       AS [Rate],
                R.EffDate                                    AS [EffDate],
                R.remarks                                    AS [remarks],
                R.rowno                                      AS [rowno],
                R.deleted                                    AS [deleted],
                R.RateRev                                    AS [RateRev],
                R.RatePerKgs                                 AS [RatePerKgs],
                R.cycletime                                  AS [cycletime],
                R.ProcLeadDays                               AS [ProcLeadDays],
                R.IsInActive                                 AS [IsInActive],
                R.hsncode                                    AS [hsncode],
                R.UserName                                   AS [UserName],
                R.UsedDate                                   AS [UsedDate],
                R.UsedTime                                   AS [UsedTime],
                R.SystemName                                 AS [SystemName],
                R.IsApproved                                 AS [IsApproved]
            FROM VenPrdPrcRate_Mast R
            LEFT JOIN CustMast C
                   ON R.cid = C.Id
            LEFT JOIN ProcessDet IP
                   ON R.Process = IP.pcode
                  AND ISNULL(IP.deleted, 0) = 0
            LEFT JOIN ProcessDet RP
                   ON R.RtnProcess = RP.pcode
                  AND ISNULL(RP.deleted, 0) = 0
            WHERE ISNULL(R.deleted, 0) = 0
              {f"AND R.rowno = {int(single_rowno)}" if single_rowno else "AND CAST(R.UsedDate AS DATE) BETWEEN @FromDate AND @ToDate"}
            ORDER BY R.UsedDate DESC, R.rowno DESC
        """

        raw_rows = []
        columns = []

        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query)
                description = cursor.description or []
                columns = [col[0] for col in description]
                raw_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception as ex:
                print("[M-APPROVAL] Tenant DB fetch warning (Vendor Rate Master):", ex)

        if not raw_rows:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(query)
                    description = cursor.description or []
                    columns = [col[0] for col in description]
                    raw_rows = cursor.fetchall()
            except Exception as e:
                print("[M-APPROVAL] Fallback DB fetch warning (Vendor Rate Master):", e)

        # Batch fetch approvals to prevent N+1 queries
        approvals_map = {}
        try:
            from .models import TenantApproval
            from django.utils import timezone
            appr_list = TenantApproval.objects.filter(formname="Mapproval")
            for app in list(appr_list):
                app_dt_str = timezone.localtime(app.datetime).strftime("%d/%m/%Y %I:%M %p") if app.datetime else None
                approvals_map[app.transactionno] = {
                    "approvedby": app.approvedby or "Manager",
                    "datetime": app_dt_str
                }
        except Exception as e:
            print("[M-APPROVAL] Warning batch fetching TenantApprovals:", e)

        cards = []
        for row_tuple in raw_rows:
            r = dict(zip(columns, row_tuple))
            rowno = r.get("rowno")
            if not rowno:
                continue

            part_no = str(r.get("PartNo") or "")
            rc_no = f"APL{rowno}|{r.get('cid')}|{part_no}|{r.get('ProcessCode')}"
            is_appr = bool(r.get("IsApproved"))

            # Format dates and times cleanly
            eff_dt = r.get("EffDate")
            eff_dt_str = eff_dt.strftime("%d/%m/%Y") if hasattr(eff_dt, "strftime") else str(eff_dt or "")
            
            used_dt = r.get("UsedDate")
            used_dt_str = used_dt.strftime("%d/%m/%Y") if hasattr(used_dt, "strftime") else str(used_dt or "")
            
            used_tm = r.get("UsedTime")
            used_tm_str = used_tm.strftime("%I:%M %p") if hasattr(used_tm, "strftime") else str(used_tm or "")
            
            cycle_tm = r.get("cycletime")
            cycle_tm_str = cycle_tm.strftime("%H:%M:%S") if hasattr(cycle_tm, "strftime") else str(cycle_tm or "00:00:00")

            appr_by_str = None
            appr_dt_str = None
            if is_appr:
                appr_info = approvals_map.get(part_no)
                if appr_info:
                    appr_by_str = appr_info["approvedby"]
                    appr_dt_str = appr_info["datetime"]
                if not appr_by_str:
                    appr_by_str = "Manager"

            # Query revision details (Detail Modal only)
            revisions = []
            if single_rowno:
                try:
                    rev_query = """
                        SELECT Rate, RevNo, RevDate, EffDate, remarks
                        FROM VenRate_MastRev
                        WHERE cid = ? AND PartNo = ? AND ISNULL(deleted, 0) = 0
                        ORDER BY RevDate DESC, rowno DESC
                    """
                    rev_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(rev_query, [r.get("cid"), part_no])
                            rev_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not rev_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(rev_query, [r.get("cid"), part_no])
                            rev_rows = cursor.fetchall()
                
                    for rev_row in rev_rows:
                        rev_dt = rev_row[2]
                        rev_dt_str = rev_dt.strftime("%d/%m/%Y") if hasattr(rev_dt, "strftime") else str(rev_dt or "")
                        rev_eff = rev_row[3]
                        rev_eff_str = rev_eff.strftime("%d/%m/%Y") if hasattr(rev_eff, "strftime") else str(rev_eff or "")
                        revisions.append({
                            "rate": float(rev_row[0] or 0.0),
                            "revNo": str(rev_row[1] or ""),
                            "revDate": rev_dt_str,
                            "effFrom": rev_eff_str,
                            "remarks": str(rev_row[4] or "")
                        })
                except Exception as rev_ex:
                    print(f"[M-APPROVAL] Revision fetch warning for {rc_no}:", rev_ex)

            cards.append({
                "id": f"vendor_rate:{rc_no}",
                "poNo": rc_no,
                "poDate": eff_dt_str,
                "type": "Vendor Rate Master",
                "status": "Approved" if is_appr else "Pending",
                "vendor": str(r.get("CName") or "Unknown Vendor"),
                "countLabel": "Approval Rate",
                "countVal": float(r.get("Rate") or 0.0),
                "docKind": "vendor_rate",
                "approvedBy": appr_by_str,
                "approvedDateTime": appr_dt_str,
                
                # Metadata
                "partNo": part_no,
                "process": str(r.get("IssueProcess") or r.get("ProcessCode") or "—"),
                "rtnProcess": str(r.get("RtnProcess") or r.get("RtnProcessCode") or "—"),
                "lastModifiedUser": str(r.get("UserName") or "—"),
                "lastModifiedDate": used_dt_str,
                "lastModifiedTime": used_tm_str,
                "lastApprovedUser": appr_by_str or "—",
                "lastApprovedDate": appr_dt_str or "—",
                "lastApprovedTime": "—",
                "currentRate": {
                    "rate": float(r.get("Rate") or 0.0),
                    "ratePerKgs": float(r.get("RatePerKgs") or 0.0),
                    "effDate": eff_dt_str,
                    "cycleTime": cycle_tm_str,
                    "leadDays": int(r.get("ProcLeadDays") or 0),
                    "hsnCode": str(r.get("hsncode") or "—"),
                    "remarks": str(r.get("remarks") or "—")
                },
                "revisions": revisions,
                "items": [
                    {
                        "sNo": 1,
                        "codeNo": part_no,
                        "description": str(r.get("Description") or ""),
                        "process": str(r.get("IssueProcess") or "—"),
                        "uom": "NOS",
                        "qty": 1.0,
                        "rate": float(r.get("Rate") or 0.0),
                        "amount": float(r.get("Rate") or 0.0)
                    }
                ]
            })
        return cards
    except Exception as e:
        print("Error fetching vendor rate masters:", e)
        return []

def fetch_commercial_masters(request=None, from_date="2026-08-01", to_date="2026-08-31", single_cmno=None):
    """
    SQL query handler for Commercial Master.
    Queries Commer_Mas, Commer_BaseRateDet, Commer_TaxDet, Commer_ProcDet, Commer_BuyerDet.
    """
    # Check IsCommerMasApprove setting in CompanySetting table
    is_approve_needed = False
    try:
        setting_query = "SELECT TOP 1 IsCommerMasApprove FROM CompanySetting"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
        
        if setting_rows and setting_rows[0][0]:
            is_approve_needed = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySetting.IsCommerMasApprove:", e)

    if not is_approve_needed:
        return []

    try:
        query = f"""
            DECLARE @FromDate DATE = '{from_date}';
            DECLARE @ToDate   DATE = '{to_date}';

            SELECT
                M.cmno                                       AS [cmno],
                M.cmdt                                       AS [cmdt],
                M.btype                                      AS [btype],
                M.effdt                                      AS [effdt],
                M.PartNo                                     AS [PartNo],
                M.Description                                AS [Description],
                M.uom                                        AS [uom],
                M.WtQty                                      AS [WtQty],
                M.Casting                                    AS [Casting],
                M.Rod                                        AS [Rod],
                M.tariffno                                   AS [tariffno],
                M.tariffheading                              AS [tariffheading],
                M.IsActive                                   AS [IsActive],
                M.cid                                        AS [cid],
                C.CName                                      AS [CName],
                M.delivterms                                 AS [delivterms],
                M.payterms                                   AS [payterms],
                M.splins                                     AS [splins],
                M.qualterms                                  AS [qualterms],
                M.deleted                                    AS [deleted],
                M.IsCt3                                      AS [IsCt3],
                M.SType                                      AS [SType],
                M.IsCt1                                      AS [IsCt1],
                M.prodgroup                                  AS [prodgroup],
                M.dia                                        AS [dia],
                M.roddia                                     AS [roddia],
                M.rodthick                                   AS [rodthick],
                M.UserId                                     AS [UserId],
                M.cmnewno                                    AS [cmnewno],
                M.hsncode                                    AS [hsncode],
                M.hsnheading                                 AS [hsnheading],
                M.brandname                                  AS [brandname],
                M.modelname                                  AS [modelname],
                M.UserName                                   AS [UserName],
                M.UsedDate                                   AS [UsedDate],
                M.UsedTime                                   AS [UsedTime],
                M.SystemName                                 AS [SystemName],
                M.IsApproved                                 AS [IsApproved]
            FROM Commer_Mas M
            LEFT JOIN CustMast C
                   ON M.cid = C.Id
             WHERE ISNULL(M.deleted, 0) = 0
               {f"AND (LTRIM(RTRIM(M.cmno)) = '{single_cmno}' OR M.cmno = '{single_cmno}')" if single_cmno else "AND CAST(M.UsedDate AS DATE) BETWEEN @FromDate AND @ToDate"}
            ORDER BY M.UsedDate DESC, M.cmno DESC
        """

        raw_rows = []
        columns = []

        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query)
                description = cursor.description or []
                columns = [col[0] for col in description]
                raw_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception as ex:
                print("[M-APPROVAL] Tenant DB fetch warning (Commercial Master):", ex)

        if not raw_rows:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(query)
                    description = cursor.description or []
                    columns = [col[0] for col in description]
                    raw_rows = cursor.fetchall()
            except Exception as e:
                print("[M-APPROVAL] Fallback DB fetch warning (Commercial Master):", e)



        # Batch fetch NetRate for listing to prevent N+1 queries
        net_rates_map = {}
        if not single_cmno and raw_rows:
            cmnos = [str(row_tuple[0] or "").strip() for row_tuple in raw_rows if row_tuple[0]]
            if cmnos:
                placeholders = ",".join(["?"] * len(cmnos))
                batch_query = f"""
                    SELECT cmno, NetRate
                    FROM Commer_BaseRateDet
                    WHERE cmno IN ({placeholders}) AND ISNULL(deleted, 0) = 0
                """
                batch_rows = []
                if request:
                    try:
                        conn, _ = get_tenant_connection(request)
                        cursor = conn.cursor()
                        cursor.execute(batch_query, cmnos)
                        batch_rows = cursor.fetchall()
                        cursor.close()
                        conn.close()
                    except Exception:
                        pass
                if not batch_rows:
                    with connection.cursor() as cursor:
                        cursor.execute(batch_query, cmnos)
                        batch_rows = cursor.fetchall()
                
                # Populating the first NetRate for each cmno
                for b_row in batch_rows:
                    b_cmno = str(b_row[0] or "").strip()
                    if b_cmno not in net_rates_map:
                        net_rates_map[b_cmno] = float(b_row[1] or 0.0)

        # Batch fetch approvals to prevent N+1 queries
        approvals_map = {}
        try:
            from .models import TenantApproval
            from django.utils import timezone
            appr_list = TenantApproval.objects.filter(formname="Mapproval")
            for app in list(appr_list):
                app_dt_str = timezone.localtime(app.datetime).strftime("%d/%m/%Y %I:%M %p") if app.datetime else None
                approvals_map[app.transactionno] = {
                    "approvedby": app.approvedby or "Manager",
                    "datetime": app_dt_str
                }
        except Exception as e:
            print("[M-APPROVAL] Warning batch fetching TenantApprovals:", e)

        cards = []
        for row_tuple in raw_rows:
            r = dict(zip(columns, row_tuple))
            cmno = str(r.get("cmno") or "").strip()
            if not cmno:
                continue

            part_no = str(r.get("PartNo") or "").strip()
            is_appr = bool(r.get("IsApproved"))

            # Format dates and times cleanly
            cmdt = r.get("cmdt")
            cmdt_str = cmdt.strftime("%d/%m/%Y") if hasattr(cmdt, "strftime") else str(cmdt or "")
            
            used_dt = r.get("UsedDate")
            used_dt_str = used_dt.strftime("%d/%m/%Y") if hasattr(used_dt, "strftime") else str(used_dt or "")
            
            used_tm = r.get("UsedTime")
            used_tm_str = used_tm.strftime("%I:%M %p") if hasattr(used_tm, "strftime") else str(used_tm or "")

            appr_by_str = None
            appr_dt_str = None
            if is_appr:
                appr_info = approvals_map.get(cmno)
                if appr_info:
                    appr_by_str = appr_info["approvedby"]
                    appr_dt_str = appr_info["datetime"]
                if not appr_by_str:
                    appr_by_str = "Manager"

            base_rates = []
            taxes = []
            processes = []
            buyers = []
            suppliers = []
            first_net_rate = 0.0

            if not single_cmno:
                # Dashboard listing: Use batch-fetched NetRate
                first_net_rate = net_rates_map.get(cmno, 0.0)
            else:
                # 1. Fetch Commer_BaseRateDet (Detail Modal)
                try:
                    base_query = """
                        SELECT cmno, PartNo, BaseRate, BReffdt, deleted, SaleRate, CurrPref, BRCurrRate, NetRate
                        FROM Commer_BaseRateDet
                        WHERE cmno = ? AND ISNULL(deleted, 0) = 0
                    """
                    base_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(base_query, [cmno])
                            base_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not base_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(base_query, [cmno])
                            base_rows = cursor.fetchall()
                    
                    for row in base_rows:
                        br_eff = row[3]
                        br_eff_str = br_eff.strftime("%d/%m/%Y") if hasattr(br_eff, "strftime") else str(br_eff or "")
                        base_rates.append({
                            "baseRate": float(row[2] or 0.0),
                            "currPref": str(row[6] or "INR"),
                            "brCurrRate": float(row[7] or 1.0),
                            "netRate": float(row[8] or 0.0),
                            "brEffDt": br_eff_str,
                            "saleRate": float(row[5] or 0.0)
                        })
                except Exception as e:
                    print(f"[M-APPROVAL] Base Rate fetch error for {cmno}:", e)

                # 2. Fetch Commer_TaxDet
                try:
                    tax_query = """
                        SELECT cmno, PartNo, ttype, tax, stype, surch, addlchrg, addlchrgper, TXeffdt, deleted
                        FROM Commer_TaxDet
                        WHERE cmno = ? AND ISNULL(deleted, 0) = 0
                    """
                    tax_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(tax_query, [cmno])
                            tax_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not tax_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(tax_query, [cmno])
                            tax_rows = cursor.fetchall()
                    
                    for row in tax_rows:
                        tx_eff = row[8]
                        tx_eff_str = tx_eff.strftime("%d/%m/%Y") if hasattr(tx_eff, "strftime") else str(tx_eff or "")
                        taxes.append({
                            "taxType": str(row[2] or ""),
                            "taxPer": float(row[3] or 0.0),
                            "surType": str(row[4] or ""),
                            "surPer": float(row[5] or 0.0),
                            "addlChg": float(row[6] or 0.0),
                            "addlChgPer": float(row[7] or 0.0),
                            "txEffDt": tx_eff_str
                        })
                except Exception as e:
                    print(f"[M-APPROVAL] Tax fetch error for {cmno}:", e)

                # 3. Fetch Commer_ProcDet & ProcessDet (Process Operation mapping)
                try:
                    proc_query = """
                        SELECT P.cmno, P.PartNo, P.Process, P.Rate, P.deleted, P.SaleRate, D.process AS [process_name]
                        FROM Commer_ProcDet P
                        LEFT JOIN ProcessDet D
                               ON P.Process = D.pcode
                              AND ISNULL(D.deleted, 0) = 0
                        WHERE P.cmno = ? AND ISNULL(P.deleted, 0) = 0
                    """
                    proc_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(proc_query, [cmno])
                            proc_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not proc_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(proc_query, [cmno])
                            proc_rows = cursor.fetchall()
                    
                    for row in proc_rows:
                        processes.append({
                            "processCode": str(row[2] or ""),
                            "processName": str(row[6] or row[2] or ""),
                            "rate": float(row[3] or 0.0),
                            "saleRate": float(row[5] or 0.0)
                        })
                except Exception as e:
                    print(f"[M-APPROVAL] Proc fetch error for {cmno}:", e)

                # 4. Fetch Commer_BuyerDet
                try:
                    buyer_query = """
                        SELECT cmno, PartNo, cid, EmailId, deleted, contact
                        FROM Commer_BuyerDet
                        WHERE cmno = ? AND PartNo = ? AND ISNULL(deleted, 0) = 0
                    """
                    buyer_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(buyer_query, [cmno, part_no])
                            buyer_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not buyer_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(buyer_query, [cmno, part_no])
                            buyer_rows = cursor.fetchall()
                    
                    for row in buyer_rows:
                        buyers.append({
                            "contact": str(row[5] or ""),
                            "email": str(row[3] or "")
                        })
                except Exception as e:
                    print(f"[M-APPROVAL] Buyer fetch error for {cmno}:", e)

                # 5. Fetch Commer_CustDet (Supplier Details for Raw Material)
                try:
                    cust_query = """
                        SELECT D.cmno, D.PartNo, D.cid, D.BaseRate, D.Beffdt, D.NetRate, D.Neffdt, C.CName
                        FROM Commer_CustDet D
                        LEFT JOIN CustMast C ON D.cid = C.Id
                        WHERE D.cmno = ? AND ISNULL(D.deleted, 0) = 0
                    """
                    cust_rows = []
                    if request:
                        try:
                            conn, _ = get_tenant_connection(request)
                            cursor = conn.cursor()
                            cursor.execute(cust_query, [cmno])
                            cust_rows = cursor.fetchall()
                            cursor.close()
                            conn.close()
                        except Exception:
                            pass
                    if not cust_rows:
                        with connection.cursor() as cursor:
                            cursor.execute(cust_query, [cmno])
                            cust_rows = cursor.fetchall()
                    
                    for row in cust_rows:
                        suppliers.append({
                            "supplierCode": str(row[2] or ""),
                            "supplierName": str(row[7] or ""),
                            "baseRate": float(row[3] or 0.0),
                            "baseRateEffDate": row[4].strftime("%d/%m/%Y") if row[4] else "—",
                            "netRate": float(row[5] or 0.0),
                            "netRateEffDate": row[6].strftime("%d/%m/%Y") if row[6] else "—"
                        })
                except Exception as e:
                    print(f"[M-APPROVAL] CustDet fetch error for {cmno}:", e)

                if base_rates:
                    first_net_rate = base_rates[0].get("netRate") or 0.0

            cards.append({
                "id": f"commercial:{cmno}",
                "poNo": cmno,
                "poDate": cmdt_str,
                "type": "Commercial Master",
                "status": "Approved" if is_appr else "Pending",
                "vendor": str(r.get("CName") or ""),
                "subType": str(r.get("btype") or "Customer Product"),
                "countLabel": "Approval Rate",
                "countVal": first_net_rate,
                "docKind": "commercial",
                "approvedBy": appr_by_str,
                "approvedDateTime": appr_dt_str,
                "partNo": part_no,
                "hsnCode": str(r.get("hsncode") or ""),
                "hsnHeading": str(r.get("hsnheading") or ""),
                "lastModifiedUser": str(r.get("UserName") or ""),
                "lastModifiedDate": used_dt_str,
                "lastModifiedTime": used_tm_str,
                "baseRates": base_rates,
                "taxes": taxes,
                "processes": processes,
                "buyers": buyers,
                "suppliers": suppliers,
                "delivterms": str(r.get("delivterms") or ""),
                "payterms": str(r.get("payterms") or ""),
                "splins": str(r.get("splins") or ""),
                "qualterms": str(r.get("qualterms") or "")
            })
        return cards
    except Exception as e:
        print("Error fetching commercial masters:", e)
        return []

def fetch_vendor_masters(request=None, from_date="2026-08-01", to_date="2026-08-31", single_id=None):
    """
    SQL query handler for Vendor Master in CustMast table.
    Records need to show only if Id start from "V" alone.
    IsApproveVend=False need to show record in pending else True need to show records in Approved.
    Add condition deleted=0.
    """
    # Check IsApproveVendMast setting in CompanySetting table
    is_approve_needed = False
    try:
        setting_query = "SELECT TOP 1 IsApproveVendMast FROM CompanySetting"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
        
        if setting_rows and setting_rows[0][0]:
            is_approve_needed = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySetting.IsApproveVendMast:", e)

    if not is_approve_needed:
        return []

    try:
        query = """
            SELECT 
                Id, CName, Contact, Group1, Sgroup, Address, Address1, Address2, City, District, State, PinCode, 
                Phone, Fax, Mobile, ACode, Email, Tngst, Cst, Website, Deleted, VenCode, Pricol, WorkOrder, Grin, 
                DcBill, EsiNo, PfNo, CustEntryDate, Dc_Exno, Dc_Pono, Bill_indcno, Bill_DcNo, Bill_PoNo, Bill_ExNo, 
                EccNo, TarrifHeadingNo, SingleItemDc, IsBillRoundOff, ctype, IsInHouseProd, indrejprn, acledgername, 
                AgeDays, IsBillTotAmtRoundOff, IsDelvAddress, acledgerhead, IsPrivateConcern, IsNonActive, printprefix, 
                country, cstype, profilepath, gstino, arnno, statecd, custprefix, gstinunregistered, custremarks, 
                IsNonSez, cgroup, IsAquaBillCust, IsApproveVend, IsApproveSup, UserId, UserName, UsedDate, UsedTime, 
                SystemName, UsrAddFlg, UsrModFlg, IsContractor, VenCodeSort, IsCustPoInvRate, IsStkOrdCust, IsDcApproved, 
                rmacledgerhead, stoacledgerhead, IsRmConvParty, delivterms, payterms, IsRouCardApproved, countrycd, 
                IsOtherTaxIncld
            FROM CustMast
            WHERE Id LIKE 'V%' AND ISNULL(Deleted, 0) = 0
        """
        
        params = []
        if single_id:
            query += " AND Id = ?"
            params.append(single_id)
        else:
            # Date filter using CustEntryDate
            query += " AND CustEntryDate BETWEEN ? AND ?"
            params.extend([from_date, to_date])
            
        rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query, params)
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
                cursor.close()
                conn.close()
            except Exception as e:
                print("Error executing tenant query for vendor masters:", e)
                pass
        
        if not rows:
            with connection.cursor() as cursor:
                db_vendor = connection.vendor
                local_query = query
                if db_vendor != 'microsoft':
                    local_query = query.replace('?', '%s')
                cursor.execute(local_query, params)
                columns = [col[0] for col in cursor.description]
                rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Batch fetch approvals to prevent N+1 queries
        approvals_map = {}
        try:
            from .models import TenantApproval
            from django.utils import timezone
            appr_list = TenantApproval.objects.filter(formname="Mapproval")
            for app in list(appr_list):
                app_dt_str = timezone.localtime(app.datetime).strftime("%d/%m/%Y %I:%M %p") if app.datetime else None
                approvals_map[app.transactionno] = {
                    "approvedby": app.approvedby or "Manager",
                    "datetime": app_dt_str
                }
        except Exception as e:
            print("[M-APPROVAL] Warning batch fetching TenantApprovals:", e)

        cards = []
        for r in rows:
            is_approved = bool(r.get("IsApproveVend"))
            
            # Format Entity Date
            ent_dt = r.get("CustEntryDate")
            ent_dt_str = ent_dt.strftime("%d/%m/%Y") if hasattr(ent_dt, "strftime") else str(ent_dt or "")
            if not ent_dt_str or ent_dt_str == "None":
                ent_dt_str = "—"
                
            used_dt = r.get("UsedDate")
            used_dt_str = used_dt.strftime("%d/%m/%Y") if hasattr(used_dt, "strftime") else str(used_dt or "")
            
            used_tm = r.get("UsedTime")
            used_tm_str = used_tm.strftime("%I:%M %p") if hasattr(used_tm, "strftime") else str(used_tm or "")
            
            # Approved details mapping
            appr_by_str = "—"
            appr_dt_str = "—"
            if is_approved:
                appr_info = approvals_map.get(r.get("Id"))
                if appr_info:
                    appr_by_str = appr_info["approvedby"]
                    appr_dt_str = appr_info["datetime"]
                if not appr_by_str or appr_by_str == "—":
                    appr_by_str = "Manager"
                if not appr_dt_str or appr_dt_str == "—":
                    appr_dt_str = f"{used_dt_str} {used_tm_str}".strip() or "—"
            
            card_item = {
                "id": f"vendor_master:{r.get('Id')}",
                "poNo": r.get("Id"),
                "poDate": ent_dt_str,
                "type": "Vendor Master",
                "status": "Approved" if is_approved else "Pending",
                "vendor": r.get("CName"),
                "countLabel": "GSTIN NO",
                "countVal": r.get("gstino") or "—",
                "docKind": "vendor_master",
                "partNo": r.get("Id"),
                "name": r.get("CName"),
                "entityDate": ent_dt_str,
                "address1": r.get("Address") or "—",
                "address2": r.get("Address1") or "—",
                "address3": r.get("Address2") or "—",
                "city": r.get("City") or "—",
                "state": r.get("State") or "—",
                "stateCode": r.get("statecd") or "—",
                "country": r.get("country") or "—",
                "countryCode": r.get("countrycd") or "—",
                "pincode": r.get("PinCode") or "—",
                "phoneNo": r.get("Phone") or "—",
                "mobileNo": r.get("Mobile") or "—",
                "faxNo": r.get("Fax") or "—",
                "website": r.get("Website") or "—",
                "category": r.get("cstype") or "—",
                "subCategory": r.get("Sgroup") or "—",
                "group": r.get("cgroup") or "—",
                "acLedgerName": r.get("acledgername") or "—",
                "acLedgerHead": r.get("acledgerhead") or "—",
                "remarks": r.get("custremarks") or "—",
                
                # Hidden/Additional details from query for full completeness
                "area": r.get("District") or "—",
                "email": r.get("Email") or "—",
                "vendorCode": r.get("VenCode") or "—",
                "esiNo": r.get("EsiNo") or "—",
                "pfNo": r.get("PfNo") or "—",
                "eccNo": r.get("EccNo") or "—",
                "panNo": r.get("ACode") or "—",
                "ageDays": str(r.get("AgeDays") or "0"),
                "gstinNo": r.get("gstino") or "—",
                "arnNo": r.get("arnno") or "—",
                "rmAcLedgerHead": r.get("rmacledgerhead") or "—",
                "storesAcLedgerHead": r.get("stoacledgerhead") or "—",
                "deliveryTerms": r.get("delivterms") or "—",
                "paymentTerms": r.get("payterms") or "—",
                "netAmtNotRoundOff": bool(r.get("IsBillRoundOff")),
                "nonActive": bool(r.get("IsNonActive")),
                "nonSEZ": bool(r.get("IsNonSez")),
                "gstinUnregistered": bool(r.get("gstinunregistered")),
                "grossAmtNotRoundOff": bool(r.get("IsBillTotAmtRoundOff")),
                "dcCumInvoice": bool(r.get("SingleItemDc")),
                "addlChargesTax": bool(r.get("IsOtherTaxIncld")),
                "approvedBy": appr_by_str,
                "approvedDateTime": appr_dt_str
            }
            cards.append(card_item)
            
        return cards
    except Exception as e:
        print("Error fetching vendor masters:", e)
        return []

def fetch_purchase_indents(request=None, from_date="2026-08-01", to_date="2026-08-31", single_pino=None):
    """
    SQL query handler for Purchase Indents from POInd_Mas, DepartmentMast, and empmaster.
    Filter by pidate in range (or single_pino).
    Show Department and empname by matching codes/ids.
    """
    # Check IsApproveSuppPoInd setting in CompanySetting table
    is_supp_po_ind_approve = False
    try:
        setting_query = "SELECT TOP 1 IsApproveSuppPoInd FROM CompanySetting"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                db_vendor = connection.vendor
                local_setting_query = setting_query
                if db_vendor != 'microsoft':
                    local_setting_query = setting_query.replace('TOP 1', '').replace('TOP 1 ', '') + ' LIMIT 1'
                cursor.execute(local_setting_query)
                setting_rows = cursor.fetchall()

        if setting_rows and setting_rows[0][0]:
            is_supp_po_ind_approve = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySetting.IsApproveSuppPoInd:", e)

    if not is_supp_po_ind_approve:
        return []

    try:
        query = """
            SELECT 
                M.pino,
                M.pidate,
                M.dtype,
                M.deptcode,
                M.empid,
                M.IsApprovePoInd,
                M.UserId,
                M.UserName,
                M.UsedDate,
                M.UsedTime,
                D.Department AS DepartmentName,
                E.empname AS RequestedByName
            FROM POInd_Mas M
            LEFT JOIN DepartmentMast D ON M.deptcode = D.DeptCode AND ISNULL(D.Deleted, 0) = 0
            LEFT JOIN empmaster E ON M.empid = E.empid AND ISNULL(E.deleted, 0) = 0
            WHERE ISNULL(M.deleted, 0) = 0
        """
        
        params = []
        if single_pino:
            query += " AND (LTRIM(RTRIM(M.pino)) = ? OR M.pino = ?)"
            params.extend([single_pino, single_pino])
        else:
            query += " AND M.pidate BETWEEN ? AND ?"
            params.extend([from_date, to_date])
            
        raw_rows = []
        columns = []
        
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query, params)
                desc = cursor.description or []
                columns = [col[0] for col in desc]
                raw_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
                
        if not raw_rows:
            with connection.cursor() as cursor:
                db_vendor = connection.vendor
                local_query = query
                if db_vendor != 'microsoft':
                    local_query = query.replace('?', '%s')
                cursor.execute(local_query, params)
                desc = cursor.description or []
                columns = [col[0] for col in desc]
                raw_rows = cursor.fetchall()

        cards = []
        for row in raw_rows:
            r = dict(zip(columns, row))
            pino = str(r.get("pino") or "").strip()
            pidate = r.get("pidate")
            
            pidate_str = "—"
            if pidate:
                if hasattr(pidate, "strftime"):
                    pidate_str = pidate.strftime("%d/%m/%Y")
                else:
                    pidate_str = str(pidate)

            is_approved = bool(r.get("IsApprovePoInd"))
            status = "Approved" if is_approved else "Pending"
            
            # Fetch the items count for this PI
            count_val = 0
            count_query = "SELECT COUNT(*) FROM POInd_Det WHERE pino = ? AND ISNULL(deleted, 0) = 0"
            count_rows = []
            if request:
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(count_query, [pino])
                    count_rows = cursor.fetchone()
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
            if not count_rows:
                try:
                    with connection.cursor() as cursor:
                        db_vendor = connection.vendor
                        local_count_query = count_query
                        if db_vendor != 'microsoft':
                            local_count_query = count_query.replace('?', '%s')
                        cursor.execute(local_count_query, [pino])
                        count_rows = cursor.fetchone()
                except Exception:
                    pass
            if count_rows:
                count_val = count_rows[0]

            used_dt = r.get("UsedDate")
            used_time = r.get("UsedTime")
            appr_dt_str = "—"
            if used_dt:
                used_dt_str = used_dt.strftime("%d/%m/%Y") if hasattr(used_dt, "strftime") else str(used_dt)
                appr_dt_str = f"{used_dt_str} {str(used_time or '').strip()}"

            cards.append({
                "id": f"purchase_indent:{pino}",
                "poNo": pino,
                "apoNo": pino,
                "poDate": pidate_str,
                "type": "Purchase Indent Approval",
                "poType": str(r.get("dtype") or "Raw Material").strip(),
                "status": status,
                "vendor": "",
                "countLabel": "Indent Items",
                "countVal": count_val,
                "docKind": "purchase_indent",
                "department": str(r.get("DepartmentName") or r.get("deptcode") or "—").strip(),
                "requestedBy": str(r.get("RequestedByName") or r.get("empid") or "—").strip(),
                "indentType": str(r.get("dtype") or "Raw Material").strip(),
                "approvedBy": str(r.get("UserName") or r.get("UserId") or "—").strip() if is_approved else None,
                "approvedDateTime": appr_dt_str if is_approved else None,
                "grossAmt": 0,
                "items": [],
                "schedules": []
            })
            
        return cards
    except Exception as e:
        print("[M-APPROVAL] Error fetching purchase indents:", e)
        return []

def fetch_customer_pos(request=None, from_date="2026-08-01", to_date="2026-08-31", single_apono=None):
    """
    SQL query handler for Customer PO from In_PoMas, In_PoDet, and CustMast.
    Show Name (CName from CustMast matching cid).
    deleted = 0.
    Only runs when IsApproveCustPo = True in CompanySetting.
    """
    # Check IsApproveCustPo setting in CompanySetting table
    is_cust_po_approve = False
    try:
        setting_query = "SELECT TOP 1 IsApproveCustPo FROM CompanySetting"
        setting_rows = []
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception:
                pass
        if not setting_rows:
            with connection.cursor() as cursor:
                cursor.execute(setting_query)
                setting_rows = cursor.fetchall()

        if setting_rows and setting_rows[0][0]:
            is_cust_po_approve = True
    except Exception as e:
        print("[M-APPROVAL] Warning querying CompanySetting.IsApproveCustPo:", e)

    if not is_cust_po_approve:
        return []

    try:
        query = """
            SELECT 
                M.Apono,
                M.pono,
                M.podt,
                M.type,
                M.cid,
                C.CName AS CustomerName
            FROM In_PoMas M
            LEFT JOIN CustMast C ON M.cid = C.Id AND ISNULL(C.Deleted, 0) = 0
            WHERE ISNULL(M.deleted, 0) = 0
        """
        
        params = []
        if single_apono:
            query += " AND (LTRIM(RTRIM(M.Apono)) = ? OR M.Apono = ?)"
            params.extend([single_apono, single_apono])
        else:
            query += " AND M.podt BETWEEN ? AND ?"
            params.extend([from_date, to_date])
            
        raw_rows = []
        columns = []
        
        if request:
            try:
                conn, _ = get_tenant_connection(request)
                cursor = conn.cursor()
                cursor.execute(query, params)
                description = cursor.description or []
                columns = [col[0] for col in description]
                raw_rows = cursor.fetchall()
                cursor.close()
                conn.close()
            except Exception as ex:
                print("[M-APPROVAL] Tenant DB fetch customer pos warning:", ex)
                
        if not raw_rows:
            try:
                with connection.cursor() as cursor:
                    db_vendor = connection.vendor
                    local_query = query
                    if db_vendor != 'microsoft':
                        local_query = query.replace('?', '%s')
                    cursor.execute(local_query, params)
                    description = cursor.description or []
                    columns = [col[0] for col in description]
                    raw_rows = cursor.fetchall()
            except Exception as e:
                print("[M-APPROVAL] Fallback DB fetch customer pos warning:", e)
                
        # Batch fetch approvals to prevent N+1 queries
        approvals_map = {}
        try:
            from .models import TenantApproval
            from django.utils import timezone
            appr_list = TenantApproval.objects.filter(formname="Mapproval")
            for app in list(appr_list):
                app_dt_str = timezone.localtime(app.datetime).strftime("%d/%m/%Y %I:%M %p") if app.datetime else None
                approvals_map[app.transactionno] = {
                    "approvedby": app.approvedby or "Manager",
                    "datetime": app_dt_str
                }
        except Exception as e:
            print("[M-APPROVAL] Warning batch fetching TenantApprovals for Customer PO:", e)

        # Batch fetch line item counts and approved statuses to check overall card status
        po_details_map = {}
        try:
            det_query = """
                SELECT Apono, RowNo, amt, ISNULL(IsApprovePo, 0) AS IsApprovePo
                FROM In_PoDet
                WHERE ISNULL(deleted, 0) = 0
            """
            det_params = []
            if single_apono:
                det_query += " AND Apono = ?"
                det_params.append(single_apono)
            
            det_rows = []
            if request:
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(det_query, det_params)
                    det_desc = cursor.description or []
                    det_cols = [col[0] for col in det_desc]
                    det_rows = [dict(zip(det_cols, row)) for row in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
            if not det_rows:
                try:
                    with connection.cursor() as cursor:
                        db_vendor = connection.vendor
                        local_det_query = det_query
                        if db_vendor != 'microsoft':
                            local_det_query = det_query.replace('?', '%s')
                        cursor.execute(local_det_query, det_params)
                        det_desc = cursor.description or []
                        det_cols = [col[0] for col in det_desc]
                        det_rows = [dict(zip(det_cols, row)) for row in cursor.fetchall()]
                except Exception as e:
                    print("[M-APPROVAL] Fallback DB fetch In_PoDet warning:", e)
                    
            for d in det_rows:
                apono = d["Apono"]
                if apono not in po_details_map:
                    po_details_map[apono] = []
                po_details_map[apono].append(d)
        except Exception as e:
            print("[M-APPROVAL] Warning fetching In_PoDet stats:", e)

        cards = []
        for row_tuple in raw_rows:
            r = dict(zip(columns, row_tuple))
            apono = r.get("Apono")
            po_no = r.get("pono")
            if not apono:
                continue
                
            po_date = r.get("podt")
            po_date_str = po_date.strftime("%d/%m/%Y") if hasattr(po_date, "strftime") else str(po_date or "")
            if not po_date_str or po_date_str == "None":
                po_date_str = "—"
                
            po_items = po_details_map.get(apono, [])
            approved_items = [it for it in po_items if it["IsApprovePo"]]
            pending_items = [it for it in po_items if not it["IsApprovePo"]]
            
            def find_approval_info(apono_val):
                for key, val in approvals_map.items():
                    if key == apono_val or key.startswith(f"{apono_val}:"):
                        return val["approvedby"], val["datetime"]
                return "Manager", None

            # Case 1: Approved card
            if approved_items:
                appr_by_str, appr_dt_str = find_approval_info(apono)
                total_amt = sum(float(it["amt"] or 0.0) for it in approved_items)
                cards.append({
                    "id": f"customer_po:{apono}:Approved",
                    "poNo": po_no,
                    "apoNo": apono,
                    "poDate": po_date_str,
                    "type": "Customer PO",
                    "poType": str(r.get("type") or "Customer PO").strip(),
                    "status": "Approved",
                    "vendor": str(r.get("CustomerName") or "Unknown Customer"),
                    "countLabel": "PO Line Items",
                    "countVal": len(approved_items),
                    "docKind": "customer_po",
                    "approvedBy": appr_by_str,
                    "approvedDateTime": appr_dt_str,
                    "grossAmt": total_amt,
                    "items": [],
                    "schedules": []
                })
                
            # Case 2: Pending card
            if pending_items or not po_items:
                total_amt = sum(float(it["amt"] or 0.0) for it in pending_items)
                cards.append({
                    "id": f"customer_po:{apono}:Pending",
                    "poNo": po_no,
                    "apoNo": apono,
                    "poDate": po_date_str,
                    "type": "Customer PO",
                    "poType": str(r.get("type") or "Customer PO").strip(),
                    "status": "Pending",
                    "vendor": str(r.get("CustomerName") or "Unknown Customer"),
                    "countLabel": "PO Line Items",
                    "countVal": len(pending_items),
                    "docKind": "customer_po",
                    "approvedBy": None,
                    "approvedDateTime": None,
                    "grossAmt": total_amt,
                    "items": [],
                    "schedules": []
                })
            
        return cards
    except Exception as e:
        print("Error fetching customer POs:", e)
        return []

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def mapproval_list(request):
    """
    M-Approval List Endpoint
    Returns Product Route Cards, Vendor Rate Masters, Commercial Masters, Vendor Masters & Customer POs with date range and search filtering.
    """
    from_date = request.GET.get('from_date') or request.GET.get('from') or '2026-08-01'
    to_date = request.GET.get('to_date') or request.GET.get('to') or '2026-08-31'
    search = (request.GET.get('search') or '').strip().lower()

    sql_cards = fetch_product_route_cards(request, from_date, to_date)
    rate_cards = fetch_vendor_rate_masters(request, from_date, to_date)
    comm_cards = fetch_commercial_masters(request, from_date, to_date)
    vendor_cards = fetch_vendor_masters(request, from_date, to_date)
    cust_cards = fetch_customer_pos(request, from_date, to_date)
    indent_cards = fetch_purchase_indents(request, from_date, to_date)
    all_cards = (sql_cards if sql_cards else []) + (rate_cards if rate_cards else []) + (comm_cards if comm_cards else []) + (vendor_cards if vendor_cards else []) + (cust_cards if cust_cards else []) + (indent_cards if indent_cards else [])

    if search:
        filtered = []
        for c in all_cards:
            po_no = str(c.get("poNo") or "").lower()
            vendor = str(c.get("vendor") or "").lower()
            card_type = str(c.get("type") or "").lower()
            if search in po_no or search in vendor or search in card_type:
                filtered.append(c)
        all_cards = filtered

    return Response({"cards": all_cards, "count": len(all_cards)})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def mapproval_stats(request):
    """
    M-Approval Stats Endpoint
    Returns overall statistics for M-Approval workflow.
    """
    from_date = request.GET.get('from_date') or request.GET.get('from') or '2026-08-01'
    to_date = request.GET.get('to_date') or request.GET.get('to') or '2026-08-31'

    sql_cards = fetch_product_route_cards(request, from_date, to_date)
    rate_cards = fetch_vendor_rate_masters(request, from_date, to_date)
    comm_cards = fetch_commercial_masters(request, from_date, to_date)
    vendor_cards = fetch_vendor_masters(request, from_date, to_date)
    cust_cards = fetch_customer_pos(request, from_date, to_date)
    indent_cards = fetch_purchase_indents(request, from_date, to_date)
    cards = (sql_cards if sql_cards else []) + (rate_cards if rate_cards else []) + (comm_cards if comm_cards else []) + (vendor_cards if vendor_cards else []) + (cust_cards if cust_cards else []) + (indent_cards if indent_cards else [])

    total = len(cards)
    approved = 0
    total_val = 0.0
    for c in cards:
        if isinstance(c, dict):
            if c.get("status") == "Approved":
                approved += 1
            # For route cards it's quantity, for vendor rate it's rate
            val = c.get("countVal")
            if isinstance(val, (int, float)):
                total_val += float(val)
    pending = total - approved
    return Response({
        "total_documents": total,
        "approved": approved,
        "pending": pending,
        "total_value": total_val
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def mapproval_detail(request):
    """
    M-Approval Detail Endpoint
    Returns single document details for modal preview.
    """
    invno = request.GET.get('invno', '') or request.GET.get('retissno', '') or request.GET.get('dcno', '') or request.GET.get('roucardno', '')
    doc_kind = request.GET.get('doc_kind', 'route_card')
    from_date = request.GET.get('from_date') or request.GET.get('from') or '2026-08-01'
    to_date = request.GET.get('to_date') or request.GET.get('to') or '2026-08-31'

    cards = []
    if doc_kind == 'commercial':
        cards = fetch_commercial_masters(request, single_cmno=invno)
    elif doc_kind == 'vendor_rate':
        clean_no = invno
        if "vendor_rate:" in clean_no:
            clean_no = clean_no.replace("vendor_rate:", "")
        rowno = None
        if "|" in clean_no:
            try:
                rowno = int(clean_no.split("|")[0].replace("APL", ""))
            except Exception:
                pass
        if rowno is not None:
            cards = fetch_vendor_rate_masters(request, single_rowno=rowno)
        else:
            cards = fetch_vendor_rate_masters(request, from_date, to_date)
    elif doc_kind == 'vendor_master':
        clean_id = invno
        if "vendor_master:" in clean_id:
            clean_id = clean_id.replace("vendor_master:", "")
        cards = fetch_vendor_masters(request, single_id=clean_id)
    elif doc_kind == 'customer_po':
        clean_apono = invno
        if "customer_po:" in clean_apono:
            clean_apono = clean_apono.replace("customer_po:", "")

        status_filter = None
        if ":Approved" in clean_apono:
            status_filter = "Approved"
            clean_apono = clean_apono.replace(":Approved", "")
        elif ":Pending" in clean_apono:
            status_filter = "Pending"
            clean_apono = clean_apono.replace(":Pending", "")

        cards = fetch_customer_pos(request, single_apono=clean_apono)
        card_id_to_find = f"customer_po:{clean_apono}:{status_filter}" if status_filter else None
        found_card = None
        if card_id_to_find:
            found_card = next((c for c in cards if str(c.get("id")) == card_id_to_find), None)
        if not found_card:
            found_card = next((c for c in cards if str(c.get("apoNo")) == clean_apono), None)

        if found_card:
            card = found_card
            # Fetch items
            items_query = """
                SELECT RowNo, icode, itcode, itdesc, uom, Qty, rate, amt, poslno, ISNULL(IsApprovePo, 0) AS IsApprovePo
                FROM In_PoDet
                WHERE Apono = ? AND ISNULL(deleted, 0) = 0
            """
            if status_filter == "Approved":
                items_query += " AND ISNULL(IsApprovePo, 0) = 1"
            elif status_filter == "Pending":
                items_query += " AND ISNULL(IsApprovePo, 0) = 0"
            items_query += " ORDER BY RowNo"

            item_rows = []
            if request:
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(items_query, [clean_apono])
                    desc = cursor.description or []
                    cols = [col[0] for col in desc]
                    item_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
            if not item_rows:
                try:
                    with connection.cursor() as cursor:
                        db_vendor = connection.vendor
                        local_query = items_query
                        if db_vendor != 'microsoft':
                            local_query = items_query.replace('?', '%s')
                        cursor.execute(local_query, [clean_apono])
                        desc = cursor.description or []
                        cols = [col[0] for col in desc]
                        item_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                except Exception as ex:
                    print("[M-APPROVAL] Detail In_PoDet fetch error:", ex)

            # Map items
            mapped_items = []
            for item in item_rows:
                mapped_items.append({
                    "partNo": item.get("icode") or item.get("itcode") or "—",
                    "description": item.get("itdesc"),
                    "qty": float(item.get("Qty") or 0.0),
                    "rate": float(item.get("rate") or 0.0),
                    "amount": float(item.get("amt") or 0.0),
                    "uom": item.get("uom") or "NOS",
                    "poSlNo": item.get("RowNo"),
                    "approved": bool(item.get("IsApprovePo"))
                })
            card["items"] = mapped_items

            # Fetch schedules for displayed items
            displayed_itcodes = [it["partNo"] for it in mapped_items if it["partNo"] != "—"]
            shd_rows = []
            if displayed_itcodes:
                placeholders = ",".join(["?"] * len(displayed_itcodes))
                shd_query = f"""
                    SELECT icode, itcode, shddate, shdQty, reqdate, poslno
                    FROM In_PoDet_ShdQty
                    WHERE Apono = ? AND (itcode IN ({placeholders}) OR icode IN ({placeholders})) AND ISNULL(deleted, 0) = 0
                    ORDER BY shddate
                """
                shd_params = [clean_apono] + displayed_itcodes + displayed_itcodes

                if request:
                    try:
                        conn, _ = get_tenant_connection(request)
                        cursor = conn.cursor()
                        cursor.execute(shd_query, shd_params)
                        desc = cursor.description or []
                        cols = [col[0] for col in desc]
                        shd_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                        cursor.close()
                        conn.close()
                    except Exception:
                        pass
                if not shd_rows:
                    try:
                        with connection.cursor() as cursor:
                            db_vendor = connection.vendor
                            local_query = shd_query
                            if db_vendor != 'microsoft':
                                local_query = shd_query.replace('?', '%s')
                            cursor.execute(local_query, shd_params)
                            desc = cursor.description or []
                            cols = [col[0] for col in desc]
                            shd_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                    except Exception as ex:
                        print("[M-APPROVAL] Detail In_PoDet_ShdQty fetch error:", ex)

            # Map schedules
            mapped_schedules = []
            for shd in shd_rows:
                shd_dt = shd.get("shddate")
                shd_dt_str = shd_dt.strftime("%d/%m/%Y") if hasattr(shd_dt, "strftime") else str(shd_dt or "")
                
                req_dt = shd.get("reqdate")
                req_dt_str = req_dt.strftime("%d/%m/%Y") if hasattr(req_dt, "strftime") else str(req_dt or "")
                
                mapped_schedules.append({
                    "partNo": shd.get("icode") or shd.get("itcode") or "—",
                    "qty": float(shd.get("shdQty") or 0.0),
                    "date": shd_dt_str,
                    "reqDate": req_dt_str,
                    "poSlNo": shd.get("poslno"),
                    "location": ""
                })
            card["schedules"] = mapped_schedules
            
            # Fetch audit logs
            try:
                from .models import TenantApproval
                from django.utils import timezone
                logs = TenantApproval.objects.filter(formname="Mapproval", transactionno=clean_apono).order_by("-datetime")
                audit_logs = []
                for l in list(logs):
                    audit_logs.append({
                        "action": "Approved" if l.approvedby else "Submitted",
                        "user": l.approvedby or "Manager",
                        "datetime": timezone.localtime(l.datetime).strftime("%d/%m/%Y %I:%M %p") if l.datetime else "—",
                        "remarks": "System approved"
                    })
                if not audit_logs:
                    audit_logs.append({
                        "action": "Created PO",
                        "user": card.get("UserName") or "System",
                        "datetime": card.get("poDate") + " 10:00 AM",
                        "remarks": "Initial Release"
                    })
                card["auditLogs"] = audit_logs
            except Exception:
                card["auditLogs"] = [{
                    "action": "Created PO",
                    "user": "System",
                    "datetime": card.get("poDate") + " 10:00 AM",
                    "remarks": "Initial Release"
                }]
    elif doc_kind == 'purchase_indent':
        clean_pino = invno.replace("purchase_indent:", "")
        cards = fetch_purchase_indents(request, single_pino=clean_pino)
        found_card = next((c for c in cards if str(c.get("poNo")) == clean_pino), None)
        if found_card:
            card = found_card
            items_query = """
                SELECT rmname, mattype, dia, uom, qty, QtyKgs
                FROM POInd_Det
                WHERE pino = ? AND ISNULL(deleted, 0) = 0
            """
            item_rows = []
            if request:
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(items_query, [clean_pino])
                    desc = cursor.description or []
                    cols = [col[0] for col in desc]
                    item_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                except Exception:
                    pass
            if not item_rows:
                try:
                    with connection.cursor() as cursor:
                        db_vendor = connection.vendor
                        local_query = items_query
                        if db_vendor != 'microsoft':
                            local_query = items_query.replace('?', '%s')
                        cursor.execute(local_query, [clean_pino])
                        desc = cursor.description or []
                        cols = [col[0] for col in desc]
                        item_rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
                except Exception as ex:
                    print("[M-APPROVAL] Detail POInd_Det fetch error:", ex)

            mapped_items = []
            for item in item_rows:
                mapped_items.append({
                    "rawMaterialName": item.get("rmname") or "—",
                    "materialType": item.get("mattype") or "—",
                    "dia": item.get("dia") or "—",
                    "uom": item.get("uom") or "NOS",
                    "qty": float(item.get("qty") or 0.0),
                    "qtyOthers": float(item.get("QtyKgs") or 0.0)
                })
            card["items"] = mapped_items
            card["schedules"] = []
            
            try:
                from .models import TenantApproval
                from django.utils import timezone
                logs = TenantApproval.objects.filter(formname="Mapproval", transactionno=clean_pino).order_by("-datetime")
                audit_logs = []
                for l in list(logs):
                    audit_logs.append({
                        "action": "Approved" if l.approvedby else "Submitted",
                        "user": l.approvedby or "Manager",
                        "datetime": timezone.localtime(l.datetime).strftime("%d/%m/%Y %I:%M %p") if l.datetime else "—",
                        "remarks": "System approved"
                    })
                if not audit_logs:
                    audit_logs.append({
                        "action": "Created PO Indent",
                        "user": card.get("UserName") or "System",
                        "datetime": card.get("poDate") + " 10:00 AM",
                        "remarks": "Initial Release"
                    })
                card["auditLogs"] = audit_logs
            except Exception:
                card["auditLogs"] = [{
                    "action": "Created PO Indent",
                    "user": "System",
                    "datetime": card.get("poDate") + " 10:00 AM",
                    "remarks": "Initial Release"
                }]
    else:
        cards = fetch_product_route_cards(request, single_roucardno=invno)

    found = next((c for c in cards if str(c.get("poNo")) == invno or str(c.get("id")) == f"{doc_kind}:{invno}" or str(c.get("id")) == invno or (doc_kind == 'customer_po' and c.get("apoNo") == invno.replace("customer_po:", ""))), None)

    if not found:
        return Response({
            "success": False,
            "message": f"Document {invno} not found"
        }, status=404)

    return Response({
        "success": True,
        "card": found
    })

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def mapproval_approve(request):
    """
    M-Approval Approve Endpoint
    Updates RouCardWaitAppr_Mas.IsApproved = 1 OR VenPrdPrcRate_Mast.IsApproved = 1 in SQL Server ERP DB
    and logs approval record in tenants_approvals cloud DB table.
    """
    invno = str(request.data.get('invno') or request.data.get('roucardno') or request.data.get('poNo') or request.data.get('dcno') or request.data.get('retissno') or "").strip()
    doc_kind = str(request.data.get('doc_kind') or request.GET.get('doc_kind') or "").strip().lower()
    if not invno:
        return Response({"success": False, "message": "Document No is required"}, status=400)

    clean_rc = invno.replace("vendor_rate:", "").replace("route_card:", "").replace("commercial:", "").replace("vendor_master:", "").replace("customer_po:", "").replace("purchase_indent:", "").strip()
    is_vendor_rate = (doc_kind == "vendor_rate" or clean_rc.startswith("APL"))
    is_commercial = (doc_kind == "commercial" or invno.startswith("commercial:"))
    is_vendor_master = (doc_kind == "vendor_master" or invno.startswith("vendor_master:"))
    is_customer_po = (doc_kind == "customer_po" or invno.startswith("customer_po:"))
    is_purchase_indent = (doc_kind == "purchase_indent" or invno.startswith("purchase_indent:"))

    cid = None
    part_no = None
    proc_code = None

    if "|" in clean_rc:
        parts = clean_rc.split("|")
        clean_rc = parts[0]
        cid = parts[1]
        part_no = parts[2]
        proc_code = parts[3]

    tenant_id = None
    company_code = None
    user_name = "Manager"
    rc_date = None
    rc_type = "Vendor Master" if is_vendor_master else ("Commercial Master" if is_commercial else ("Vendor Rate Master" if is_vendor_rate else ("Customer PO" if is_customer_po else ("Purchase Indent Approval" if is_purchase_indent else "Product Route Card"))))

    updated = False
    # 1) Attempt update via active tenant DB connection (pyodbc / SQL Server ERP DB)
    try:
        conn, tenant = get_tenant_connection(request)
        if isinstance(tenant, dict):
            tenant_id = tenant.get("tenant_id") or tenant.get("id")
            company_code = tenant.get("company_code") or tenant.get("Companycode")
            user_name = tenant.get("username") or tenant.get("user_id") or "Manager"

        cursor = conn.cursor()
        if is_vendor_rate:
            rowno = int(clean_rc.replace("APL", ""))
            try:
                if cid and part_no and proc_code:
                    cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = ? AND cid = ? AND PartNo = ? AND Process = ?", [rowno, cid, part_no, proc_code])
                else:
                    cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = ?", [rowno])
                r_row = cursor.fetchone()
                if r_row:
                    part_no = r_row[0]
                    rc_date = r_row[1]
            except Exception:
                pass

            if cid and part_no and proc_code:
                cursor.execute(
                    "UPDATE VenPrdPrcRate_Mast SET IsApproved = 1 WHERE rowno = ? AND cid = ? AND PartNo = ? AND Process = ?",
                    [rowno, cid, part_no, proc_code]
                )
            else:
                cursor.execute(
                    "UPDATE VenPrdPrcRate_Mast SET IsApproved = 1 WHERE rowno = ?",
                    [rowno]
                )
        elif is_commercial:
            try:
                cursor.execute("SELECT cmdt FROM Commer_Mas WHERE LTRIM(RTRIM(cmno)) = ? OR cmno = ?", [clean_rc, clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE Commer_Mas SET IsApproved = 1 WHERE LTRIM(RTRIM(cmno)) = ? OR cmno = ?",
                [clean_rc, clean_rc]
            )
        elif is_vendor_master:
            try:
                cursor.execute("SELECT CustEntryDate FROM CustMast WHERE Id = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE CustMast SET IsApproveVend = 1 WHERE Id = ?",
                [clean_rc]
            )
        elif is_customer_po:
            try:
                cursor.execute("SELECT podt FROM In_PoMas WHERE Apono = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            line_approvals = request.data.get("line_approvals")
            if line_approvals is not None and isinstance(line_approvals, list):
                serials = [int(s) for s in line_approvals if str(s).isdigit()]
                if serials:
                    placeholders = ",".join(["?"] * len(serials))
                    cursor.execute(
                        f"UPDATE In_PoDet SET IsApprovePo = 1 WHERE RowNo IN ({placeholders}) AND Apono = ? AND ISNULL(deleted, 0) = 0",
                        serials + [clean_rc]
                    )
                else:
                    cursor.execute(
                        "UPDATE In_PoDet SET IsApprovePo = 0 WHERE Apono = ? AND ISNULL(deleted, 0) = 0",
                        [clean_rc]
                    )
            else:
                cursor.execute(
                    "UPDATE In_PoDet SET IsApprovePo = 1 WHERE Apono = ? AND ISNULL(deleted, 0) = 0",
                    [clean_rc]
                )
        elif is_purchase_indent:
            try:
                cursor.execute("SELECT pidate FROM POInd_Mas WHERE pino = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE POInd_Mas SET IsApprovePoInd = 1 WHERE LTRIM(RTRIM(pino)) = ? OR pino = ?",
                [clean_rc, clean_rc]
            )
        else:
            try:
                cursor.execute("SELECT roucarddt FROM RouCardWaitAppr_Mas WHERE LTRIM(RTRIM(roucardno)) = ? OR roucardno = ?", [clean_rc, clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE RouCardWaitAppr_Mas SET IsApproved = 1 WHERE LTRIM(RTRIM(roucardno)) = ? OR roucardno = ?",
                [clean_rc, clean_rc]
            )
        affected = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[M-APPROVAL] Approved {clean_rc}: {affected} rows updated in ERP DB ({rc_type})")
        updated = True
    except Exception as e:
        print(f"[M-APPROVAL] Tenant DB approve error for {rc_type}:", e)

    # 2) Fallback via django connection
    if not updated:
        try:
            with connection.cursor() as cursor:
                if is_vendor_rate:
                    rowno = int(clean_rc.replace("APL", ""))
                    try:
                        if cid and part_no and proc_code:
                            cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = %s AND cid = %s AND PartNo = %s AND Process = %s", [rowno, cid, part_no, proc_code])
                        else:
                            cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = %s", [rowno])
                        r_row = cursor.fetchone()
                        if r_row:
                            part_no = r_row[0]
                            rc_date = r_row[1]
                    except Exception:
                        pass
                    if cid and part_no and proc_code:
                        cursor.execute(
                            "UPDATE VenPrdPrcRate_Mast SET IsApproved = 1 WHERE rowno = %s AND cid = %s AND PartNo = %s AND Process = %s",
                            [rowno, cid, part_no, proc_code]
                        )
                    else:
                        cursor.execute(
                            "UPDATE VenPrdPrcRate_Mast SET IsApproved = 1 WHERE rowno = %s",
                            [rowno]
                        )
                elif is_commercial:
                    try:
                        cursor.execute("SELECT cmdt FROM Commer_Mas WHERE LTRIM(RTRIM(cmno)) = %s OR cmno = %s", [clean_rc, clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE Commer_Mas SET IsApproved = 1 WHERE LTRIM(RTRIM(cmno)) = %s OR cmno = %s",
                        [clean_rc, clean_rc]
                    )
                elif is_vendor_master:
                    try:
                        cursor.execute("SELECT CustEntryDate FROM CustMast WHERE Id = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE CustMast SET IsApproveVend = 1 WHERE Id = %s",
                        [clean_rc]
                    )
                elif is_customer_po:
                    try:
                        cursor.execute("SELECT podt FROM In_PoMas WHERE Apono = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass

                    line_approvals = request.data.get("line_approvals")
                    if line_approvals is not None and isinstance(line_approvals, list):
                        serials = [int(s) for s in line_approvals if str(s).isdigit()]
                        if serials:
                            placeholders = ",".join(["%s"] * len(serials))
                            cursor.execute(
                                f"UPDATE In_PoDet SET IsApprovePo = 1 WHERE RowNo IN ({placeholders}) AND Apono = %s AND ISNULL(deleted, 0) = 0",
                                serials + [clean_rc]
                            )
                        else:
                            cursor.execute(
                                "UPDATE In_PoDet SET IsApprovePo = 0 WHERE Apono = %s AND ISNULL(deleted, 0) = 0",
                                [clean_rc]
                            )
                    else:
                        cursor.execute(
                            "UPDATE In_PoDet SET IsApprovePo = 1 WHERE Apono = %s AND ISNULL(deleted, 0) = 0",
                            [clean_rc]
                        )
                elif is_purchase_indent:
                    try:
                        cursor.execute("SELECT pidate FROM POInd_Mas WHERE pino = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass

                    cursor.execute(
                        "UPDATE POInd_Mas SET IsApprovePoInd = 1 WHERE LTRIM(RTRIM(pino)) = %s OR pino = %s",
                        [clean_rc, clean_rc]
                    )
                else:
                    cursor.execute(
                        "UPDATE RouCardWaitAppr_Mas SET IsApproved = 1 WHERE LTRIM(RTRIM(roucardno)) = %s OR roucardno = %s",
                        [clean_rc, clean_rc]
                    )
                print(f"[M-APPROVAL] Approved {clean_rc}: {cursor.rowcount} rows updated in fallback DB ({rc_type})")
        except Exception as e:
            print(f"[M-APPROVAL] Fallback DB approve error for {rc_type}:", e)

    # 3) Save to tenants_approvals cloud DB table
    now_dt_str = ""
    if tenant_id and company_code:
        try:
            from django.utils import timezone
            now_dt = timezone.now()
            now_dt_str = timezone.localtime(now_dt).strftime("%d/%m/%Y %I:%M %p")
            
            if is_customer_po:
                # We identify all In_PoDet RowNo values where IsApprovePo = 1
                approved_rows = []
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT RowNo FROM In_PoDet WHERE Apono = ? AND ISNULL(IsApprovePo, 0) = 1 AND ISNULL(deleted, 0) = 0",
                        [clean_rc]
                    )
                    approved_rows = [r[0] for r in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                except Exception:
                    try:
                        with connection.cursor() as cursor:
                            db_vendor = connection.vendor
                            local_q = "SELECT RowNo FROM In_PoDet WHERE Apono = ? AND ISNULL(IsApprovePo, 0) = 1 AND ISNULL(deleted, 0) = 0"
                            if db_vendor != 'microsoft':
                                local_q = local_q.replace('?', '%s')
                            cursor.execute(local_q, [clean_rc])
                            approved_rows = [r[0] for r in cursor.fetchall()]
                    except Exception:
                        pass
                
                # Also find RowNo values where IsApprovePo = 0 to delete their logs (selective approval)
                pending_rows = []
                try:
                    conn, _ = get_tenant_connection(request)
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT RowNo FROM In_PoDet WHERE Apono = ? AND ISNULL(IsApprovePo, 0) = 0 AND ISNULL(deleted, 0) = 0",
                        [clean_rc]
                    )
                    pending_rows = [r[0] for r in cursor.fetchall()]
                    cursor.close()
                    conn.close()
                except Exception:
                    try:
                        with connection.cursor() as cursor:
                            db_vendor = connection.vendor
                            local_q = "SELECT RowNo FROM In_PoDet WHERE Apono = ? AND ISNULL(IsApprovePo, 0) = 0 AND ISNULL(deleted, 0) = 0"
                            if db_vendor != 'microsoft':
                                local_q = local_q.replace('?', '%s')
                            cursor.execute(local_q, [clean_rc])
                            pending_rows = [r[0] for r in cursor.fetchall()]
                    except Exception:
                        pass
                
                for r_no in pending_rows:
                    _log_reversion_bg(tenant_id, company_code, "Mapproval", f"{clean_rc}:{r_no}")
                
                for r_no in approved_rows:
                    _log_approval_bg(tenant_id, company_code, "Mapproval", f"{clean_rc}:{r_no}", rc_date, rc_type, user_name)
                    
            else:
                log_rc = part_no if (is_vendor_rate and part_no) else clean_rc
                _log_approval_bg(tenant_id, company_code, "Mapproval", log_rc, rc_date, rc_type, user_name)
        except Exception as log_err:
            print("[M-APPROVAL] Log approval warning:", log_err)
    if not now_dt_str:
        from django.utils import timezone
        now_dt_str = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M %p")

    return Response({
        "success": True,
        "message": f"{rc_type} {clean_rc} approved (IsApproved = True) successfully",
        "approvedBy": user_name,
        "approvedDateTime": now_dt_str
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def mapproval_modify(request):
    """
    M-Approval Modify Endpoint
    Updates RouCardWaitAppr_Mas.IsApproved = 0 OR VenPrdPrcRate_Mast.IsApproved = 0 in SQL Server ERP DB
    and removes approval record from tenants_approvals cloud DB table.
    """
    invno = str(request.data.get('invno') or request.data.get('roucardno') or request.data.get('poNo') or request.data.get('dcno') or request.data.get('retissno') or "").strip()
    doc_kind = str(request.data.get('doc_kind') or request.GET.get('doc_kind') or "").strip().lower()
    if not invno:
        return Response({"success": False, "message": "Document No is required"}, status=400)

    clean_rc = invno.replace("vendor_rate:", "").replace("route_card:", "").replace("commercial:", "").replace("vendor_master:", "").replace("customer_po:", "").replace("purchase_indent:", "").strip()
    is_vendor_rate = (doc_kind == "vendor_rate" or clean_rc.startswith("APL"))
    is_commercial = (doc_kind == "commercial" or invno.startswith("commercial:"))
    is_vendor_master = (doc_kind == "vendor_master" or invno.startswith("vendor_master:"))
    is_customer_po = (doc_kind == "customer_po" or invno.startswith("customer_po:"))
    is_purchase_indent = (doc_kind == "purchase_indent" or invno.startswith("purchase_indent:"))

    cid = None
    part_no = None
    proc_code = None

    if "|" in clean_rc:
        parts = clean_rc.split("|")
        clean_rc = parts[0]
        cid = parts[1]
        part_no = parts[2]
        proc_code = parts[3]

    rc_type = "Vendor Master" if is_vendor_master else ("Commercial Master" if is_commercial else ("Vendor Rate Master" if is_vendor_rate else ("Customer PO" if is_customer_po else ("Purchase Indent Approval" if is_purchase_indent else "Product Route Card"))))

    tenant_id = None
    company_code = None
    rc_date = None

    updated = False
    # 1) Attempt update via active tenant DB connection (pyodbc / SQL Server ERP DB)
    try:
        conn, tenant = get_tenant_connection(request)
        if isinstance(tenant, dict):
            tenant_id = tenant.get("tenant_id") or tenant.get("id")
            company_code = tenant.get("company_code") or tenant.get("Companycode")

        cursor = conn.cursor()
        if is_vendor_rate:
            rowno = int(clean_rc.replace("APL", ""))
            try:
                if cid and part_no and proc_code:
                    cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = ? AND cid = ? AND PartNo = ? AND Process = ?", [rowno, cid, part_no, proc_code])
                else:
                    cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = ?", [rowno])
                r_row = cursor.fetchone()
                if r_row:
                    part_no = r_row[0]
                    rc_date = r_row[1]
            except Exception:
                pass

            if cid and part_no and proc_code:
                cursor.execute(
                    "UPDATE VenPrdPrcRate_Mast SET IsApproved = 0 WHERE rowno = ? AND cid = ? AND PartNo = ? AND Process = ?",
                    [rowno, cid, part_no, proc_code]
                )
            else:
                cursor.execute(
                    "UPDATE VenPrdPrcRate_Mast SET IsApproved = 0 WHERE rowno = ?",
                    [rowno]
                )
        elif is_commercial:
            try:
                cursor.execute("SELECT cmdt FROM Commer_Mas WHERE LTRIM(RTRIM(cmno)) = ? OR cmno = ?", [clean_rc, clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE Commer_Mas SET IsApproved = 0 WHERE LTRIM(RTRIM(cmno)) = ? OR cmno = ?",
                [clean_rc, clean_rc]
            )
        elif is_vendor_master:
            try:
                cursor.execute("SELECT CustEntryDate FROM CustMast WHERE Id = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE CustMast SET IsApproveVend = 0 WHERE Id = ?",
                [clean_rc]
            )
        elif is_customer_po:
            try:
                cursor.execute("SELECT podt FROM In_PoMas WHERE Apono = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE In_PoDet SET IsApprovePo = 0 WHERE Apono = ? AND ISNULL(deleted, 0) = 0",
                [clean_rc]
            )
        elif is_purchase_indent:
            try:
                cursor.execute("SELECT pidate FROM POInd_Mas WHERE pino = ?", [clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE POInd_Mas SET IsApprovePoInd = 0 WHERE LTRIM(RTRIM(pino)) = ? OR pino = ?",
                [clean_rc, clean_rc]
            )
        else:
            try:
                cursor.execute("SELECT roucarddt FROM RouCardWaitAppr_Mas WHERE LTRIM(RTRIM(roucardno)) = ? OR roucardno = ?", [clean_rc, clean_rc])
                r_row = cursor.fetchone()
                if r_row and r_row[0]:
                    rc_date = r_row[0]
            except Exception:
                pass

            cursor.execute(
                "UPDATE RouCardWaitAppr_Mas SET IsApproved = 0 WHERE LTRIM(RTRIM(roucardno)) = ? OR roucardno = ?",
                [clean_rc, clean_rc]
            )
        affected = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[M-APPROVAL] Reverted {clean_rc}: {affected} rows updated in ERP DB ({rc_type})")
        updated = True
    except Exception as e:
        print(f"[M-APPROVAL] Tenant DB modify error for {rc_type}:", e)

    # 2) Fallback via django connection
    if not updated:
        try:
            with connection.cursor() as cursor:
                if is_vendor_rate:
                    rowno = int(clean_rc.replace("APL", ""))
                    try:
                        if cid and part_no and proc_code:
                            cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = %s AND cid = %s AND PartNo = %s AND Process = %s", [rowno, cid, part_no, proc_code])
                        else:
                            cursor.execute("SELECT PartNo, EffDate FROM VenPrdPrcRate_Mast WHERE rowno = %s", [rowno])
                        r_row = cursor.fetchone()
                        if r_row:
                            part_no = r_row[0]
                            rc_date = r_row[1]
                    except Exception:
                        pass
                    if cid and part_no and proc_code:
                        cursor.execute(
                            "UPDATE VenPrdPrcRate_Mast SET IsApproved = 0 WHERE rowno = %s AND cid = %s AND PartNo = %s AND Process = %s",
                            [rowno, cid, part_no, proc_code]
                        )
                    else:
                        cursor.execute(
                            "UPDATE VenPrdPrcRate_Mast SET IsApproved = 0 WHERE rowno = %s",
                            [rowno]
                        )
                elif is_commercial:
                    try:
                        cursor.execute("SELECT cmdt FROM Commer_Mas WHERE LTRIM(RTRIM(cmno)) = %s OR cmno = %s", [clean_rc, clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE Commer_Mas SET IsApproved = 0 WHERE LTRIM(RTRIM(cmno)) = %s OR cmno = %s",
                        [clean_rc, clean_rc]
                    )
                elif is_vendor_master:
                    try:
                        cursor.execute("SELECT CustEntryDate FROM CustMast WHERE Id = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE CustMast SET IsApproveVend = 0 WHERE Id = %s",
                        [clean_rc]
                    )
                elif is_customer_po:
                    try:
                        cursor.execute("SELECT podt FROM In_PoMas WHERE Apono = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE In_PoDet SET IsApprovePo = 0 WHERE Apono = %s AND ISNULL(deleted, 0) = 0",
                        [clean_rc]
                    )
                elif is_purchase_indent:
                    try:
                        cursor.execute("SELECT pidate FROM POInd_Mas WHERE pino = %s", [clean_rc])
                        r_row = cursor.fetchone()
                        if r_row and r_row[0]:
                            rc_date = r_row[0]
                    except Exception:
                        pass
                    cursor.execute(
                        "UPDATE POInd_Mas SET IsApprovePoInd = 0 WHERE LTRIM(RTRIM(pino)) = %s OR pino = %s",
                        [clean_rc, clean_rc]
                    )
                else:
                    cursor.execute(
                        "UPDATE RouCardWaitAppr_Mas SET IsApproved = 0 WHERE LTRIM(RTRIM(roucardno)) = %s OR roucardno = %s",
                        [clean_rc, clean_rc]
                    )
                print(f"[M-APPROVAL] Reverted {clean_rc}: {cursor.rowcount} rows updated in fallback DB ({rc_type})")
        except Exception as e:
            print(f"[M-APPROVAL] Fallback DB modify error for {rc_type}:", e)

    # 3) Remove from tenants_approvals cloud DB table in background thread
    if tenant_id and company_code:
        log_rc = part_no if (is_vendor_rate and part_no) else clean_rc
        threading.Thread(
            target=_log_reversion_bg,
            args=(
                tenant_id,
                company_code,
                "Mapproval",
                log_rc,
                rc_date,
                rc_type
            )
        ).start()

    return Response({"success": True, "message": f"{rc_type} {clean_rc} moved to pending (IsApproved = False) successfully"})
