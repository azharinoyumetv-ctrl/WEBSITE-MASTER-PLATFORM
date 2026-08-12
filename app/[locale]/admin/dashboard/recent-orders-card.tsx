'use client'

import Link from 'next/link'
import { ArrowUpRight, ReceiptText, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type RecentOrder = {
  id: string
  createdAt?: string
  totalAmount?: number
  paymentStatus?: string
  orderStatus?: string
  guestEmail?: string | null
}

export function RecentOrdersCard({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,.07)] backdrop-blur">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-emerald-50" />
      <div className="relative mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><ShoppingBag className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-950">Recent orders</h3><p className="text-xs text-slate-500">Latest commercial activity</p></div></div>
        <Link href="/admin/ecommerce" className="text-xs font-bold text-emerald-700 hover:text-emerald-800"><ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      {orders.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 py-7 text-center text-xs text-slate-500">Orders will appear here when customers submit them.</p> : <div className="relative space-y-2">{orders.slice(0, 4).map(order => <div key={order.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-emerald-600"><ReceiptText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{order.guestEmail || `Order #${order.id.slice(0, 8)}`}</p><p className="mt-0.5 text-[10px] text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'New order'}</p></div><div className="text-right"><p className="text-xs font-black text-slate-900">{formatCurrency(Number(order.totalAmount || 0))}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{order.paymentStatus || order.orderStatus || 'Pending'}</p></div></div>)}</div>}
    </section>
  )
}
