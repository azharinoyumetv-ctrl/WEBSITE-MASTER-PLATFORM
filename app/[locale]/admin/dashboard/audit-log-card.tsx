'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AuditLog = {
  id: string
  userName?: string
  actionPerformed?: string
  targetResource?: string
  createdAt?: string
}

type AuditLogCardProps = {
  logs: AuditLog[]
}

export function AuditLogCard({ logs }: AuditLogCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        <span className="text-xs text-slate-400">Audit trail</span>
      </div>
      <div className="space-y-3">
        {logs.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No recent activity.</div>}
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-indigo-700 text-[10px] font-bold">
                {log.userName?.split(' ').map((n) => n[0]).join('') || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">
                <span className="font-semibold">{log.userName || 'System'}</span>{' '}
                <span className="text-slate-400">{log.actionPerformed?.replace(/_/g, ' ') || 'action'}</span>{' '}
                <span className="font-medium text-slate-600 truncate">{log.targetResource || '—'}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {log.createdAt ? formatDate(log.createdAt, 'relative') : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
