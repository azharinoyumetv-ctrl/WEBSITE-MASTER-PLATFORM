'use client'

import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonitoringStatus } from '../admin-types'

type SystemHealthCardProps = {
  monitoringData?: MonitoringStatus | null
}

export function SystemHealthCard({ monitoringData }: SystemHealthCardProps) {
  const alertCount = monitoringData?.alertHistory?.length ?? 0
  const status = alertCount === 0 ? 'operational' : 'issues'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">System Health</h3>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', status === 'operational' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {status === 'operational' ? 'Operational' : 'Issues Detected'}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {status === 'operational' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
          <span>{status === 'operational' ? 'All systems operational' : `${alertCount} active alert${alertCount === 1 ? '' : 's'}`}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span>Monitoring active</span>
        </div>
      </div>
    </div>
  )
}
