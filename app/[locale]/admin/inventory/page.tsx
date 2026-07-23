import { getInventory } from '@/lib/actions/inventory'
import { InventoryClient } from './inventory-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening inventory." />
  }

  const res = await getInventory(tenantId)

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-inventory] Failed to load inventory:', errorMsg)
    return <AdminState title="Inventory could not be loaded" description="Stock and location data is temporarily unavailable. Please retry shortly; no inventory balances were changed." />
  }

  const initialLocations = res.locations!
  const initialBalances = res.balances!
  const catalogItems = res.catalogItems || []

  return <InventoryClient initialLocations={initialLocations} initialBalances={initialBalances} catalogItems={catalogItems} tenantId={tenantId} />
}
