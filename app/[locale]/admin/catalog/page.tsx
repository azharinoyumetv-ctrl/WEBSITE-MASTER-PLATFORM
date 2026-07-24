import { getCategories, getAdminCatalogItems } from '@/lib/actions/catalog'
import { CatalogClient } from './catalog-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminState } from '../admin-state'

export default async function CatalogPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/auth/login')
  }

  const tenantId = (session.user as any).tenantId
  
  if (!tenantId) {
    return <AdminState kind="context" title="Workspace context unavailable" description="Sign in through your assigned workspace before opening the catalog." />
  }

  const [categoriesRes, itemsRes] = await Promise.all([
    getCategories(tenantId),
    getAdminCatalogItems(tenantId)
  ])

  const hasError = !categoriesRes.success || !itemsRes.success
  if (hasError) {
    const errorMsg = (!categoriesRes.success ? (categoriesRes as any).error : (itemsRes as any).error) || 'Unknown error'
    console.error('[admin-catalog] Failed to load catalog:', errorMsg)
    return <AdminState title="Catalog could not be loaded" description="Product and category data is temporarily unavailable. Please retry shortly; no catalog records were changed." />
  }

  const initialCategories = categoriesRes.categories!
  const initialItems = itemsRes.items!

  return (
    <CatalogClient 
      initialItems={initialItems} 
      initialCategories={initialCategories} 
      tenantId={tenantId} 
    />
  )
}
