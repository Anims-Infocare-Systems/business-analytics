def check_eapproval_settings(tenant):
    """
    Checks if E-Approval Workflow should be shown for this tenant based on
    CompanySetting.IsApproveSuppPo = 1 or True.
    Returns True only if IsApproveSuppPo is enabled (1 / True), else False.
    """
    from accounts.views import get_connection
    from django.core.cache import cache

    # Extract connection credentials and company code depending on type
    if isinstance(tenant, dict):
        server = tenant.get("erp_server")
        database = tenant.get("erp_database")
        username = tenant.get("erp_user")
        password = tenant.get("erp_password")
        port = tenant.get("erp_port") or 1433
        company_code = str(tenant.get("company_code") or "").strip().upper()
    else:
        server = getattr(tenant, "erp_server", None)
        database = getattr(tenant, "erp_database", None)
        username = getattr(tenant, "erp_user", None)
        password = getattr(tenant, "erp_password", None)
        port = getattr(tenant, "erp_port", None) or 1433
        company_code = str(getattr(tenant, "company_code", "") or "").strip().upper()

    cache_key = f"eapproval_settings:{company_code}" if company_code else None
    if cache_key:
        try:
            cached = cache.get(cache_key)
            if cached is not None:
                return bool(cached)
        except Exception:
            pass

    if not server or not database:
        return False

    try:
        conn = get_connection(server, database, username, password, port)
        cursor = conn.cursor()

        is_approve_supp_po = False
        try:
            cursor.execute("SELECT TOP 1 ISNULL(IsApproveSuppPo, 0) FROM CompanySetting")
            row = cursor.fetchone()
            if row is not None:
                is_approve_supp_po = bool(row[0])
        except Exception:
            try:
                cursor.execute("SELECT TOP 1 ISNULL(IsApproveSuppPo, 0) FROM CompanySettingFeatures")
                row = cursor.fetchone()
                if row is not None:
                    is_approve_supp_po = bool(row[0])
            except Exception:
                pass

        cursor.close()
        conn.close()

        result = is_approve_supp_po
        if cache_key:
            try:
                cache.set(cache_key, result, timeout=1800)
            except Exception:
                pass
        return result
    except Exception as e:
        print("[E-APPROVAL-SETTINGS] Error checking settings:", e)
        return False
