import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPublicWebsiteConfig } from '@/lib/actions/website'
import { ProjectSetupClient } from './project-setup-client'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'
  const websiteRes = await getPublicWebsiteConfig(tenantDomain)
  return {
    title: `Start Your Project - ${websiteRes.website?.siteTitle || 'Store'}`,
  }
}

export default async function ProjectSetupPage() {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'
  const websiteRes = await getPublicWebsiteConfig(tenantDomain)

  if (!websiteRes.success || !websiteRes.website) {
    return (
      <div className="min-h-screen bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Start Your Project</h1>
          <p className="text-slate-500 mb-6">This storefront is not fully configured yet. Please contact support or try again later.</p>
        </div>
      </div>
    )
  }

  return <ProjectSetupClient tenantId={websiteRes.tenantId!} />
}
