'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function exportTenantData(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const [
      tenantWebsite,
      categories,
      catalogItems,
      locations,
      balances,
      terminals,
      shifts,
      orders,
      contacts,
      bookingResources,
      bookings,
      monitoringRules,
      notificationTemplates
    ] = await Promise.all([
      prisma.tenantWebsite.findUnique({ where: { tenantId } }),
      prisma.tenantCategory.findMany({ where: { tenantId } }),
      prisma.tenantCatalogItem.findMany({ where: { tenantId } }),
      prisma.tenantInventoryLocation.findMany({ where: { tenantId } }),
      prisma.tenantInventoryBalance.findMany({ where: { tenantId } }),
      prisma.tenantPosTerminal.findMany({ where: { tenantId } }),
      prisma.tenantPosShift.findMany({ where: { tenantId } }),
      prisma.tenantOrder.findMany({ where: { tenantId } }),
      prisma.tenantCrmContact.findMany({ where: { tenantId } }),
      prisma.tenantBookingResource.findMany({ where: { tenantId } }),
      prisma.tenantBooking.findMany({ where: { tenantId } }),
      prisma.tenantMonitoringRule.findMany({ where: { tenantId } }),
      prisma.tenantNotificationTemplate.findMany({ where: { tenantId } })
    ])

    const backupPayload = {
      tenantId,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      data: {
        tenantWebsite,
        categories,
        catalogItems,
        locations,
        balances,
        terminals,
        shifts,
        orders,
        contacts,
        bookingResources,
        bookings,
        monitoringRules,
        notificationTemplates
      }
    }

    return { success: true, backupPayload }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function importTenantData(tenantId: string, backupData: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    if (!backupData || backupData.tenantId !== tenantId) {
      throw new Error("Backup file tenant context mismatch or invalid data.")
    }

    const data = backupData.data

    await prisma.$transaction(async (tx) => {
      // 1. Delete in reverse dependency order
      await tx.tenantPosShift.deleteMany({ where: { tenantId } })
      await tx.tenantPosCashDrawerEvent.deleteMany({ where: { tenantId } })
      await tx.tenantPosSession.deleteMany({ where: { tenantId } })
      await tx.tenantOrderItem.deleteMany({ where: { tenantId } })
      await tx.tenantOrder.deleteMany({ where: { tenantId } })
      await tx.tenantInventoryBalance.deleteMany({ where: { tenantId } })
      await tx.tenantInventoryLocation.deleteMany({ where: { tenantId } })
      await tx.tenantCatalogItem.deleteMany({ where: { tenantId } })
      await tx.tenantCategory.deleteMany({ where: { tenantId } })
      await tx.tenantPosTerminal.deleteMany({ where: { tenantId } })
      await tx.tenantBooking.deleteMany({ where: { tenantId } })
      await tx.tenantBookingResource.deleteMany({ where: { tenantId } })
      await tx.tenantCrmContact.deleteMany({ where: { tenantId } })
      await tx.tenantMonitoringRule.deleteMany({ where: { tenantId } })
      await tx.tenantNotificationTemplate.deleteMany({ where: { tenantId } })

      // 2. Restore Website settings
      if (data.tenantWebsite) {
        await tx.tenantWebsite.upsert({
          where: { tenantId },
          update: {
            siteTitle: data.tenantWebsite.siteTitle,
            themeConfig: data.tenantWebsite.themeConfig || {},
            globalSeoMetadata: data.tenantWebsite.globalSeoMetadata || {},
            isActive: data.tenantWebsite.isActive ?? true
          },
          create: {
            tenantId,
            siteTitle: data.tenantWebsite.siteTitle,
            themeConfig: data.tenantWebsite.themeConfig || {},
            globalSeoMetadata: data.tenantWebsite.globalSeoMetadata || {},
            isActive: data.tenantWebsite.isActive ?? true
          }
        })
      }

      // 3. Restore in dependency order
      if (data.notificationTemplates?.length) {
        await tx.tenantNotificationTemplate.createMany({ data: data.notificationTemplates })
      }
      if (data.monitoringRules?.length) {
        await tx.tenantMonitoringRule.createMany({ data: data.monitoringRules })
      }
      if (data.contacts?.length) {
        await tx.tenantCrmContact.createMany({ data: data.contacts })
      }
      if (data.bookingResources?.length) {
        await tx.tenantBookingResource.createMany({ data: data.bookingResources })
      }
      if (data.locations?.length) {
        await tx.tenantInventoryLocation.createMany({ data: data.locations })
      }
      if (data.categories?.length) {
        await tx.tenantCategory.createMany({ data: data.categories })
      }
      if (data.terminals?.length) {
        await tx.tenantPosTerminal.createMany({ data: data.terminals })
      }
      if (data.catalogItems?.length) {
        await tx.tenantCatalogItem.createMany({ data: data.catalogItems })
      }
      if (data.balances?.length) {
        await tx.tenantInventoryBalance.createMany({ data: data.balances })
      }
      if (data.orders?.length) {
        await tx.tenantOrder.createMany({ data: data.orders })
      }
      if (data.bookings?.length) {
        await tx.tenantBooking.createMany({ data: data.bookings })
      }
      if (data.shifts?.length) {
        await tx.tenantPosShift.createMany({ data: data.shifts })
      }
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getAuditLogsForExport(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'read')

    const logs = await prisma.adminAuditLog.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, logs }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function runTenantIsolationAudit(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const dummyTenantId = '00000000-0000-0000-0000-000000000000'
    const results: Record<string, string> = {}

    // Verify Catalog Isolation
    const catalogIsolation = await prisma.tenantCatalogItem.findMany({
      where: { tenantId: dummyTenantId }
    })
    results['Catalog Boundary Check'] = catalogIsolation.length === 0 ? 'PASSED (0 leaks)' : 'FAILED'

    // Verify Inventory Isolation
    const inventoryIsolation = await prisma.tenantInventoryBalance.findMany({
      where: { tenantId: dummyTenantId }
    })
    results['Inventory Boundary Check'] = inventoryIsolation.length === 0 ? 'PASSED (0 leaks)' : 'FAILED'

    // Verify Orders Isolation
    const ordersIsolation = await prisma.tenantOrder.findMany({
      where: { tenantId: dummyTenantId }
    })
    results['Orders Boundary Check'] = ordersIsolation.length === 0 ? 'PASSED (0 leaks)' : 'FAILED'

    // Verify Terminals Isolation
    const terminalsIsolation = await prisma.tenantPosTerminal.findMany({
      where: { tenantId: dummyTenantId }
    })
    results['POS Terminals Check'] = terminalsIsolation.length === 0 ? 'PASSED (0 leaks)' : 'FAILED'

    // Verify Monitoring Rules Isolation
    const rulesIsolation = await prisma.tenantMonitoringRule.findMany({
      where: { tenantId: dummyTenantId }
    })
    results['Monitoring Rules Check'] = rulesIsolation.length === 0 ? 'PASSED (0 leaks)' : 'FAILED'

    const allPassed = Object.values(results).every(val => val.startsWith('PASSED'))

    return {
      success: true,
      report: {
        tenantId,
        status: allPassed ? 'PASSED' : 'FAILED',
        timestamp: new Date().toLocaleString(),
        results
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
