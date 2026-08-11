def check_mapproval_settings(tenant):
    from accounts.views import get_connection
    # Extract connection credentials depending on type
    if isinstance(tenant, dict):
        server = tenant.get("erp_server")
        database = tenant.get("erp_database")
        username = tenant.get("erp_user")
        password = tenant.get("erp_password")
        port = tenant.get("erp_port") or 1433
    else:
        server = tenant.erp_server
        database = tenant.erp_database
        username = tenant.erp_user
        password = tenant.erp_password
        port = tenant.erp_port or 1433

    if not server or not database:
        return True

    try:
        conn = get_connection(server, database, username, password, port)
        cursor = conn.cursor()
        
        # 1. Check CompanySetting fields
        is_roucard = False
        is_comm = False
        is_vend_mast = False
        is_cust_po = False
        is_supp_po_ind = False
        try:
            cursor.execute("SELECT TOP 1 IsRouCardApprove, IsCommerMasApprove, IsApproveVendMast, IsApproveCustPo, IsApproveSuppPoInd FROM CompanySetting")
            row = cursor.fetchone()
            if row:
                is_roucard = bool(row[0])
                is_comm = bool(row[1])
                is_vend_mast = bool(row[2])
                is_cust_po = bool(row[3])
                is_supp_po_ind = bool(row[4])
        except Exception:
            # Safe sequential fallback queries
            try:
                cursor.execute("SELECT TOP 1 IsRouCardApprove, IsCommerMasApprove, IsApproveVendMast FROM CompanySetting")
                row = cursor.fetchone()
                if row:
                    is_roucard = bool(row[0])
                    is_comm = bool(row[1])
                    is_vend_mast = bool(row[2])
            except Exception:
                pass

            try:
                cursor.execute("SELECT TOP 1 IsApproveCustPo FROM CompanySetting")
                row = cursor.fetchone()
                if row:
                    is_cust_po = bool(row[0])
            except Exception:
                pass

            try:
                cursor.execute("SELECT TOP 1 IsApproveSuppPoInd FROM CompanySetting")
                row = cursor.fetchone()
                if row:
                    is_supp_po_ind = bool(row[0])
            except Exception:
                pass
            
        # 2. Check IsVendRateMast in CompanySettingFeatures
        is_vend = False
        try:
            cursor.execute("SELECT TOP 1 IsVendRateMast FROM CompanySettingFeatures")
            row = cursor.fetchone()
            if row:
                is_vend = bool(row[0])
        except Exception:
            pass
            
        cursor.close()
        conn.close()
        return (is_roucard or is_comm or is_vend_mast or is_vend or is_cust_po or is_supp_po_ind)
    except Exception as e:
        print("[M-APPROVAL-SETTINGS] Error checking settings:", e)
        # In case of DB query error/unavailable, default to True so we don't break menu
        return True
