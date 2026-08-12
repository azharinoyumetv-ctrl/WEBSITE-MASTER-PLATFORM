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
  const keys = (res.success && Array.isArray((res as any).keys)) ? (res as any).keys : []
  const hooks = (res.success && Array.isArray((res as any).webhooks)) ? (res as any).webhooks : []
  const telemetry = (res.success && (res as any).telemetry) ? (res as any).telemetry : null

  return <ApiPortalClient initialKeys={keys} initialWebhooks={hooks} telemetry={telemetry} tenantId={tenantId} />
}
