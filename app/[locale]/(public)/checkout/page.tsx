import { getTenantFromHost } from '@/lib/tenant'
import { getCatalogItems } from '@/lib/actions/catalog'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CheckoutClient } from './checkout-client'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host') || ''
  const tenant = await getTenantFromHost(host)
  return {
    title: `Checkout - ${tenant?.name || 'Store'}`,
  }
}

export default async function CheckoutPage() {
  const host = headers().get('host') || ''
  const tenant = await getTenantFromHost(host)

  if (!tenant) {
    redirect('/')
  }

  const res = await getCatalogItems(tenant.id)
  const items = res.items || []

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>
        <CheckoutClient tenantId={tenant.id} items={items} />
      </div>
    </div>
  )
}
