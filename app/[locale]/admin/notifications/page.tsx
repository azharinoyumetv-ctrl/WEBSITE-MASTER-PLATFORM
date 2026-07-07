import { getNotificationTemplates } from '@/lib/actions/notifications'
import { NotificationsClient } from './notifications-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getNotificationTemplates(tenantId)
  const initialTemplates = res.success ? res.templates : []

  return <NotificationsClient initialTemplates={initialTemplates} tenantId={tenantId} />
}
