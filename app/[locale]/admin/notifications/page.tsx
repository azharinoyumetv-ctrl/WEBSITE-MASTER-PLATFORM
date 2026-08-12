import { getNotificationTemplates, getNotificationLogs, getNotificationGateway } from '@/lib/actions/notifications'
import { NotificationsClient } from './notifications-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before managing notifications." />
  }

  const [res, logsRes, gatewayRes] = await Promise.all([
    getNotificationTemplates(tenantId),
    getNotificationLogs(tenantId),
    getNotificationGateway(tenantId, 'email')
  ])

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-notifications] Failed to load notifications:', errorMsg)
    return <AdminState title="Notifications could not be loaded" description="Templates and delivery history are temporarily unavailable. Please retry shortly." />
  }

  const initialTemplates = res.templates!

  return <NotificationsClient 
    initialTemplates={initialTemplates} 
    initialLogs={logsRes.success ? (logsRes as any).logs : []}
    initialGateway={gatewayRes.success ? (gatewayRes as any).gateway : null}
    tenantId={tenantId} 
  />
}
