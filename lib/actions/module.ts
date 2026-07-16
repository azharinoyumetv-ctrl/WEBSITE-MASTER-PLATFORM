'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'



export async function getTenantModules(tenantId: string) {
  try {
    const modules = await prisma.tenantModule.findMany({
      where: { tenantId }
    })
    return { success: true, modules }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

import { getAuthenticatedUser, requirePermission } from '@/lib/rbac'

export async function toggleTenantModule(tenantId: string, moduleKey: string, isEnabled: boolean) {
  try {
    if (moduleKey === 'whatsapp_module') {
      return { success: false, error: 'WhatsApp Business is provisioned only through the selected project add-on.' }
    }
    const user = await getAuthenticatedUser()
    const userId = user.id

    await requirePermission(userId, tenantId, 'system', 'manage')
    const record = await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey
        }
      },
      update: {
        isEnabled,
        activatedAt: isEnabled ? new Date() : null
      },
      create: {
        tenantId,
        moduleKey,
        isEnabled,
        activatedAt: isEnabled ? new Date() : null
      }
    })

    // Log the action
    await prisma.adminAuditLog.create({
      data: {
        tenantId,
        userId: userId,
        actionPerformed: isEnabled ? 'module_activated' : 'module_deactivated',
        targetResource: moduleKey,
        ipAddress: '127.0.0.1'
      }
    })

    revalidatePath('/admin/modules')
    revalidatePath('/admin/dashboard')
    
    return { success: true, module: record }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
