import { getMonitoringStatus } from '@/lib/actions/monitoring'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardMetrics } from '@/lib/actions/dashboard'
import { getAnalytics } from '@/lib/actions/analytics'
import { DashboardClient } from './dashboard-client'
import prisma from '@/lib/prisma'

export default async function AdminDashboard({ searchParams }: { searchParams: { days?: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  const userId = (session.user as any).id
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  let initialWidgets = null
  if (userId) {
    const userProfile = await prisma.tenantUserProfile.findUnique({ where: { userId } })
    if (userProfile?.preferences && typeof userProfile.preferences === 'object') {
      initialWidgets = (userProfile.preferences as any).dashboardWidgets || null
    }
  }

  const days = parseInt(searchParams?.days || '7') || 7

  const [metricsRes, analyticsRes, monitoringRes] = await Promise.all([
    getDashboardMetrics(tenantId),
    getAnalytics(tenantId, days),
    getMonitoringStatus(tenantId)
  ])

  const metricsError = !metricsRes.success ? (metricsRes as any).error : null
  const analyticsError = !analyticsRes.success ? (analyticsRes as any).error : null
  
  const m = metricsRes.success && metricsRes.metrics ? metricsRes.metrics : {
    totalOrders: 0, revenue: 0, recentLogs: [], recentOrders: [], criticalItems: [], modules: []
  }

  const a = analyticsRes.success && analyticsRes.analytics ? analyticsRes.analytics : {
    pageViews: 0, conversions: 0, dailyData: []
  }

  const monitoringData = monitoringRes.success && monitoringRes.monitoring ? monitoringRes.monitoring : {
    systemStatus: 'degraded',
    nodes: [],
    alertHistory: []
  }

  return (
    <DashboardClient 
      m={m} 
      a={a} 
      monitoringData={monitoringData} 
      metricsError={metricsError} 
      analyticsError={analyticsError}
      initialWidgets={initialWidgets}
      tenantId={tenantId}
      userId={userId}
    />
  )
}
