"""
Generic "bundle" runner: execute several DRF sub-views for one HTTP request and
merge their payloads into a single response.

Design constraints (production = 2 vCPU / 4 GB, Passenger single-threaded
workers, high-latency tunnel to the ERP SQL Server):

* Bounded parallelism (default 3 threads) – enough to overlap network waits,
  not enough to thrash the box or open a dozen tunnel sockets at once.
* Each worker thread gets its own request-scoped ERP connection (see
  utils/db.py); all of them are closed once at the end of the bundle.
* Errors are isolated per key so one failing panel does not blank the page.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.db import close_old_connections
from rest_framework.response import Response

from .db import release_request_connections

DEFAULT_BUNDLE_WORKERS = 3


def _run_one(key, view_fn, django_request):
    close_old_connections()
    try:
        resp = view_fn(django_request)
        body = resp.data if hasattr(resp, "data") else {}
        if resp.status_code >= 400 or (isinstance(body, dict) and body.get("error")):
            err = body.get("error") if isinstance(body, dict) else f"HTTP {resp.status_code}"
            return key, None, err
        return key, body, None
    except Exception as exc:  # noqa: BLE001
        return key, None, str(exc)
    finally:
        close_old_connections()


def run_bundle(request, registry, *, max_workers=DEFAULT_BUNDLE_WORKERS, extra=None):
    """
    ``registry``: iterable of ``(key, view_fn)``; ``?keys=a,b`` selects a subset.
    Returns a DRF Response ``{..extra, data: {key: payload}, errors: {key: msg} | None}``.
    """
    keys_param = (request.GET.get("keys") or "").strip()
    django_request = getattr(request, "_request", request)

    # Load the session on the main thread before workers touch it.
    session = getattr(django_request, "session", None)
    if session is not None:
        try:
            session.load()
        except Exception:
            pass

    if keys_param:
        wanted = {k.strip() for k in keys_param.split(",") if k.strip()}
        to_run = [(k, fn) for k, fn in registry if k in wanted]
    else:
        to_run = list(registry)

    payload = dict(extra or {})
    if not to_run:
        payload.update({"data": {}, "errors": {"keys": "No valid bundle keys requested"}})
        return Response(payload)

    data_out, errors_out = {}, {}
    workers = max(1, min(max_workers, len(to_run)))
    try:
        if workers == 1:
            results = [_run_one(k, fn, django_request) for k, fn in to_run]
        else:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = [pool.submit(_run_one, k, fn, django_request) for k, fn in to_run]
                results = [f.result() for f in as_completed(futures)]
    finally:
        release_request_connections(django_request)

    for key, body, err in results:
        if err:
            errors_out[key] = err
            data_out[key] = None
        else:
            data_out[key] = body

    payload.update({"data": data_out, "errors": errors_out or None})
    return Response(payload)
