import { getAdminWebsiteConfig } from '@/lib/actions/website'
import { SettingsClient } from './settings-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from "@/lib/prisma"



export default async function SettingsPage() {
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

  const res = await getAdminWebsiteConfig(tenantId)
  const initialWebsite = res.success ? res.website : null

  return (
    <SettingsClient 
      initialWebsite={initialWebsite} 
      initialTenant={tenant} 
      tenantId={tenantId} 
    />
  )
}
