import { getOrders } from '@/lib/actions/ecommerce'
import { EcommerceClient } from './ecommerce-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function EcommercePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening order management." />
  }

  const res = await getOrders(tenantId)

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-ecommerce] Failed to load orders:', errorMsg)
    return <AdminState title="Orders could not be loaded" description="Order data is temporarily unavailable. Please retry shortly; no order state was changed." />
  }

  const initialOrders = res.orders!

  let baseCurrency = 'IDR'
  try {
    const prisma = (await import('@/lib/prisma')).default
    const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
    if (website && website.themeConfig && (website.themeConfig as any).baseCurrency) {
      baseCurrency = (website.themeConfig as any).baseCurrency
    }
  } catch(e) {}

  return <EcommerceClient initialOrders={initialOrders} tenantId={tenantId} baseCurrency={baseCurrency} />
}
