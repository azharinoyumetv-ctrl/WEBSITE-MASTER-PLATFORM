import { getCategories, getCatalogItems } from '@/lib/actions/catalog'
import { CatalogClient } from './catalog-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CatalogPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <div className="p-8 text-red-500">Error: No tenant context found.</div>
  }

  const [categoriesRes, itemsRes] = await Promise.all([
    getCategories(tenantId),
    getCatalogItems(tenantId)
  ])

  const initialCategories = categoriesRes.success ? categoriesRes.categories : []
  const initialItems = itemsRes.success ? itemsRes.items : []

  return (
    <CatalogClient 
      initialItems={initialItems} 
      initialCategories={initialCategories} 
      tenantId={tenantId} 
    />
  )
}
