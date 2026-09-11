import logging
from django.db import connection

logger = logging.getLogger(__name__)


def get_or_restore_session_tenant(request, allow_expired=False):
    """
    Get tenant from session. If session is missing (e.g. mobile browser changed
    User-Agent or reloaded in Desktop View and dropped/delayed cookie), attempt
    to restore session using fallback authentication headers X-Company-Code
    and X-Username sent by the frontend.
    """
    tenant = request.session.get("tenant")

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
