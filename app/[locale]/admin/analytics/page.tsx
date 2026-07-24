import { getAnalytics, getReportSchedules, getGeneratedReports } from '@/lib/actions/analytics'
import { AnalyticsClient } from './analytics-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function AnalyticsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening analytics." />
  }

  const daysParam = searchParams.days as string
  const days = daysParam && !isNaN(parseInt(daysParam, 10)) ? parseInt(daysParam, 10) : 7

  const [res, schedulesRes, reportsRes] = await Promise.all([
    getAnalytics(tenantId, days),
    getReportSchedules(tenantId),
    getGeneratedReports(tenantId)
  ])

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-analytics] Failed to load analytics:', errorMsg)
    return <AdminState title="Analytics could not be loaded" description="The reporting data is temporarily unavailable. Please retry shortly; no workspace data was changed." />
  }

  const initialData = res.analytics!
  const initialSchedules = schedulesRes.success ? schedulesRes.schedules! : []
  const initialReports = reportsRes.success ? reportsRes.reports! : []

  return (
    <AnalyticsClient 
      initialData={initialData} 
      initialSchedules={initialSchedules} 
      initialReports={initialReports} 
      tenantId={tenantId} 
    />
  )
}
