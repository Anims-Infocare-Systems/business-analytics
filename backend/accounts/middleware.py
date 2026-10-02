"""Request-level middleware for the accounts API."""


class AdminSessionGuardMiddleware:
    """Admin API uses X-Admin-Token — avoid Django session save races on /api/admin/*."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/admin/"):
            request._skip_session_save = True
            request.session.modified = False
        response = self.get_response(request)
        if getattr(request, "_skip_session_save", False):
            request.session.modified = False
        return response


class ErpConnectionReleaseMiddleware:
    """
    Closes the request-scoped tenant ERP connections opened via
    ``accounts.utils.db.get_request_scoped_connection`` once the response is built.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        finally:
            from .utils.db import release_request_connections
            release_request_connections(request)
