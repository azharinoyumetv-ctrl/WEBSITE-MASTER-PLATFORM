'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Plus, Search, MoreHorizontal, Globe, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Settings2, Users,
  Crown, Star, Zap, Loader2
} from 'lucide-react'
import { formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createTenant } from '@/lib/actions/tenant'
import { useLocale } from 'next-intl'

const PLAN_CONFIG = {
  core: { label: 'Core', icon: Zap, color: 'text-slate-600', bg: 'bg-slate-100' },
  enterprise: { label: 'Enterprise', icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  agency: { label: 'Agency', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
}

export function TenantsClient({ initialTenants }: { initialTenants: any[] }) {
  const [search, setSearch] = useState('')
  const [tenants, setTenants] = useState(initialTenants)
  const [showModal, setShowModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const locale = useLocale()

  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    plan: 'core',
    adminEmail: '',
    packageKey: 'landing_page',
    addons: [] as string[]
  })

  const filtered = tenants.filter(t =>
    t.companyName.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    enterprise: tenants.filter(t => t.plan === 'enterprise').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
  }

  const handleProvision = async () => {
    if (!formData.companyName || !formData.subdomain) {
      return toast.error('Company Name and Subdomain are required')
    }

    setIsCreating(true)
    const res = await createTenant({
      companyName: formData.companyName,
      subdomain: formData.subdomain,
      packageKey: formData.packageKey,
      addons: formData.addons,
    })
    setIsCreating(false)

    if (res.success) {
      toast.success('Tenant provisioned successfully!')
      setShowModal(false)
      // Optimistic update
      setTenants([res.tenant, ...tenants])
      setFormData({ companyName: '', subdomain: '', plan: 'core', adminEmail: '', packageKey: 'landing_page', addons: [] })
    } else {
      toast.error(res.error || 'Failed to provision tenant')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Tenant Management</h2>
          <p className="section-desc">Provision and manage client workspaces across the platform</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tenants', value: stats.total, color: 'bg-indigo-600', icon: Building2 },
          { label: 'Active', value: stats.active, color: 'bg-emerald-600', icon: CheckCircle2 },
          { label: 'Enterprise', value: stats.enterprise, color: 'bg-purple-600', icon: Star },
          { label: 'Suspended', value: stats.suspended, color: 'bg-red-500', icon: XCircle },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">{stat.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.color)}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="tenant-search"
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Tenant table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Domain</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => {
                const planKey = tenant.plan || 'core'
                const plan = PLAN_CONFIG[planKey as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.core
                return (
                  <tr key={tenant.id} className="group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {tenant.companyName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{tenant.companyName}</p>
                          <p className="text-xs text-slate-400 font-mono">{tenant.subdomain}.{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'shop.dagangos.com'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {tenant.customDomain ? (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm text-slate-700">{tenant.customDomain}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Platform subdomain only</span>
                      )}
                    </td>
                    <td>
                      <div className={cn('flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-medium', plan.bg, plan.color)}>
                        <plan.icon className="w-3 h-3" />
                        {plan.label}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">{formatDate(tenant.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/${locale}/admin/tenants/${tenant.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          <Settings2 className="w-3 h-3" />
                          Manage
                        </Link>
                        <div className="relative group/menu">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50 overflow-hidden">
                            <div className="p-1">
                              <Link 
                                href={`/${locale}/admin/tenants/${tenant.id}`}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-slate-100"
                              >
                                <Settings2 className="w-4 h-4" />
                                Edit Tenant
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {tenants.length} tenants</p>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled>Prev</button>
            <button className="px-2.5 py-1.5 text-xs rounded bg-indigo-600 text-white">1</button>
            <button className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-500 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {/* New Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Provision New Tenant</h3>
              <p className="text-sm text-slate-500 mt-0.5">Create a new isolated workspace on the platform</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Company Name *</label>
                <input 
                  type="text" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="DagangOS Corp" 
                  className="form-input w-full" 
                />
              </div>
              <div>
                <label className="form-label">Subdomain *</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    placeholder="dagangos" 
                    className="form-input flex-1" 
                  />
                  <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 whitespace-nowrap">
                    .{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'shop.dagangos.com'}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Alphanumeric + hyphens only. Cannot be: admin, api, system</p>
              </div>
              <div>
                <label className="form-label">Package Template</label>
                <select 
                  className="form-select"
                  value={formData.packageKey}
                  onChange={(e) => setFormData({ ...formData, packageKey: e.target.value })}
                >
                  <option value="landing_page">Landing Page Package (Rp 2.500.000)</option>
                  <option value="company_profile">Company Profile Package (Rp 4.000.000)</option>
                  <option value="business_website">Business Website + Admin (Rp 8.000.000)</option>
                  <option value="ecommerce">E-Commerce Platform (Rp 15.000.000)</option>
                  <option value="restaurant">Restaurant System (Rp 20.000.000)</option>
                  <option value="retail_pos">Retail POS + Website (Rp 25.000.000)</option>
                  <option value="custom">Custom Business Platform (Rp 30.000.000+)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Add-ons (Optional)</label>
                <div className="space-y-2 mt-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {[
                    { key: 'ai', label: 'AI Copywriter Suite (+Rp 250k/mo)' },
                    { key: 'booking', label: 'Booking & Scheduling (+Rp 500k/mo)' },
                    { key: 'crm', label: 'CRM & Timelines (+Rp 400k/mo)' },
                    { key: 'api', label: 'Developer API Webhooks (+Rp 750k/mo)' },
                  ].map(addon => (
                    <label key={addon.key} className="flex items-center gap-2 text-sm text-slate-700 font-normal">
                      <input 
                        type="checkbox" 
                        checked={formData.addons.includes(addon.key)}
                        onChange={(e) => {
                          const list = e.target.checked 
                            ? [...formData.addons, addon.key]
                            : formData.addons.filter((k: string) => k !== addon.key)
                          setFormData({ ...formData, addons: list })
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                      />
                      <span>{addon.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Admin Email *</label>
                <input 
                  type="email" 
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@yourcompany.com" 
                  className="form-input" 
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleProvision}
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {isCreating ? 'Provisioning...' : 'Provision Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
