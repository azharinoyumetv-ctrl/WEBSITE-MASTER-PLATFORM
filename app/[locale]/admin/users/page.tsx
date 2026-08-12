import { getUsers, getRoles } from '@/lib/actions/user'
import { UsersClient } from './users-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before managing users." />
  }

  const [usersRes, rolesRes] = await Promise.all([
    getUsers(tenantId),
    getRoles(tenantId)
  ])

  const hasError = !usersRes.success || !rolesRes.success

  if (hasError) {
    const errorMsg = (!usersRes.success ? (usersRes as any).error : (rolesRes as any).error) || 'Unknown error'
    console.error('[admin-users] Failed to load users:', errorMsg)
    return <AdminState title="Users could not be loaded" description="User and role data is temporarily unavailable. Please retry shortly; no access assignments were changed." />
  }

  const initialUsers = usersRes.users!
  const initialRoles = rolesRes.roles!

  return (
    <UsersClient 
      initialUsers={initialUsers} 
      initialRoles={initialRoles} 
      tenantId={tenantId}
    />
  )
}
