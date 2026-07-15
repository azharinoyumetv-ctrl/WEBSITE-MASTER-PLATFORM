import { getTenantModules } from '@/lib/actions/module'
import { ModulesClient } from './modules-client'
import { PLATFORM_MODULES } from '@/lib/constants'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

export default async function ModulesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const res = await getTenantModules(tenantId)

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    return (
      <div className="page-container animate-slide-up">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load module configuration</p>
            <p className="text-xs text-red-500 mt-1 font-mono">{errorMsg}</p>
            <p className="text-xs text-red-600 mt-2">
              Module states shown below may not reflect the actual database configuration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const dbModules = res.modules!

  // Merge dynamic DB state with the platform's static capability registry
  const modules = PLATFORM_MODULES.map(moduleDefinition => {
    const dbMod = dbModules.find(m => m.moduleKey === moduleDefinition.key)
    return {
      ...moduleDefinition,
      isEnabled: Boolean(dbMod?.isEnabled)
    }
  })

  return <ModulesClient initialModules={modules} tenantId={tenantId} />
}
