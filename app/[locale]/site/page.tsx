import { formatCurrency } from '@/lib/utils'
import { ArrowRight, ShoppingCart, Star } from 'lucide-react'
import { headers } from 'next/headers'
import { getPublicWebsiteConfig, getPublicPage } from '@/lib/actions/website'
import { getCatalogItems } from '@/lib/actions/catalog'
import { LandingClient } from './landing-client'

export default async function SiteHomePage() {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'

  // Get website config to get tenantId (and theme for default tenant)
  const websiteRes = await getPublicWebsiteConfig(tenantDomain)
  
  if (tenantDomain === 'default') {
    const primaryColor = websiteRes.website?.themeConfig 
      ? (typeof websiteRes.website.themeConfig === 'string' 
          ? JSON.parse(websiteRes.website.themeConfig) 
          : websiteRes.website.themeConfig).colors?.primary || '#4f46e5'
      : '#4f46e5'

    return <LandingClient primaryColor={primaryColor} />
  }

  if (!websiteRes.success || !websiteRes.tenantId) {
    return <div className="p-20 text-center text-slate-500">Site Not Found</div>
  }
  
  const tenantId = websiteRes.tenantId

  // Get home page
  const pageRes = await getPublicPage(tenantId, '/')
  
  if (pageRes.isDraft) {
    return <div className="p-20 text-center text-slate-500">This page is currently unpublished.</div>
  }

  let blocks: any[] = []
  if (pageRes.success && pageRes.page?.layoutBlocks) {
    try {
      blocks = typeof pageRes.page.layoutBlocks === 'string' ? JSON.parse(pageRes.page.layoutBlocks) : pageRes.page.layoutBlocks
    } catch (e) {
      console.error("Failed to parse blocks", e)
    }
  }

  // Get catalog items for catalog_grid block
  const catalogRes = await getCatalogItems(tenantId)
  const catalogItems = catalogRes.success ? catalogRes.items : []

  if (blocks.length === 0) {
    // Other tenants that don't have a configured landing page get a basic fallback
    return <div className="p-20 text-center text-slate-500">Welcome to this store. This page is currently empty.</div>
  }

  return (
    <div className="w-full">
      {blocks.sort((a, b) => a.sortOrder - b.sortOrder).map(block => {
        
        // 1. HERO BLOCK
        if (block.type === 'hero') {
          const ctaUrl = block.config?.ctaUrl === '/catalog' ? '/shop' : (block.config?.ctaUrl || '/shop')
          return (
            <div key={block.id} className="w-full bg-[var(--tenant-color-primary)] text-white py-24 md:py-32">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                  {block.config?.title}
                </h1>
                <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
                  {block.config?.subtitle}
                </p>
                <a href={ctaUrl} className="tenant-btn-primary inline-flex items-center gap-2">
                  {block.config?.ctaText} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )
        }

        // 2. FEATURES BLOCK
        if (block.type === 'features') {
          return (
            <div key={block.id} className="py-20 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center mb-16 text-slate-900">{block.config?.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {block.config?.items?.map((item: any, i: number) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                      <div className="w-12 h-12 bg-[var(--tenant-color-secondary)]/10 rounded-xl mx-auto mb-6 flex items-center justify-center text-[var(--tenant-color-secondary)] font-bold text-xl">
                        {i + 1}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        // 3. CATALOG GRID
        if (block.type === 'catalog_grid') {
          const items = (catalogItems || []).filter((i: any) => i.isPublished).slice(0, block.config?.limit || 4)
          return (
            <div key={block.id} className="py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-12">
                  <h2 className="text-3xl font-bold text-slate-900">{block.config?.title}</h2>
                  <a href="/products" className="text-[var(--tenant-color-secondary)] font-semibold hover:underline flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {items.map((item: any) => (
                    <div key={item.id} className="group cursor-pointer">
                      <div className="aspect-square bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
                        {item.images && item.images.length > 0 && (
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 backdrop-blur-sm z-10">
                          <button className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Add to Cart
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-slate-500 text-sm mb-2 font-mono">{item.sku}</p>
                      <p className="text-lg font-bold text-[var(--tenant-color-primary)]">{formatCurrency(item.basePrice)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        // 4. TESTIMONIALS
        if (block.type === 'testimonials') {
          return (
            <div key={block.id} className="py-20 bg-[var(--tenant-color-primary)]/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-center mb-16 text-slate-900">{block.config?.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {block.config?.items?.map((item: any, i: number) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex gap-1 mb-4 text-amber-400">
                        <Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" /><Star className="w-5 h-5 fill-current" />
                      </div>
                      <p className="text-lg text-slate-700 italic mb-6">"{item.text}"</p>
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
