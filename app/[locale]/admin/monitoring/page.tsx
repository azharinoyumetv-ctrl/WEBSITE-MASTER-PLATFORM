import { getMonitoringStatus, getIncidentLogs } from '@/lib/actions/monitoring'
import { MonitoringClient } from './monitoring-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function MonitoringPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const [res, incRes] = await Promise.all([
    getMonitoringStatus(tenantId),
    getIncidentLogs(tenantId)
  ])
  
  if (!res.success || !res.monitoring) {
    return <div className="p-8 text-red-500">Failed to load monitoring data.</div>
  }

  return (
    <MonitoringClient 
      tenantId={tenantId}
      initialData={res.monitoring}
      initialIncidents={incRes.incidents || []}
    />
  )
}
