import { getPublicWebsiteConfig } from '@/lib/actions/website'
import { generateCheckoutNonce } from '@/lib/crypto'
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
    return (
      <div className="min-h-screen bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Checkout</h1>
          <p className="text-slate-500 mb-6">This storefront is not fully configured yet. Please contact support or try again later.</p>
        </div>
      </div>
    )
  }
  
  const tenantId = websiteRes.website.tenantId
  const itemsRes = await getCatalogItems(tenantId)
  const items = itemsRes.items || []
  const checkoutNonce = generateCheckoutNonce(tenantId)

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>
        <CheckoutClient tenantId={tenantId} items={items} checkoutNonce={checkoutNonce} website={websiteRes.website} />
      </div>
    </div>
  )
}
