'use client'

import { useState } from 'react'
import { Zap, Search, ShieldAlert, Check, X, History, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { toggleFeatureFlag, updateFeatureFlagRollout } from '@/lib/actions/feature-flags'

export function FeatureFlagsClient({ 
  initialFlags, 
  initialAuditLogs = [], 
  tenantId 
}: { 
  initialFlags: any[], 
  initialAuditLogs?: any[], 
  tenantId: string 
}) {
  const [flags, setFlags] = useState(initialFlags)
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs)
  const [search, setSearch] = useState('')

  const handleToggle = async (id: string, currentState: boolean) => {
    const res = await toggleFeatureFlag(tenantId, id, currentState)
    if (res.success) {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, tenantState: !currentState } : f))
      toast.success('Flag state updated')
      // Refresh audit logs
      window.location.reload()
    } else {
      toast.error('Failed to update flag state: ' + res.error)
    }
  }

  const handleRolloutChange = async (id: string, percent: number) => {
    const res = await updateFeatureFlagRollout(tenantId, id, percent)
    if (res.success) {
      setFlags(prev => prev.map(f => f.id === id ? { ...f, rolloutPercentage: percent } : f))
      toast.success(`Rollout updated to ${percent}%`)
    } else {
      toast.error('Failed to update rollout percentage: ' + res.error)
    }
  }

  const filtered = flags.filter(f => 
    f.flagKey.toLowerCase().includes(search.toLowerCase()) || 
    f.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Feature Flags</h2>
          <p className="section-desc">Manage experimental features and canary rollouts</p>
        </div>
      </div>

      <div className="card p-4 mb-6 bg-blue-50/50 border-blue-200">
        <div className="flex gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Proceed with caution</p>
            <p>Feature flags control beta capabilities and core system behavior. Changes take effect immediately across all user sessions.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Flags Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search flags..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="form-input pl-9" 
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Flag Key & Description</th>
                    <th>Env Scope</th>
                    <th>Default</th>
                    <th>Rollout % Slider</th>
                    <th className="text-right">Override State</th>
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
                        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{flag.environment || 'all'}</span>
                      </td>
                      <td>
                        <span className={cn('badge text-[10px]', flag.defaultState ? 'badge-success' : 'badge-neutral')}>
                          {flag.defaultState ? 'True' : 'False'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={flag.rolloutPercentage} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, rolloutPercentage: val } : f))
                            }}
                            onMouseUp={(e) => {
                              const val = parseInt((e.target as HTMLInputElement).value)
                              handleRolloutChange(flag.id, val)
                            }}
                            onTouchEnd={(e) => {
                              const val = parseInt((e.target as HTMLInputElement).value)
                              handleRolloutChange(flag.id, val)
                            }}
                            className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <span className="text-xs font-mono text-slate-500 w-8">{flag.rolloutPercentage}%</span>
                        </div>
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
                      <td colSpan={5} className="text-center py-8 text-slate-500">No feature flags found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Log Panel */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" /> Change Audit Log
            </h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No modifications logged yet.</p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log: any) => {
                  const payload = log.payloadChanges ? (typeof log.payloadChanges === 'string' ? JSON.parse(log.payloadChanges) : log.payloadChanges) : {}
                  return (
                    <div key={log.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                      <p className="text-xs text-slate-700 font-medium mb-1">
                        {log.actionPerformed === 'feature_flag_toggle' ? (
                          <>Toggled <strong>{log.targetResource?.split(':')[1] || 'flag'}</strong> to {payload.to ? 'ON' : 'OFF'}</>
                        ) : (
                          <>Updated rollout of <strong>{log.targetResource?.split(':')[1] || 'flag'}</strong> to {payload.rolloutPercentage}%</>
                        )}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user ? `${log.user.firstName || ''} (${log.user.email})` : 'System'}
                        </span>
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
