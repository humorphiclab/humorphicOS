export interface PermissionEntry {
  resource: string;
  action: string;
}

export interface PermissionsPayload {
  role: { id: number; name: string; slug: string; is_leadership: boolean } | null;
  permissions: PermissionEntry[];
  is_leadership: boolean;
}

export function hasPermission(
  perms: PermissionEntry[] | undefined,
  resource: string,
  action = "read"
): boolean {
  if (!perms?.length) return false;
  if (perms.some((p) => p.resource === "*" && p.action === "*")) return true;
  return perms.some((p) => p.resource === resource && p.action === action);
}

export function canAccessNav(
  perms: PermissionEntry[] | undefined,
  resource: string,
  isLeadership?: boolean
): boolean {
  if (isLeadership && ["analytics", "reports", "organizations", "audit-logs"].includes(resource)) {
    return true;
  }
  return hasPermission(perms, resource, "read");
}
