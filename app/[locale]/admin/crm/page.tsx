import { getCrmData } from '@/lib/actions/crm'
import { CrmClient } from './crm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function CrmPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening CRM." />
  }

  const res = await getCrmData(tenantId)

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-crm] Failed to load CRM:', errorMsg)
    return <AdminState title="CRM could not be loaded" description="Customer records are temporarily unavailable. Please retry shortly; no CRM data was changed." />
  }

  const initialContacts = res.contacts!
  const initialTimeline = res.timeline!

  return <CrmClient tenantId={tenantId} initialContacts={initialContacts} initialTimeline={initialTimeline} />
}
