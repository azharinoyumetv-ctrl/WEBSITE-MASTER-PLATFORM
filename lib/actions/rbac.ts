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

    revalidatePath('/admin/rbac')
    return { success: true, role }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
