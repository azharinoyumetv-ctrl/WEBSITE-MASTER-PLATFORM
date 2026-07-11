import { getTenantFromHost } from '@/lib/tenant'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { OrdersClient } from './orders-client'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host') || ''
  const tenant = await getTenantFromHost(host)
  return {
    title: `My Orders - ${tenant?.name || 'Store'}`,
  }
}

export default async function OrdersPage() {
  const host = headers().get('host') || ''
  const tenant = await getTenantFromHost(host)

  if (!tenant) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">My Orders</h1>
        <OrdersClient tenantId={tenant.id} />
      </div>
    </div>
  )
}
