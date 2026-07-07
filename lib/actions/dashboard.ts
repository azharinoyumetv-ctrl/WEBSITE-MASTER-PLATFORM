'use server'

import prisma from "@/lib/prisma"



export async function getDashboardMetrics(tenantId: string) {
  try {
    const totalOrders = await prisma.tenantOrder.count({ where: { tenantId } })
    const revenueAgg = await prisma.tenantOrder.aggregate({
      where: { tenantId },
      _sum: {
        totalAmount: true
      }
    })
    const revenue = revenueAgg._sum.totalAmount ? Number(revenueAgg._sum.totalAmount) : 0
    
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
    const criticalItems = await prisma.tenantInventoryBalance.findMany({
      where: {
        tenantId,
        status: { in: ['critical', 'low'] }
      },
      take: 5
    })

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
