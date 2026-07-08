import { getOrders } from '@/lib/actions/ecommerce'
import { EcommerceClient } from './ecommerce-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EcommercePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getOrders(tenantId)
  const initialOrders = res.success ? res.orders : []

  let baseCurrency = 'USD'
  try {
    const prisma = (await import('@/lib/prisma')).default
    const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
    if (website && website.themeConfig && (website.themeConfig as any).baseCurrency) {
      baseCurrency = (website.themeConfig as any).baseCurrency
    }
  } catch(e) {}

  return <EcommerceClient initialOrders={initialOrders} tenantId={tenantId} baseCurrency={baseCurrency} />
}
