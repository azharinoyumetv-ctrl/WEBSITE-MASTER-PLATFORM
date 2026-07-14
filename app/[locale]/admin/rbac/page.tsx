import { getRoles } from '@/lib/actions/rbac'
import { RbacClient } from './rbac-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RbacPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found for user.</div>
  }

  const res = await getRoles(tenantId)
  const roles = res.roles || []

  return <RbacClient initialRoles={roles} tenantId={tenantId} />
}
