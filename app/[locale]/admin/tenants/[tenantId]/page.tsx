import { getTenantById } from '@/lib/actions/tenant'
import { redirect } from 'next/navigation'
import { ArrowLeft, Building2, Globe, Calendar, CheckCircle2, XCircle, CreditCard, Box, Settings, Users, Star, Activity, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getStatusBadgeClass } from '@/lib/utils'
import { TenantDetailsClient } from './tenant-details-client'

export default async function TenantDetailsPage({ params }: { params: { tenantId: string } }) {
  const { tenantId } = params

  const res = await getTenantById(tenantId)
  if (!res.success || !res.tenant) {
    redirect('/admin/tenants')
  }

  const tenant = res.tenant
  const planColors: Record<string, string> = {
    core: 'bg-slate-100 text-slate-700',
    enterprise: 'bg-indigo-100 text-indigo-700',
    agency: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="page-container animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/tenants" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {tenant.companyName}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeClass(tenant.status)}`}>
              {tenant.status}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            {tenant.customDomain || `${tenant.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com'}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Quick Stats & Info */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Tenant Details
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Company Name</p>
                <p className="font-medium text-slate-900">{tenant.companyName}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Subdomain</p>
                <p className="font-medium text-slate-900 font-mono text-xs bg-slate-100 p-1.5 rounded">{tenant.subdomain}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Plan Level</p>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${planColors[tenant.plan] || planColors.core}`}>
                  {tenant.plan}
                </span>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Created On</p>
                <p className="font-medium text-slate-900">{formatDate(tenant.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Registered Users ({tenant.users?.length || 0})
            </h3>
            <div className="space-y-3">
              {tenant.users?.slice(0, 5).map((user: any) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.firstName} {user.lastName}</p>
                    <div className="group relative cursor-help" title="Hover to reveal email">
                      <p className="text-xs text-slate-500 truncate group-hover:hidden">
                        {user.email.charAt(0)}***@{user.email.split('@')[1] || ''}
                      </p>
                      <p className="text-xs text-slate-500 truncate hidden group-hover:block">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {tenant.users?.length === 0 && (
                <p className="text-sm text-slate-500 italic">No users registered yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Modules & Actions */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              Enabled Modules
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tenant.modules?.map((mod: any) => (
                <div key={mod.id} className={`p-3 rounded-xl border ${mod.isEnabled ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-2 h-2 rounded-full ${mod.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 capitalize">
                    {mod.moduleKey.replace('_module', '').replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 border-red-100 bg-red-50/10">
            <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              These actions are destructive and will immediately affect the tenant's access to the platform.
            </p>
            
            <TenantDetailsClient tenantId={tenant.id} currentStatus={tenant.status} />
          </div>
        </div>
      </div>
    </div>
  )
}
