'use client'

import { cn } from '@/lib/utils'

type RecentOrder = {
  id: string
  userName?: string
  actionPerformed?: string
  targetResource?: string
  createdAt?: string
}

type RecentOrdersCardProps = {
  orders: RecentOrder[]
}

export function RecentOrdersCard({ orders }: RecentOrdersCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Orders</h3>
      </div>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No recent orders.</div>}
        {orders.slice(0, 5).map((order) => (
          <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{order.targetResource || 'Order'}</p>
              <p className="text-[10px] text-slate-400 truncate">{order.userName || 'System'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700">{order.actionPerformed?.replace(/_/g, ' ') || '—'}</p>
              <p className="text-[10px] text-slate-400">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
