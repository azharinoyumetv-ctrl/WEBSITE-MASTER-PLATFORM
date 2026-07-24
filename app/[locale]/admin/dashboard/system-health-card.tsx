'use client'

import Link from 'next/link'
import { Activity, ArrowUpRight, CheckCircle2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonitoringStatus } from '../admin-types'

export function SystemHealthCard({ monitoringData }: { monitoringData?: MonitoringStatus | null }) {
  const operational = monitoringData?.systemStatus === 'healthy'
  const activeIncidents = monitoringData?.alertHistory?.filter(alert => !alert.resolved).length ?? 0
  return <section className="relative overflow-hidden rounded-2xl border border-white bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,.07)] backdrop-blur"><div className={cn('absolute right-0 top-0 h-20 w-20 rounded-bl-[3rem]', operational ? 'bg-cyan-50' : 'bg-rose-50')} /><div className="relative mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><span className={cn('grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg', operational ? 'bg-cyan-500 shadow-cyan-500/20' : 'bg-rose-500 shadow-rose-500/20')}><Activity className="h-5 w-5" /></span><div><h3 className="text-sm font-black text-slate-950">Workspace health</h3><p className="text-xs text-slate-500">Live database and application check</p></div></div><Link href="/admin/monitoring" className={cn('text-xs font-bold', operational ? 'text-cyan-700' : 'text-rose-700')}><ArrowUpRight className="h-4 w-4" /></Link></div><div className={cn('flex items-center gap-2 rounded-xl border p-3 text-xs font-bold', operational ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800')}>{operational ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}{operational ? 'Connectivity checks are healthy.' : 'A connectivity check needs attention.'}</div><p className="mt-3 text-xs text-slate-500">{activeIncidents ? `${activeIncidents} active incident${activeIncidents === 1 ? '' : 's'} recorded.` : 'No active incidents recorded.'}</p></section>
}
