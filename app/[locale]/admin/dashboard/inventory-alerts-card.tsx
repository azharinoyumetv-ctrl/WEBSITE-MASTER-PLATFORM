'use client'

import Link from 'next/link'
import { ArrowUpRight, Boxes, TriangleAlert } from 'lucide-react'

type InventoryAlert = { id: string; itemTitle?: string; quantityOnHand?: number; lowStockThreshold?: number; status?: string }

export function InventoryAlertsCard({ items }: { items: InventoryAlert[] }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,.07)] backdrop-blur">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-amber-50" />
      <div className="relative mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20"><Boxes className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-950">Inventory attention</h3><p className="text-xs text-slate-500">Items requiring a stock decision</p></div></div><Link href="/admin/inventory" className="text-xs font-bold text-amber-700 hover:text-amber-800"><ArrowUpRight className="h-4 w-4" /></Link></div>
      {items.length === 0 ? <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 py-7 text-center text-xs font-semibold text-emerald-700">Stock levels are within their current thresholds.</div> : <div className="space-y-2">{items.slice(0, 4).map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3"><TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{item.itemTitle || 'Unnamed item'}</p><p className="mt-0.5 text-[10px] text-slate-500">Threshold: {item.lowStockThreshold ?? 5}</p></div><span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-amber-800">{item.quantityOnHand ?? 0} left</span></div>)}</div>}
    </section>
  )
}
