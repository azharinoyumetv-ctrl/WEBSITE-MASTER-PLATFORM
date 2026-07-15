'use client'

import { cn } from '@/lib/utils'

type InventoryAlert = {
  id: string
  name?: string
  quantityOnHand?: number
  lowStockThreshold?: number
}

type InventoryAlertsCardProps = {
  items: InventoryAlert[]
}

export function InventoryAlertsCard({ items }: InventoryAlertsCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Inventory Alerts</h3>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No inventory alerts.</div>}
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{item.name || 'Item'}</p>
              <p className="text-[10px] text-slate-400">Min: {item.lowStockThreshold ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-xs font-bold', (item.quantityOnHand ?? 0) <= (item.lowStockThreshold ?? 0) ? 'text-red-600' : 'text-slate-600')}>
                {item.quantityOnHand ?? 0} left
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
