import { getPublicWebsiteConfig } from '@/lib/actions/website'
import { getCatalogItems } from '@/lib/actions/catalog'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckoutClient } from './checkout-client'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'
  const websiteRes = await getPublicWebsiteConfig(tenantDomain)
  return {
    title: `Checkout - ${websiteRes.website?.siteTitle || 'Store'}`,
  }
}

export default async function CheckoutPage() {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'
  const websiteRes = await getPublicWebsiteConfig(tenantDomain)

  if (!websiteRes.success || !websiteRes.website) {
    redirect('/404')
  }
  
  const tenantId = websiteRes.website.tenantId
  const itemsRes = await getCatalogItems(tenantId)
  const items = itemsRes.items || []

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>
        <CheckoutClient tenantId={tenant.id} items={items} />
      </div>
    </div>
  )
}
