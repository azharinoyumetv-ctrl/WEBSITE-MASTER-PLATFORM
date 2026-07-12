import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user as { id: string, email: string, tenantId: string, roles: string[] };
}

export async function requireSuperAdmin() {
  const user = await getAuthenticatedUser();
  const crossTenantAdmin = await prisma.user.findFirst({
    where: { 
      id: user.id, 
      userRoles: { 
        some: { 
          role: { name: { equals: 'super-admin', mode: 'insensitive' } } 
        } 
      } 
    }
  });
  
  if (!crossTenantAdmin) {
    throw new Error('Forbidden: Super-admin only');
  }
  return user;
}

export async function requirePermission(userId: string, tenantId: string, moduleKey: string, actionKey: string) {
  if (!userId || !tenantId) {
    throw new Error('Unauthorized: Missing user or tenant context');
  }

  // Cross-tenant super-admin check
  const crossTenantAdmin = await prisma.user.findFirst({
    where: { 
      id: userId, 
      userRoles: { 
        some: { 
          role: { name: { equals: 'super-admin', mode: 'insensitive' } } 
        } 
      } 
    }
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
  const isPlatformOwner = userRoles.some(ur => ur.role.name.toLowerCase() === 'platform_owner' || ur.role.name.toLowerCase() === 'platform owner');
  if (isPlatformOwner) return true;

  // Check if they are an admin
  const isAdmin = userRoles.some(ur => ur.role.name.toLowerCase() === 'admin');
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
    throw new Error(`Forbidden: Missing permission ${moduleKey}:${actionKey}`);
  }

  return true;
}
