import { getProfile } from '@/lib/actions/profile'
import { ProfileClient } from '../../profile/profile-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId

  if (!tenantId || !userId) {
    return <div className="p-8 text-red-500">Error: User context is missing.</div>
  }

  const res = await getProfile(tenantId, userId)
  const initialUser = res.success ? res.user : null

  if (!initialUser) {
    return <div className="p-8 text-red-500">Error: Could not load profile.</div>
  }

  return <ProfileClient initialUser={initialUser} tenantId={tenantId} />
}

