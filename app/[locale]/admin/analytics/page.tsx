import { getAnalytics } from '@/lib/actions/analytics'
import { AnalyticsClient } from './analytics-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getAnalytics(tenantId)
  const initialData = res.success ? res.analytics : null

  if (!initialData) {
    return <div className="p-8 text-slate-500">Failed to load analytics data.</div>
  }

  return <AnalyticsClient initialData={initialData} />
}
