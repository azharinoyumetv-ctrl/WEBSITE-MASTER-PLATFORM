import { getAdminWebsiteConfig } from '@/lib/actions/website'
import { SettingsClient } from './settings-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from "@/lib/prisma"

import { requirePermission } from '@/lib/rbac'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  const userId = (session.user as any).id
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  // Enforce role boundary
  await requirePermission(userId, tenantId, 'website', 'read')

  const tenant = await prisma.systemTenant.findUnique({
    where: { id: tenantId }
  })

  const res = await getAdminWebsiteConfig(tenantId)
  const initialWebsite = res.success ? res.website : null

  const aiConfig = await prisma.tenantAiConfiguration.findUnique({
    where: { tenantId }
  })

  return (
    <SettingsClient 
      initialWebsite={initialWebsite} 
      initialTenant={tenant} 
      initialAiConfig={aiConfig}
      tenantId={tenantId} 
    />
  )
}
