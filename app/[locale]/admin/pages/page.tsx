import { getAdminPages } from '@/lib/actions/website'
import { PagesClient } from './pages-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PagesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getAdminPages(tenantId)
  const initialPages = res.pages || []

  return <PagesClient initialPages={initialPages} tenantId={tenantId} />
}
