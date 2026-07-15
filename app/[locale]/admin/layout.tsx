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
  PLATFORM_MODULES.forEach(moduleDefinition => {
    const dbMod = (dbModules || []).find((m: any) => m.moduleKey === moduleDefinition.key)
    // Do not advertise unavailable capabilities if the module lookup fails.
    const isEnabled = res.success ? Boolean(dbMod?.isEnabled) : moduleDefinition.isCore
    if (isEnabled) {
      enabledModules.add(moduleDefinition.key)
    }
  })

  const enabledModulesList = Array.from(enabledModules)
  const roles = ((session.user as any).roles || []) as string[]
  const normalizedRoles = roles.map(role => role.toLowerCase())
  const roleLabel = normalizedRoles.includes('platform_owner') || normalizedRoles.includes('platform owner')
    ? 'Platform Owner'
    : normalizedRoles.includes('super-admin')
      ? 'Super Admin'
      : roles[0] || 'Tenant Admin'

  return (
    <AdminLayoutClient 
      enabledModules={enabledModulesList}
      tenant={tenant}
      user={{
        name: session.user.name || session.user.email?.split('@')[0] || 'Admin User',
        role: roleLabel
      }}
    >
      {children}
    </AdminLayoutClient>
  )
}
