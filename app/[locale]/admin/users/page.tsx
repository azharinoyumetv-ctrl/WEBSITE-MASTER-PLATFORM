import { getUsers, getRoles } from '@/lib/actions/user'
import { UsersClient } from './users-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

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

  const initialUsers = usersRes.success ? usersRes.users : []
  const initialRoles = rolesRes.success ? rolesRes.roles : []

  return (
    <UsersClient 
      initialUsers={initialUsers} 
      initialRoles={initialRoles} 
      tenantId={tenantId}
      currentUser={session.user}
    />
  )
}
