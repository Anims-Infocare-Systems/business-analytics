"""Admin API uses X-Admin-Token — avoid Django session save races on /api/admin/*."""

class AdminSessionGuardMiddleware:
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
