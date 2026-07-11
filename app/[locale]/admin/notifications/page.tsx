import { getNotificationTemplates, getNotificationLogs, getNotificationGateway } from '@/lib/actions/notifications'
import { NotificationsClient } from './notifications-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const [res, logsRes, gatewayRes] = await Promise.all([
    getNotificationTemplates(tenantId),
    getNotificationLogs(tenantId),
    getNotificationGateway(tenantId, 'email')
  ])

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load notification templates</p>
            <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  const initialTemplates = res.templates!

  return <NotificationsClient 
    initialTemplates={initialTemplates} 
    initialLogs={logsRes.success ? (logsRes as any).logs : []}
    initialGateway={gatewayRes.success ? (gatewayRes as any).gateway : null}
    tenantId={tenantId} 
  />
}
