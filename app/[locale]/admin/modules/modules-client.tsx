'use client'

import { useState } from 'react'
import {
  ToggleLeft, ToggleRight, Package, ShoppingCart, CreditCard, Monitor,
  Warehouse, Users2, CalendarCheck, Sparkles, Bell, BarChart3, Code2,
  Globe, Users, Shield, LayoutDashboard, CheckCircle2, AlertCircle,
  Info, RefreshCw, Settings, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { toggleTenantModule } from '@/lib/actions/module'

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, LayoutDashboard, Users, Shield, Package, ShoppingCart,
  CreditCard, Monitor, Warehouse, Users2, CalendarCheck, Sparkles,
  Bell, BarChart3, Code2, MessageCircle,
}

const CATEGORY_ORDER = ['core', 'commerce', 'operations', 'intelligence', 'developer']
const CATEGORY_LABELS: Record<string, { label: string; description: string; color: string }> = {
  core: { label: 'Core Infrastructure', description: 'Essential platform services always included', color: 'text-slate-700 bg-slate-100' },
  commerce: { label: 'Commerce Suite', description: 'Selling and transaction capabilities', color: 'text-indigo-700 bg-indigo-50' },
  operations: { label: 'Operations', description: 'Business management and customer tools', color: 'text-emerald-700 bg-emerald-50' },
  intelligence: { label: 'Intelligence & Marketing', description: 'AI, analytics, and notification tools', color: 'text-purple-700 bg-purple-50' },
  developer: { label: 'Developer Tools', description: 'APIs, integrations, and system monitoring', color: 'text-blue-700 bg-blue-50' },
}

export function ModulesClient({ initialModules, tenantId }: { initialModules: any[], tenantId: string }) {
  const [modules, setModules] = useState(initialModules)

  const toggleModule = async (key: string, isCore: boolean) => {
    if (isCore) {
      toast.error('Core modules cannot be disabled.')
      return
    }

    const currentMod = modules.find(m => m.key === key)
    const newStatus = !currentMod?.isEnabled
    
    // Optimistic UI
    setModules(prev => prev.map(m =>
      m.key === key ? { ...m, isEnabled: newStatus } : m
    ))

    const res = await toggleTenantModule(tenantId, key, newStatus)
    
    if (res.success) {
      toast.success(`${currentMod?.name} ${newStatus ? 'enabled' : 'disabled'} successfully`)
    } else {
      toast.error(res.error || 'Failed to toggle module')
      // Revert Optimistic UI
      setModules(prev => prev.map(m =>
        m.key === key ? { ...m, isEnabled: !newStatus } : m
      ))
    }
  }

  const enabledCount = modules.filter(m => m.isEnabled).length

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Module Manager</h2>
          <p className="section-desc">Enable or disable platform modules for this tenant</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
            <span className="font-semibold text-indigo-700">{enabledCount}</span>
            <span className="text-indigo-500 ml-1">/ {modules.length} active</span>
          </div>
        </div>
      </div>

      <div className="alert-info mb-6">
        <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />
        <p>
          Core modules are always active and cannot be disabled. Module changes apply within{' '}
          <strong>2 seconds</strong> via real-time cache propagation.
        </p>
      </div>

      {CATEGORY_ORDER.map(category => {
        const config = CATEGORY_LABELS[category]
        const categoryModules = modules.filter(m => m.category === category)
        
        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', config.color)}>
                {config.label}
              </span>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryModules.map(mod => {
                const Icon = ICON_MAP[mod.icon] || Package
                return (
                  <div
                    key={mod.key}
                    className={cn(
                      'card p-4 flex items-start gap-4 transition-all duration-200',
                      mod.isEnabled && !mod.isCore ? 'border-indigo-200 bg-indigo-50/30' : '',
                      (mod.isCore || mod.isAddOnOnly) ? 'opacity-90' : 'hover:shadow-md cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      mod.isEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                    )}>
                      <Icon className={cn('w-5 h-5', mod.isEnabled ? 'text-white' : 'text-slate-400')} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{mod.name}</h3>
                        {mod.isCore && (
                          <span className="badge badge-neutral text-[10px]">Core</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mod.description}</p>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          {mod.isEnabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span className={mod.isEnabled ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                            {mod.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        
                        {mod.isAddOnOnly ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Project add-on</span>
                        ) : (
                          <button
                            id={`toggle-${mod.key}`}
                            onClick={() => toggleModule(mod.key, mod.isCore)}
                            disabled={mod.isCore}
                            className={cn(
                              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none',
                              mod.isEnabled ? 'bg-indigo-600' : 'bg-slate-200',
                              mod.isCore ? 'cursor-not-allowed' : 'cursor-pointer'
                            )}
                          >
                            <span className={cn(
                              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                              mod.isEnabled ? 'translate-x-[18px]' : 'translate-x-1'
                            )} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
