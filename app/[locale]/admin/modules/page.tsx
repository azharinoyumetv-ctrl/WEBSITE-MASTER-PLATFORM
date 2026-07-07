import { getTenantModules } from '@/lib/actions/module'
import { ModulesClient } from './modules-client'
import { PLATFORM_MODULES } from '@/lib/constants'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

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
  const dbModules = res.success ? res.modules : []

  // Merge DB state with Mock catalog
  const modules = PLATFORM_MODULES.map(mockMod => {
    const dbMod = dbModules.find(m => m.moduleKey === mockMod.key)
    return {
      ...mockMod,
      isEnabled: dbMod ? dbMod.isEnabled : mockMod.isEnabled
    }
  })

  return <ModulesClient initialModules={modules} tenantId={tenantId} />
}
