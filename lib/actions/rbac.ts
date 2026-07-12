'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'



export async function getRoles(tenantId: string) {
  try {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { userRoles: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    return { success: true, roles }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createRole(tenantId: string, data: { name: string, description: string, baseRoleId?: string }) {
  try {
    if (data.name.toLowerCase() === 'platform_owner') {
      return { success: false, error: 'Cannot create system-reserved roles' }
    }

    let initialPermissions = {}
    
    if (data.baseRoleId) {
      const baseRole = await prisma.role.findUnique({ where: { id: data.baseRoleId } })
      if (baseRole) {
        initialPermissions = baseRole.permissions as Record<string, string[]>
      }
    }

    const role = await prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        permissions: initialPermissions
      }
    })

    if (Object.keys(initialPermissions).length > 0) {
      await syncRolePermissionsRegistry(role.id, initialPermissions)
    }

    revalidatePath('/admin/rbac')
    return { success: true, role }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateRolePermissions(tenantId: string, roleId: string, permissions: any) {
  try {
    const role = await prisma.role.update({
      where: { id: roleId, tenantId },
      data: { permissions }
    })

    // Enforce registry and relational mapping (CONFIG-3)
    await syncRolePermissionsRegistry(roleId, permissions)

    revalidatePath('/admin/rbac')
    return { success: true, role }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function syncRolePermissionsRegistry(roleId: string, permissions: Record<string, string[]>) {
  // Clear existing permissions
  await prisma.tenantRolePermission.deleteMany({
    where: { roleId }
  })

  if (!permissions) return

  const newRolePermissions = []

  for (const [moduleKey, actions] of Object.entries(permissions)) {
    for (const actionKey of (actions as string[])) {
      // Ensure the permission exists in the registry
      const registryEntry = await prisma.tenantPermissionsRegistry.upsert({
        where: {
          moduleKey_actionKey: { moduleKey, actionKey }
        },
        update: {},
        create: {
          moduleKey,
          actionKey,
          description: `Permission to ${actionKey} ${moduleKey}`
        }
      })
      
      newRolePermissions.push({
        roleId,
        permissionId: registryEntry.id
      })
    }
  }

  if (newRolePermissions.length > 0) {
    await prisma.tenantRolePermission.createMany({
      data: newRolePermissions
    })
  }
}
