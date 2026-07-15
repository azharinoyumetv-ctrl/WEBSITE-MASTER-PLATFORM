import { getPosData } from '@/lib/actions/pos'
import { PosClient } from './pos-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function POSPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getPosData(tenantId)
  
  if (!res.success) {
    return <div className="p-8 text-red-500">Error loading POS: {res.error}</div>
  }

  let baseCurrency = 'IDR'
  try {
    const prisma = (await import('@/lib/prisma')).default
    const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
    if (website && website.themeConfig && (website.themeConfig as any).baseCurrency) {
      baseCurrency = (website.themeConfig as any).baseCurrency
    }
  } catch(e) {}

  return (
    <PosClient 
      initialTerminal={res.terminal} 
      initialCatalogItems={res.catalogItems || []} 
      initialSession={res.activeSession}
      tenantId={tenantId} 
      baseCurrency={baseCurrency}
      userId={(session.user as any).id}
    />
  )
}
