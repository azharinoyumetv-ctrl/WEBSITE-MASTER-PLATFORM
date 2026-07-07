import { getApiData } from '@/lib/actions/api'
import { ApiPortalClient } from './api-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ApiPortalPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getApiData(tenantId)
  const initialKeys = res.success ? res.keys : []
  const initialWebhooks = res.success ? res.webhooks : []

  return <ApiPortalClient initialKeys={initialKeys} initialWebhooks={initialWebhooks} tenantId={tenantId} />
}
