import logging
from django.db import connection

logger = logging.getLogger(__name__)


def get_or_restore_session_tenant(request, allow_expired=False):
    """
    Get tenant from session and verify that this request's session_key matches
    the single active session for this user (preventing concurrent logins).
    If session is missing, attempt to restore it using fallback headers X-Company-Code
    and X-Username ONLY IF the session has not been superseded by another login.
    """
    from django.core.cache import cache

    tenant = request.session.get("tenant")

    if tenant:
        company_code = str(tenant.get("company_code") or "").strip()
        username = str(tenant.get("username") or "").strip()
        if company_code and username:
            c_code_upper = company_code.upper()
            u_name_upper = username.upper()
            active_session_key = cache.get(f"user_active_session:{c_code_upper}:{u_name_upper}")

            if not active_session_key:
                try:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT session_key FROM tenants_userssession WHERE company_code = %s AND UPPER(username) = UPPER(%s)",
                            [company_code, username],
                        )
                        row = cursor.fetchone()
                        if row and row[0]:
                            active_session_key = row[0]
                            cache.set(f"user_active_session:{c_code_upper}:{u_name_upper}", active_session_key, timeout=86400)
                except Exception:
                    pass

            curr_session_key = request.session.session_key
            if active_session_key and curr_session_key and curr_session_key != active_session_key:
                logger.warning(
                    f"Concurrent login detected: superseded session {curr_session_key} for {username} ({company_code}) blocked."
                )
                try:
                    request.session.flush()
                except Exception:
                    pass
                raise ValueError("Logged in from another device or browser. Please login again.")

    if not tenant:
        company_code = (
            request.headers.get("X-Company-Code")
            or request.META.get("HTTP_X_COMPANY_CODE")
            or ""
        ).strip()
        username = (
            request.headers.get("X-Username")
            or request.META.get("HTTP_X_USERNAME")
            or ""
        ).strip()

        if not company_code or not username:
            company_code = (request.GET.get("company_code") or "").strip()
            username = (request.GET.get("username") or "").strip()

        if company_code and username:
            c_code_upper = company_code.upper()
            u_name_upper = username.upper()
            active_session_key = cache.get(f"user_active_session:{c_code_upper}:{u_name_upper}")
            curr_session_key = request.session.session_key

            # If this user already has an active session elsewhere and this request does not hold that session,
            # NEVER auto-restore a session. The user must log in properly with password.
            if active_session_key and curr_session_key != active_session_key:
                logger.warning(
                    f"Blocked auto-restoration for superseded session ({curr_session_key}) for {username} ({company_code}). Active is {active_session_key}."
                )
                raise ValueError("Logged in from another device or browser. Please login again.")

            try:
                from .models import Tenant
                tenant_obj = Tenant.objects.filter(company_code__iexact=company_code, status=True).first()
                if tenant_obj:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            """
                            SELECT id, designation, issuperadmin, deleted
                            FROM tenants_users
                            WHERE company_code = %s AND UPPER(username) = UPPER(%s) AND deleted = 0
                            """,
                            [tenant_obj.company_code, username],
                        )
                        user_row = cursor.fetchone()
                        if user_row:
                            tenant = {
                                "tenant_id": tenant_obj.id,
                                "erp_server": tenant_obj.erp_server,
                                "erp_database": tenant_obj.erp_database,
                                "erp_user": tenant_obj.erp_user,
                                "erp_password": tenant_obj.erp_password,
                                "erp_port": tenant_obj.erp_port,
                                "company_code": tenant_obj.company_code,
                                "company_name": tenant_obj.company_name,
                                "username": username,
                            }
                            request.session["tenant"] = tenant
                            request.session.modified = True
                            request.session.save()
                            # Ensure active session key is set if missing
                            if not active_session_key and request.session.session_key:
                                cache.set(f"user_active_session:{c_code_upper}:{u_name_upper}", request.session.session_key, timeout=86400)
                            logger.info(
                                f"Auto-restored session for {username} ({tenant_obj.company_code})"
                            )
            except Exception as e:
                logger.error(f"Failed to auto-restore session: {e}")

    if not tenant:
        raise ValueError("Session expired. Please login again.")

    if not allow_expired:
        from .views import is_plan_expired
        company_code = tenant.get("company_code")
        if company_code and is_plan_expired(company_code):
            raise ValueError("Subscription expired. Please renew or upgrade your plan.")

    return tenant

