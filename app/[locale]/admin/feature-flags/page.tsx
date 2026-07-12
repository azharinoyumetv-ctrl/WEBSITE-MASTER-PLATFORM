import { getFeatureFlags } from '@/lib/actions/feature-flags'
import { FeatureFlagsClient } from './feature-flags-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FeatureFlagsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getFeatureFlags(tenantId)
  const initialFlags = res.success ? (res.flags || []) : []
  const initialAuditLogs = res.success ? (res.auditLogs || []) : []

  return <FeatureFlagsClient initialFlags={initialFlags} initialAuditLogs={initialAuditLogs} tenantId={tenantId} />
}
