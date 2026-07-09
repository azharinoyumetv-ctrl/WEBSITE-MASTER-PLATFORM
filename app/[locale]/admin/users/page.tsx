import { getUsers, getRoles } from '@/lib/actions/user'
import { UsersClient } from './users-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    // If somehow a user has no tenant, redirect to an error or handle
    return <div className="p-8 text-red-500">Error: No tenant context found for user.</div>
  }

  const [usersRes, rolesRes] = await Promise.all([
    getUsers(tenantId),
    getRoles(tenantId)
  ])

  const hasError = !usersRes.success || !rolesRes.success

  if (hasError) {
    const errorMsg = (!usersRes.success ? (usersRes as any).error : (rolesRes as any).error) || 'Unknown error'
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load users data</p>
            <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  const initialUsers = usersRes.users!
  const initialRoles = rolesRes.roles!

  return (
    <UsersClient 
      initialUsers={initialUsers} 
      initialRoles={initialRoles} 
      tenantId={tenantId}
      currentUser={session.user}
    />
  )
}
