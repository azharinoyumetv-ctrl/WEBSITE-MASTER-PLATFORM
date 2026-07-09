import { getInventory } from '@/lib/actions/inventory'
import { InventoryClient } from './inventory-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

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

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load inventory data</p>
            <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  const initialLocations = res.locations!
  const initialBalances = res.balances!
  const catalogItems = res.catalogItems || []

  return <InventoryClient initialLocations={initialLocations} initialBalances={initialBalances} catalogItems={catalogItems} tenantId={tenantId} />
}
