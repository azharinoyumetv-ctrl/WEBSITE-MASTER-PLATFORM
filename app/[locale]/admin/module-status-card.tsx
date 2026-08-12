'use client'

import Link from 'next/link'
import { ArrowUpRight, Blocks, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModuleItem } from './admin-types'

export function ModuleStatusCard({ modules }: { modules: ModuleItem[] }) {
  const active = modules.filter(module => module.isEnabled)
  return <section className="relative overflow-hidden rounded-2xl border border-white bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,.07)] backdrop-blur"><div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem] bg-sky-50" /><div className="relative mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20"><Blocks className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-950">Enabled capabilities</h3><p className="text-xs text-slate-500">{active.length} of {modules.length} modules activated</p></div></div><Link href="/admin/modules" className="text-xs font-bold text-sky-700"><ArrowUpRight className="h-4 w-4" /></Link></div>{active.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 py-7 text-center text-xs text-slate-500">No optional modules are active yet.</p> : <div className="grid grid-cols-2 gap-2">{active.slice(0, 6).map(module => <div key={module.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/50 px-2.5 py-2"><Check className="h-3.5 w-3.5 shrink-0 text-sky-600" /><span className="truncate text-[10px] font-bold capitalize text-slate-700">{(module.moduleType || module.moduleKey).replaceAll('_', ' ')}</span></div>)}</div>}</section>
}
