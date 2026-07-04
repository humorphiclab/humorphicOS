from apps.accounts.audit import log_audit


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/v1/") and request.user.is_authenticated:
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                parts = request.path.strip("/").split("/")
                resource = parts[2] if len(parts) > 2 else "unknown"
                log_audit(request.user, request.method.lower(), resource, request=request)
        return response
