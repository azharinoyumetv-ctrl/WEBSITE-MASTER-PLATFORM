'use server'

import prisma from "@/lib/prisma"
import { getAuthenticatedUser, requirePermission } from "@/lib/rbac"
import type { OrderStatus } from '@prisma/client'


export async function getAnalytics(tenantId: string, rangeDays: number = 7) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'analytics', 'read')

    const safeRangeDays = Number.isFinite(rangeDays)
      ? Math.max(1, Math.min(365, Math.floor(rangeDays)))
      : 7
    const startDate = new Date()
    startDate.setUTCHours(0, 0, 0, 0)
    startDate.setUTCDate(startDate.getUTCDate() - safeRangeDays + 1)
    const successfulOrderStatuses: OrderStatus[] = ['paid', 'pending_fulfillment', 'processing', 'shipped', 'completed']

    // Analytics is derived directly from recorded events and paid orders. The
    // old daily-summary table required a manual test-data backfill, which made
    // a production dashboard look empty or fabricated between runs.
    const [pageviews, paidOrders] = await Promise.all([
      prisma.tenantAnalyticsEvent.findMany({
        where: { tenantId, eventName: 'pageview', createdAt: { gte: startDate } },
        select: { pageUrl: true, sessionId: true, createdAt: true, deviceProperties: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.tenantOrder.findMany({
        where: { tenantId, orderStatus: { in: successfulOrderStatuses }, createdAt: { gte: startDate } },
        select: { createdAt: true, totalAmount: true },
      }),
    ])

    const daily = new Map<string, { date: string; pageViews: number; uniqueVisitors: number; orders: number; revenue: number; bounceRate: number }>()
    for (let offset = 0; offset < safeRangeDays; offset++) {
      const date = new Date(startDate)
      date.setUTCDate(startDate.getUTCDate() + offset)
      const key = date.toISOString().slice(0, 10)
      daily.set(key, { date: key, pageViews: 0, uniqueVisitors: 0, orders: 0, revenue: 0, bounceRate: 0 })
    }

    const sessions = new Map<string, { count: number; first: number; last: number; device: string }>()
    const pages = new Map<string, { views: number; sessions: Set<string> }>()
    for (const pageview of pageviews) {
      const dateKey = pageview.createdAt.toISOString().slice(0, 10)
      const day = daily.get(dateKey)
      if (day) day.pageViews++
      const sessionKey = pageview.sessionId || `event-${pageview.createdAt.getTime()}`
      const device = String((pageview.deviceProperties as any)?.deviceType || 'desktop').toLowerCase()
      const existing = sessions.get(sessionKey)
      sessions.set(sessionKey, existing
        ? { ...existing, count: existing.count + 1, last: pageview.createdAt.getTime() }
        : { count: 1, first: pageview.createdAt.getTime(), last: pageview.createdAt.getTime(), device })
      const pageKey = pageview.pageUrl || '/'
      const page = pages.get(pageKey) || { views: 0, sessions: new Set<string>() }
      page.views++
      page.sessions.add(sessionKey)
      pages.set(pageKey, page)
    }

    const sessionDays = new Map<string, { visitors: number; bounces: number }>()
    let totalSessionSeconds = 0
    let mobile = 0, desktop = 0, tablet = 0
    for (const session of Array.from(sessions.values())) {
      totalSessionSeconds += (session.last - session.first) / 1000
      if (session.device === 'mobile') mobile++
      else if (session.device === 'tablet') tablet++
      else desktop++
    }
    for (const pageview of pageviews) {
      const dayKey = pageview.createdAt.toISOString().slice(0, 10)
      const sessionKey = pageview.sessionId || `event-${pageview.createdAt.getTime()}`
      const session = sessions.get(sessionKey)
      if (!session) continue
      const value = sessionDays.get(`${dayKey}:${sessionKey}`) || { visitors: 0, bounces: 0 }
      value.visitors = 1
      value.bounces = session.count === 1 ? 1 : 0
      sessionDays.set(`${dayKey}:${sessionKey}`, value)
    }
    for (const [key, value] of Array.from(sessionDays.entries())) {
      const day = daily.get(key.slice(0, 10))
      if (day) {
        day.uniqueVisitors += value.visitors
        day.bounceRate += value.bounces
      }
    }
    for (const day of Array.from(daily.values())) {
      day.bounceRate = day.uniqueVisitors ? Math.round((day.bounceRate / day.uniqueVisitors) * 100) : 0
    }
    for (const order of paidOrders) {
      const day = daily.get(order.createdAt.toISOString().slice(0, 10))
      if (day) {
        day.orders++
        day.revenue += Number(order.totalAmount || 0)
      }
    }

    const dailyData = Array.from(daily.values())
    const totalPageViews = pageviews.length
    const totalUniqueVisitors = sessions.size
    const totalConversions = paidOrders.length
    const totalRevenue = paidOrders.reduce((total, order) => total + Number(order.totalAmount || 0), 0)
    const avgBounceRate = totalUniqueVisitors ? Math.round((Array.from(sessions.values()).filter(session => session.count === 1).length / totalUniqueVisitors) * 100) : 0
    const avgSecs = totalUniqueVisitors ? Math.round(totalSessionSeconds / totalUniqueVisitors) : 0
    const avgSessionDuration = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`
    const topPagesFormatted = Array.from(pages.entries())
      .map(([page, value]) => ({ page, views: value.views, uniqueVisitors: value.sessions.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
    const totalDevices = mobile + desktop + tablet

    return {
      success: true,
      analytics: {
        pageViews: totalPageViews,
        uniqueVisitors: totalUniqueVisitors,
        conversions: totalConversions,
        revenue: totalRevenue,
        bounceRate: avgBounceRate,
        avgSessionDuration,
        topPages: topPagesFormatted,
        dailyData: dailyData,
        deviceBreakdown: [
          { device: 'Mobile', sessions: mobile, percentage: totalDevices ? Math.round((mobile / totalDevices) * 100) : 0 },
          { device: 'Desktop', sessions: desktop, percentage: totalDevices ? Math.round((desktop / totalDevices) * 100) : 0 },
          { device: 'Tablet', sessions: tablet, percentage: totalDevices ? Math.round((tablet / totalDevices) * 100) : 0 }
        ]
      }
    }

  } catch (error: any) {
    console.error("Analytics Error", error)
    return { success: false, error: error.message }
  }
}

/**
 * Record a single analytics event (pageview, conversion, custom) for a tenant.
 * Called from the client-side AnalyticsTracker component or from API routes.
 */
export async function recordAnalyticsEvent(
  tenantId: string,
  eventName: string,
  pageUrl: string,
  sessionId?: string,
  eventPayload?: Record<string, any>,
  deviceProperties?: Record<string, any>
) {
  try {
    if (!tenantId || !eventName) {
      return { success: false, error: 'tenantId and eventName are required' }
    }

    // Generate a secure session ID if not provided (anonymous sessions)
    const crypto = require('crypto')
    const sid = sessionId || `anon-${crypto.randomUUID()}`

    await prisma.tenantAnalyticsEvent.create({
      data: {
        tenantId,
        eventName,
        pageUrl: pageUrl || '/',
        sessionId: sid,
        eventPayload: eventPayload || {},
        deviceProperties: deviceProperties || {}
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error('recordAnalyticsEvent error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Backfill or seed daily analytics summaries for the past N days.
 * Used for testing or bootstrapping analytics data after initial setup.
 * Safe to call multiple times — uses upsert to avoid duplicate records.
 * Uses real order data and aggregates real pageview events into sessions.
 */
export async function backfillAnalyticsSummaries(tenantId: string, days: number = 7) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'analytics', 'write')

    const safeDays = Number.isFinite(days)
      ? Math.max(1, Math.min(365, Math.floor(days)))
      : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - safeDays)

    // Fetch all orders in range — aggregate in-code by day for accuracy
    const orders = await prisma.tenantOrder.findMany({
      where: { tenantId, createdAt: { gte: startDate } },
      select: { createdAt: true, totalAmount: true }
    })

    // Fetch all pageview events in range
    const pageviews = await prisma.tenantAnalyticsEvent.findMany({
      where: { tenantId, eventName: 'pageview', createdAt: { gte: startDate } },
      select: { createdAt: true, sessionId: true, eventPayload: true }
    })

    // Aggregate orders and pageviews by day string
    const ordersByDay: Record<string, { count: number; revenue: number }> = {}
    for (const o of orders) {
      const day = o.createdAt.toISOString().split('T')[0]
      if (!ordersByDay[day]) ordersByDay[day] = { count: 0, revenue: 0 }
      ordersByDay[day].count++
      ordersByDay[day].revenue += Number(o.totalAmount || 0)
    }

    const pvByDay: Record<string, number> = {}
    const sessionsByDay: Record<string, Record<string, { count: number, maxTime: number, minTime: number }>> = {}
    
    for (const p of pageviews) {
      const day = p.createdAt.toISOString().split('T')[0]
      pvByDay[day] = (pvByDay[day] || 0) + 1
      
      const sid = p.sessionId || 'anon'
      if (!sessionsByDay[day]) sessionsByDay[day] = {}
      if (!sessionsByDay[day][sid]) {
        sessionsByDay[day][sid] = { count: 0, minTime: p.createdAt.getTime(), maxTime: p.createdAt.getTime() }
      }
      sessionsByDay[day][sid].count++
      sessionsByDay[day][sid].minTime = Math.min(sessionsByDay[day][sid].minTime, p.createdAt.getTime())
      sessionsByDay[day][sid].maxTime = Math.max(sessionsByDay[day][sid].maxTime, p.createdAt.getTime())
    }

    // Generate summary entries per day per metric
    const summaryEntries: Array<{
      tenantId: string
      summaryDate: Date
      metricKey: string
      metricValue: number
    }> = []

    for (let i = 0; i < safeDays; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toISOString().split('T')[0]
      const dayDate = new Date(dayStr + 'T00:00:00.000Z')

      const pvCount = pvByDay[dayStr] || 0
      const orderCount = ordersByDay[dayStr]?.count || 0
      const revenue = ordersByDay[dayStr]?.revenue || 0
      
      const sessions = sessionsByDay[dayStr] || {}
      const sessionIds = Object.keys(sessions)
      const uniqueVisitors = sessionIds.length
      
      let bounceCount = 0
      let totalSessionSeconds = 0
      
      for (const sid of sessionIds) {
        if (sessions[sid].count === 1) bounceCount++
        const durationSec = (sessions[sid].maxTime - sessions[sid].minTime) / 1000
        totalSessionSeconds += durationSec
      }
      
      const bounceRate = uniqueVisitors > 0 ? (bounceCount / uniqueVisitors) * 100 : 0
      const avgSessionSeconds = uniqueVisitors > 0 ? Math.floor(totalSessionSeconds / uniqueVisitors) : 0

      const metrics = [
        { metricKey: 'pageViews', metricValue: pvCount },
        { metricKey: 'uniqueVisitors', metricValue: uniqueVisitors },
        { metricKey: 'conversions', metricValue: orderCount },
        { metricKey: 'revenue', metricValue: revenue },
        { metricKey: 'bounceRate', metricValue: bounceRate },
        { metricKey: 'avgSessionSeconds', metricValue: avgSessionSeconds }
      ]

      for (const metric of metrics) {
        summaryEntries.push({
          tenantId,
          summaryDate: dayDate,
          ...metric
        })
      }
    }

    // Upsert all entries
    let upserted = 0
    for (const entry of summaryEntries) {
      await prisma.tenantAnalyticsDailySummary.upsert({
        where: {
          tenantId_summaryDate_metricKey: {
            tenantId: entry.tenantId,
            summaryDate: entry.summaryDate,
            metricKey: entry.metricKey
          }
        },
        update: { metricValue: entry.metricValue },
        create: entry
      })
      upserted++
    }

    try {
      const { revalidatePath } = require('next/cache')
      revalidatePath('/admin/analytics')
      revalidatePath('/admin/dashboard')
    } catch (e) {
      // Ignore if called from a standalone script outside Next.js context
    }

    return { success: true, upserted }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getReportSchedules(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'read')

    const schedules = await prisma.tenantAnalyticsReportSchedule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, schedules }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createReportSchedule(tenantId: string, data: { reportName: string, frequency: string, recipient: string, format: string }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'write')

    const schedule = await prisma.tenantAnalyticsReportSchedule.create({
      data: {
        tenantId,
        reportName: data.reportName,
        frequency: data.frequency,
        recipient: data.recipient,
        format: data.format
      }
    })
    
    // Auto-generate initial report
    await generateReportInternal(tenantId, schedule.id)

    const { revalidatePath } = require('next/cache')
    revalidatePath('/admin/analytics')
    return { success: true, schedule }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateReportSchedule(tenantId: string, id: string, data: { reportName?: string, frequency?: string, recipient?: string, format?: string, isActive?: boolean }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'write')

    const schedule = await prisma.tenantAnalyticsReportSchedule.update({
      where: { id, tenantId },
      data: {
        reportName: data.reportName,
        frequency: data.frequency,
        recipient: data.recipient,
        format: data.format,
        isActive: data.isActive
      }
    })

    const { revalidatePath } = require('next/cache')
    revalidatePath('/admin/analytics')
    return { success: true, schedule }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteReportSchedule(tenantId: string, id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'write')

    await prisma.tenantAnalyticsReportSchedule.delete({
      where: { id, tenantId }
    })

    const { revalidatePath } = require('next/cache')
    revalidatePath('/admin/analytics')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getGeneratedReports(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'read')

    const reports = await prisma.tenantGeneratedReport.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, reports }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function generateReportInternal(tenantId: string, scheduleId: string) {
  const schedule = await prisma.tenantAnalyticsReportSchedule.findUnique({
    where: { id: scheduleId, tenantId }
  })
  if (!schedule) throw new Error('Schedule not found')

  const analyticsRes = await getAnalytics(tenantId, 7)
  if (!analyticsRes.success || !analyticsRes.analytics) {
    throw new Error('Failed to fetch analytics data: ' + (analyticsRes.error || 'Empty data'))
  }

  const data = analyticsRes.analytics
  let content = ''
  if (schedule.format === 'csv') {
    content = `Metric,Value\n` +
              `Page Views,${data.pageViews}\n` +
              `Unique Visitors,${data.uniqueVisitors}\n` +
              `Conversions,${data.conversions}\n` +
              `Revenue,${data.revenue}\n` +
              `Bounce Rate,${data.bounceRate}%\n` +
              `Avg Session Duration,${data.avgSessionDuration}\n`
  } else {
    content = JSON.stringify(data, null, 2)
  }

  const base64 = Buffer.from(content).toString('base64')
  const fileUrl = `data:${schedule.format === 'csv' ? 'text/csv' : 'application/json'};base64,${base64}`

  return await prisma.tenantGeneratedReport.create({
    data: {
      tenantId,
      reportName: `${schedule.reportName} (${schedule.frequency})`,
      fileUrl
    }
  })
}

export async function triggerGenerateReport(tenantId: string, scheduleId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'analytics', 'write')

    const report = await generateReportInternal(tenantId, scheduleId)

    const { revalidatePath } = require('next/cache')
    revalidatePath('/admin/analytics')
    return { success: true, report }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
