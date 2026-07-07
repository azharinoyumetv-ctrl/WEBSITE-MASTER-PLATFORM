import { getCrmData } from '@/lib/actions/crm'
import { CrmClient } from './crm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CrmPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getCrmData(tenantId)
  const initialContacts = res.success ? res.contacts : []
  const initialTimeline = res.success ? res.timeline : []

  return <CrmClient initialContacts={initialContacts} initialTimeline={initialTimeline} />
}
