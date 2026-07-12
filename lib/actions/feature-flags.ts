'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getFeatureFlags(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'read')

    const systemFlags = await prisma.systemFeatureFlag.findMany({
      orderBy: { flagKey: 'asc' }
    })

    const overrides = await prisma.tenantFeatureOverride.findMany({
      where: { tenantId }
    })

    const flags = systemFlags.map(sf => {
      const override = overrides.find(o => o.flagId === sf.id)
      return {
        id: sf.id,
        flagKey: sf.flagKey,
        description: sf.description,
        defaultState: sf.defaultState,
        environment: sf.environment,
        rolloutPercentage: override ? override.rolloutPercentage : 100,
        tenantState: override ? override.isEnabled : sf.defaultState
      }
    })

    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        tenantId,
        actionPerformed: { in: ['feature_flag_toggle', 'feature_flag_rollout_update'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return { success: true, flags, auditLogs }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleFeatureFlag(tenantId: string, flagId: string, currentState: boolean) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const flag = await prisma.tenantFeatureOverride.upsert({
      where: {
        tenantId_flagId: { tenantId, flagId }
      },
      update: {
        isEnabled: !currentState
      },
      create: {
        tenantId,
        flagId,
        isEnabled: !currentState,
        rolloutPercentage: 100
      },
      include: {
        flag: true
      }
    })

    await prisma.adminAuditLog.create({
      data: {
        tenantId,
        userId: user.id,
        actionPerformed: 'feature_flag_toggle',
        targetResource: `feature_flag:${flag.flag.flagKey}`,
        ipAddress: '127.0.0.1',
        payloadChanges: {
          from: currentState,
          to: !currentState
        }
      }
    })

    revalidatePath('/admin/feature-flags')
    return { success: true, flag }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateFeatureFlagRollout(tenantId: string, flagId: string, rolloutPercentage: number) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const flag = await prisma.tenantFeatureOverride.upsert({
      where: {
        tenantId_flagId: { tenantId, flagId }
      },
      update: {
        rolloutPercentage
      },
      create: {
        tenantId,
        flagId,
        isEnabled: false,
        rolloutPercentage
      },
      include: {
        flag: true
      }
    })

    await prisma.adminAuditLog.create({
      data: {
        tenantId,
        userId: user.id,
        actionPerformed: 'feature_flag_rollout_update',
        targetResource: `feature_flag:${flag.flag.flagKey}`,
        ipAddress: '127.0.0.1',
        payloadChanges: {
          rolloutPercentage
        }
      }
    })

    revalidatePath('/admin/feature-flags')
    return { success: true, flag }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
