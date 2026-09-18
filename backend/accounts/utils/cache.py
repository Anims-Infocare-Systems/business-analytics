# accounts/utils/cache.py
# High-Performance Analytics Query Caching for Business Analytics
import functools
import hashlib
import logging
from django.core.cache import cache
from rest_framework.response import Response

logger = logging.getLogger(__name__)

DEFAULT_ANALYTICS_TTL = 300  # 5 minutes


def _extract_company_code(request):
    """Safely extracts tenant company code from request session or headers."""
    session = getattr(request, "session", None)
    if session:
        tenant = session.get("tenant")
        if isinstance(tenant, dict) and tenant.get("company_code"):
            return str(tenant["company_code"]).strip().upper()

    headers = getattr(request, "headers", None)
    if headers:
        header_code = headers.get("X-Company-Code") or request.META.get("HTTP_X_COMPANY_CODE")
        if header_code:
            return str(header_code).strip().upper()

    get_code = getattr(request, "GET", {}).get("company_code")
    if get_code:
        return str(get_code).strip().upper()

    return "GLOBAL"


def build_analytics_cache_key(prefix, company_code, view_name, query_params):
    """
    Generates a unique, normalized cache key for an analytics endpoint:
    e.g. anims:analytics:VES001:summary_strip:d41d8cd98f00b204e9800998ecf8427e
    """
    sorted_items = sorted(
        (k, str(v)) for k, v in query_params.items() if k not in ("_", "timestamp", "nocache")
    )
    query_str = "&".join(f"{k}={v}" for k, v in sorted_items)
    query_hash = hashlib.md5(query_str.encode("utf-8")).hexdigest()
    return f"{prefix}:{company_code}:{view_name}:{query_hash}"


def cache_analytics_response(timeout=DEFAULT_ANALYTICS_TTL, key_prefix="analytics"):
    """
    Decorator for DRF read-only analytics endpoints.
    Caches the Response data in Redis so subsequent requests from the same tenant
    with identical date/filter parameters return in <5ms without querying MS SQL Server.
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Allow clients to bypass cache if explicitly requested with ?nocache=1
            if request.GET.get("nocache") == "1":
                return view_func(request, *args, **kwargs)

            company_code = _extract_company_code(request)
            view_name = view_func.__name__
            cache_key = build_analytics_cache_key(
                key_prefix, company_code, view_name, request.GET
            )

            try:
                cached_data = cache.get(cache_key)
                if cached_data is not None:
                    # Return cached response instantly
                    return Response(cached_data, status=200)
            except Exception as e:
                logger.warning(f"Cache get failed for {cache_key}: {e}")

            # Execute the actual database query view
            response = view_func(request, *args, **kwargs)

            # Only cache successful HTTP 200 responses with data
            if (
                isinstance(response, Response)
                and response.status_code == 200
                and hasattr(response, "data")
                and response.data is not None
            ):
                try:
                    cache.set(cache_key, response.data, timeout=timeout)
                except Exception as e:
                    logger.warning(f"Cache set failed for {cache_key}: {e}")

            return response
        return wrapper
    return decorator


def get_cached_or_compute(cache_key, compute_func, timeout=DEFAULT_ANALYTICS_TTL):
    """
    Utility for caching internal computations or raw SQL result dictionaries.
    """
    try:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
    except Exception:
        pass

    result = compute_func()

    if result is not None:
        try:
            cache.set(cache_key, result, timeout=timeout)
        except Exception:
            pass

    return result


def invalidate_tenant_analytics_cache(company_code):
    """
    Invalidates all cached analytics query entries for a specific company code.
    Useful when a tenant imports new ERP data or updates settings.
    """
    if not company_code:
        return
    code = str(company_code).strip().upper()
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern(f"*analytics:{code}:*")
            cache.delete_pattern(f"*plant_perf:{code}:*")
            cache.delete_pattern(f"*dash1*:{code}:*")
            cache.delete_pattern(f"*dash2*:{code}:*")
            cache.delete_pattern(f"*pa:{code}:*")
            cache.delete_pattern(f"*qa:{code}:*")
    except Exception as e:
        logger.warning(f"Failed to invalidate pattern cache for {code}: {e}")


def invalidate_user_rights_cache(company_code, username=None):
    """
    Invalidates cached user rights for a specific user or all users in a tenant company.
    """
    if not company_code:
        return
    code = str(company_code).strip().upper()
    try:
        if username:
            u = str(username).strip().upper()
            cache.delete(f"user_rights_me:{code}:{u}")
        else:
            if hasattr(cache, "delete_pattern"):
                cache.delete_pattern(f"*user_rights_me:{code}:*")
    except Exception as e:
        logger.warning(f"Failed to invalidate user rights cache: {e}")


def invalidate_approval_cache(prefix="eapproval", company_code=None):
    """
    Invalidates cached approval stats for eapproval, tapproval, or mapproval.
    """
    try:
        if hasattr(cache, "delete_pattern"):
            if company_code:
                code = str(company_code).strip().upper()
                cache.delete_pattern(f"*{prefix}*:{code}:*")
            else:
                cache.delete_pattern(f"*{prefix}*:*")
    except Exception as e:
        logger.warning(f"Failed to invalidate approval cache: {e}")
