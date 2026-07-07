'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'

export async function getFeatureFlags(tenantId: string) {
  try {
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
        rolloutPercentage: override ? override.rolloutPercentage : 100,
        tenantState: override ? override.isEnabled : sf.defaultState
      }
    })

    return { success: true, flags }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleFeatureFlag(tenantId: string, flagId: string, currentState: boolean) {
  try {
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
      }
    })
    revalidatePath('/admin/feature-flags')
    return { success: true, flag }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
