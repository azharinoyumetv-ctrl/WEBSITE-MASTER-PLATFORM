'use client'

import { useState } from 'react'
import { Zap, Search, ShieldAlert, Tag, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { toggleFeatureFlag } from '@/lib/actions/feature-flags'

export function FeatureFlagsClient({ initialFlags, tenantId }: { initialFlags: any[], tenantId: string }) {
  const [flags, setFlags] = useState(initialFlags)
  const [search, setSearch] = useState('')

  const handleToggle = async (id: string, currentState: boolean) => {
    const res = await toggleFeatureFlag(tenantId, id, currentState)
    if (res.success) {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, tenantState: !currentState } : f))
      toast.success('Flag state updated')
    } else {
      toast.error('Failed to update flag state')
    }
  }

  const filtered = flags.filter(f => f.flagKey.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Feature Flags</h2>
          <p className="section-desc">Manage experimental features and canary rollouts</p>
        </div>
      </div>

      <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Proceed with caution</p>
            <p>Feature flags control beta capabilities and core system behavior. Changes take effect immediately across all user sessions.</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Flag Key & Description</th>
              <th>System Default</th>
              <th>Rollout %</th>
              <th className="text-right">Tenant Override</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(flag => (
              <tr key={flag.id}>
                <td>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono text-sm font-semibold text-slate-800">{flag.flagKey}</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-md">{flag.description}</p>
                </td>
                <td>
                  <span className={cn('badge text-[10px]', flag.defaultState ? 'badge-success' : 'badge-neutral')}>
                    {flag.defaultState ? 'True' : 'False'}
                  </span>
                </td>
                <td>
                  {flag.rolloutPercentage !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${flag.rolloutPercentage}%` }} />
                      </div>
                      <span className="text-xs font-mono text-slate-500">{flag.rolloutPercentage}%</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleToggle(flag.id, flag.tenantState)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                        flag.tenantState ? 'bg-indigo-600' : 'bg-slate-200'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 flex items-center justify-center',
                        flag.tenantState ? 'translate-x-6' : 'translate-x-1'
                      )}>
                        {flag.tenantState ? <Check className="w-2.5 h-2.5 text-indigo-600" /> : <X className="w-2.5 h-2.5 text-slate-400" />}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-500">No feature flags found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
