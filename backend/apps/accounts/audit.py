from .models import AuditLog


def log_audit(user, action, resource, resource_id="", details=None, request=None):
    ip = None
    if request:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR")
    AuditLog.objects.create(
        user=user,
        action=action,
        resource=resource,
        resource_id=str(resource_id),
        details=details or {},
        ip_address=ip,
    )
