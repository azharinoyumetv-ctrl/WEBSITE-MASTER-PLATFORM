'use server'

import prisma from "@/lib/prisma"
import type { OrderStatus } from '@prisma/client'



export async function getDashboardMetrics(tenantId: string) {
  try {
    const totalOrders = await prisma.tenantOrder.count({ where: { tenantId } })
    const completedOrderStatuses: OrderStatus[] = ['paid', 'pending_fulfillment', 'processing', 'shipped', 'completed']
    const revenueAgg = await prisma.tenantOrder.aggregate({
      where: { tenantId, orderStatus: { in: completedOrderStatuses } },
      _sum: {
        totalAmount: true
      }
    })
    const revenue = revenueAgg._sum?.totalAmount ? Number(revenueAgg._sum.totalAmount) : 0
    
    // Recent audit logs
    const recentLogs = await prisma.adminAuditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    })

    const formattedLogs = recentLogs.map(log => ({
      id: log.id,
      userName: log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'System',
      actionPerformed: log.actionPerformed,
      targetResource: log.targetResource,
      createdAt: log.createdAt
    }))

    // Recent orders
    const recentOrders = await prisma.tenantOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 4
    })

    // Inventory alerts
    const criticalBalances = await prisma.tenantInventoryBalance.findMany({
      where: {
        tenantId,
        quantityOnHand: { lte: 5 }
      },
      include: {
        catalogItem: { select: { title: true } }
      },
      take: 5
    })

    const criticalItems = criticalBalances.map(b => ({
      id: b.id,
      itemTitle: b.catalogItem?.title || 'Unknown Item',
      quantityOnHand: b.quantityOnHand,
      status: b.quantityOnHand <= 0 ? 'critical' : 'low'
    }))

    // Enabled modules
    const modules = await prisma.tenantModule.findMany({
      where: { tenantId }
    })

    return { 
      success: true, 
      metrics: {
        totalOrders,
        revenue,
        recentLogs: formattedLogs,
        recentOrders,
        criticalItems,
        modules
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateDashboardWidgets(tenantId: string, userId: string, widgets: Record<string, boolean>) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true }
    })
    
    if (!user) throw new Error("User not found")
    
    const existingPrefs = user.profile?.preferences ? (user.profile.preferences as any) : {}
    const newPrefs = { ...existingPrefs, dashboardWidgets: widgets }
    
    await prisma.tenantUserProfile.upsert({
      where: { userId },
      update: { preferences: newPrefs },
      create: { 
        userId, 
        tenantId, 
        preferences: newPrefs,
        phoneNumber: '' 
      }
    })
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
