'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ToggleLeft, ArrowRight } from 'lucide-react'
import type { ModuleItem } from '../admin-types'

type ModuleStatusCardProps = {
  modules: ModuleItem[]
}

export function ModuleStatusCard({ modules }: ModuleStatusCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Module Capabilities</h3>
        <Link href="/admin/modules" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod) => (
          <div key={mod.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <ToggleLeft className={cn("w-4 h-4", mod.isEnabled ? "text-emerald-500" : "text-slate-300")} />
            <span className="text-xs font-medium text-slate-700 capitalize">{mod.moduleType.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
