import prisma from "@/lib/prisma"

export async function requirePermission(userId: string, tenantId: string, moduleKey: string, actionKey: string) {
  if (!userId || !tenantId) {
    throw new Error('Unauthorized: Missing user or tenant context');
  }

  // Cross-tenant super-admin check
  const crossTenantAdmin = await prisma.user.findFirst({
    where: { id: userId, userRoles: { some: { role: { name: 'super-admin' } } } }
  });
  
  if (crossTenantAdmin) {
    return true; // Super admin has access to everything
  }

  // Find roles for this specific user in this specific tenant
  const userRoles = await prisma.tenantUserRole.findMany({
    where: { userId, tenantId },
    include: { role: true }
  });

  if (!userRoles || userRoles.length === 0) {
    throw new Error(`Forbidden: User has no roles in tenant ${tenantId}`);
  }

  // Check if they are a platform-owner for this tenant
  const isPlatformOwner = userRoles.some(ur => ur.role.name === 'platform_owner');
  if (isPlatformOwner) return true;

  // Check if they are an admin
  const isAdmin = userRoles.some(ur => ur.role.name === 'Admin');
  if (isAdmin) return true;

  // Real permission check against TenantRolePermission
  // We check if any of the user's roles have the required permission
  const roleIds = userRoles.map(ur => ur.roleId);
  const permission = await prisma.tenantRolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      permission: {
        moduleKey,
        actionKey
      }
    }
  });

  if (!permission) {
    throw new Error(`Forbidden: User lacks ${moduleKey}:${actionKey} permission for tenant ${tenantId}`);
  }

  return true;
}
