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

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function toggleTenantModule(tenantId: string, moduleKey: string, isEnabled: boolean) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return { success: false, error: 'Unauthorized: No active user session.' }
    }
    
    if (!(session?.user as any)?.roles?.includes('platform_owner')) {
      return { success: false, error: 'Unauthorized: Platform Owner role required.' }
    }
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
