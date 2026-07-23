import { getTenantModules } from '@/lib/actions/module'
import { ModulesClient } from './modules-client'
import { PLATFORM_MODULES } from '@/lib/constants'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function ModulesPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before managing modules." />
  }

  const res = await getTenantModules(tenantId)

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    console.error('[admin-modules] Failed to load modules:', errorMsg)
    return <AdminState title="Module configuration could not be loaded" description="Capability states are temporarily unavailable. No module was enabled or disabled." />
  }

  const dbModules = res.modules!

  // Merge dynamic DB state with the platform's static capability registry
  const modules = PLATFORM_MODULES.map(moduleDefinition => {
    const dbMod = dbModules.find(m => m.moduleKey === moduleDefinition.key)
    return {
      ...moduleDefinition,
      isEnabled: dbMod ? Boolean(dbMod.isEnabled) : moduleDefinition.isCore
    }
  })

  return <ModulesClient initialModules={modules} tenantId={tenantId} />
}
