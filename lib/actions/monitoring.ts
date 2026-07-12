'use server'

import prisma from "@/lib/prisma"
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getMonitoringStatus(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    let dbStatus = 'down'
    let dbLatency = '0ms'
    let dbConnections = 0
    const startTime = Date.now()

    try {
      const [{ active_connections }] = await prisma.$queryRaw<any[]>`SELECT count(*) as active_connections FROM pg_stat_activity`
      dbStatus = 'up'
      dbLatency = `${Date.now() - startTime}ms`
      dbConnections = Number(active_connections)
    } catch (error) {
      dbStatus = 'down'
    }

    const nextjsLatency = `${Date.now() - startTime}ms`

    const alerts = await prisma.tenantIncidentLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    const formattedAlerts = alerts.length > 0 ? alerts.map(a => ({
      id: a.id,
      severity: a.status === 'investigating' ? 'WARNING' : (a.status === 'resolved' ? 'NOTICE' : 'CRITICAL'),
      message: a.title,
      service: a.serviceName,
      timestamp: a.createdAt.toISOString(),
      resolved: a.status === 'resolved'
    })) : []

    const activeSessions = await prisma.tenantPosSession.count({ where: { status: 'open' } })
    const activeOrders = await prisma.tenantOrder.count({ where: { orderStatus: 'pending' } })
    
    return {
      success: true,
      monitoring: {
        systemStatus: dbStatus === 'up' ? 'healthy' : 'degraded',
        nodes: [
          { service: 'postgres_rls', status: dbStatus, connections: dbConnections, uptime: '99.99%', latency: dbLatency },
          { service: 'nextjs_edge', status: 'up', connections: activeSessions, uptime: '100%', latency: nextjsLatency }
        ],
        alertHistory: formattedAlerts,
        liveMetrics: {
          activeSessions,
          activeOrders
        }
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function logIncident(tenantId: string, data: { title: string, description: string, serviceName: string }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const incident = await prisma.tenantIncidentLog.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        serviceName: data.serviceName,
        status: 'investigating'
      }
    })
    return { success: true, incident }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resolveIncident(tenantId: string, incidentId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const updated = await prisma.tenantIncidentLog.update({
      where: { id: incidentId, tenantId },
      data: {
        status: 'resolved',
        resolvedAt: new Date()
      }
    })
    return { success: true, incident: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getIncidentLogs(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const incidents = await prisma.tenantIncidentLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, incidents }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUnreadAlertCount(tenantId: string) {
  try {
    const incidentCount = await prisma.tenantIncidentLog.count({
      where: { tenantId, status: 'investigating' }
    })
    
    const failedNotifs = await prisma.tenantNotificationLog.count({
      where: { 
        gateway: { tenantId },
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
    
    return { count: incidentCount + failedNotifs }
  } catch (error) {
    return { count: 0 }
  }
}

// Alert Rules CRUD
export async function getMonitoringRules(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const rules = await prisma.tenantMonitoringRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, rules }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createMonitoringRule(tenantId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const rule = await prisma.tenantMonitoringRule.create({
      data: { tenantId, ...data }
    })
    return { success: true, rule }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateMonitoringRule(tenantId: string, ruleId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const rule = await prisma.tenantMonitoringRule.update({
      where: { id: ruleId, tenantId },
      data
    })
    return { success: true, rule }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteMonitoringRule(tenantId: string, ruleId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    await prisma.tenantMonitoringRule.deleteMany({
      where: { id: ruleId, tenantId }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
