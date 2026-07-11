import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTenantModules } from '@/lib/actions/module'
import { PLATFORM_MODULES } from '@/lib/constants'
import AdminLayoutClient from './admin-layout-client'
import { User } from 'next-auth'
import prisma from "@/lib/prisma"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const tenant = await prisma.systemTenant.findUnique({
    where: { id: tenantId }
  })

  const res = await getTenantModules(tenantId)
  // If module fetch fails, default to all platform modules enabled so nav is not hidden
  // This is a graceful degradation — modules page will show the real error state
  const dbModules = res.success ? res.modules : []
  if (!res.success) {
    console.error('[admin-layout] Failed to load tenant modules:', (res as any).error)
  }

  // Create map of enabled modules
  const enabledModules = new Set<string>()
  PLATFORM_MODULES.forEach(mockMod => {
    // If DB fetch failed, default all modules to enabled (graceful nav degradation)
    const dbMod = (dbModules || []).find((m: any) => m.moduleKey === mockMod.key)
    const isEnabled = res.success ? (dbMod ? dbMod.isEnabled : mockMod.isEnabled) : true
    if (isEnabled) {
      enabledModules.add(mockMod.key)
    }
  })

  const enabledModulesList = Array.from(enabledModules)

  return (
    <AdminLayoutClient 
      enabledModules={enabledModulesList}
      tenant={tenant}
      user={{
        name: session.user.name || session.user.email?.split('@')[0] || 'Admin User',
        role: (session.user as any).role || 'Tenant Admin'
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
