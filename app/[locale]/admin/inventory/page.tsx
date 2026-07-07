import { getInventory } from '@/lib/actions/inventory'
import { InventoryClient } from './inventory-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getInventory(tenantId)
  const initialLocations = res.success ? res.locations : []
  const initialBalances = res.success ? res.balances : []

  return <InventoryClient initialLocations={initialLocations} initialBalances={initialBalances} tenantId={tenantId} />
}
