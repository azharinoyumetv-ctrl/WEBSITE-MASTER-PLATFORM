import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicWebsiteConfig, getPublicPage } from '@/lib/actions/website'
import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import { AboutClient } from '../about-client'
import { ContactClient } from '../contact-client'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  
  const slug = params.slug ? params.slug.join('/') : 'home'
  const pageLabels: Record<string, string> = {
    about: 'About Us',
    contact: 'Contact Us',
    products: 'Products',
    shop: 'Shop',
    catalog: 'Catalog',
  }
  
  if (!tenantId) return { title: pageLabels[slug] || 'Page' }

  const websiteRes = await getPublicWebsiteConfig(tenantId)
  const siteTitle = websiteRes.success && websiteRes.website?.siteTitle 
    ? websiteRes.website.siteTitle 
    : 'DagangOS Digital Indonesia'

  if (!websiteRes.success || !websiteRes.website) {
    return { title: `${pageLabels[slug] || 'Page'} | ${siteTitle}` }
  }

  const pageRes = await getPublicPage(websiteRes.tenantId!, slug)
  
  if (!pageRes.success || !pageRes.page) {
    return { title: `${pageLabels[slug] || 'Page'} | ${siteTitle}` }
  }

  const pageSeo = pageRes.page.seoMetadata as any || {}
  const globalSeo = websiteRes.website.globalSeoMetadata as any || {}

  return {
    title: `${pageRes.page.title} | ${siteTitle}`,
    description: pageSeo.description || globalSeo.description || ''
  }
}

// Built-in fallback templates for standard pages
function renderFallbackPage(slug: string, siteTitle: string, primaryColor: string, tenantId: string, locale: string, t: any) {
  if (slug === 'about') {
    return <AboutClient primaryColor={primaryColor} siteTitle={siteTitle} />
  }

  if (slug === 'contact') {
    return (
      <div className="min-h-screen bg-white">
        <section className="py-24" style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold mb-6" style={{ color: primaryColor }}>{t('contact_us')}</h1>
            <p className="text-xl text-slate-600">
              {t('contact_desc')}
            </p>
          </div>
        </section>

        <section className="py-20 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-8">{t('get_in_touch')}</h2>
              <div className="space-y-6">
                {[
                  { label: t('contact_email'), value: 'contact@dagangos.com', icon: '✉️' },
                  { label: t('contact_phone'), value: '+62 899 9155 182', icon: '📞' },
                  { label: t('contact_address'), value: 'Jakarta, Indonesia', icon: '📍' },
                  { label: t('contact_hours'), value: t('hours_value'), icon: '🕐' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p className="text-slate-600">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <ContactClient tenantId={tenantId} primaryColor={primaryColor} />
          </div>
        </section>
      </div>
    )
  }

  if (slug === 'privacy' || slug === 'terms') {
    const title = slug === 'privacy' ? t('privacy') : t('terms')
    const baseName = slug === 'privacy' ? 'Privacy_Policy' : 'Terms_of_Service'
    const localizedFileName = `${baseName}_${locale}.md`
    const defaultFileName = `${baseName}.md`

    let markdownContent = ''
    try {
      markdownContent = fs.readFileSync(path.join(process.cwd(), 'legal', localizedFileName), 'utf8')
    } catch (e) {
      try {
        markdownContent = fs.readFileSync(path.join(process.cwd(), 'legal', defaultFileName), 'utf8')
      } catch (e2) {
        markdownContent = '*Document is currently being updated.*'
      }
    }

    return (
      <div className="min-h-screen bg-white">
        <section className="py-24" style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold mb-6" style={{ color: primaryColor }}>{title}</h1>
          </div>
        </section>
        <section className="py-16 max-w-4xl mx-auto px-6 prose prose-slate max-w-none prose-h1:hidden">
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </section>
      </div>
    )
  }

  if (slug === 'products' || slug === 'shop') {
    const label = slug === 'shop' ? t('shop') : t('products')
    const sampleProducts = (t.raw('shop_products') as any[]) || []
    const addons = (t.raw('shop_addons') as any[]) || []

    return (
      <div className="min-h-screen bg-slate-50">
        <section className="py-24" style={{ background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%)` }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold mb-6" style={{ color: primaryColor }}>{label} {t('plans_title')}</h1>
            <p className="text-xl text-slate-600">
              {t('plans_subtitle')}
            </p>
            <div className="mt-4 inline-block bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-800">
              {t('infra_note2')}
            </div>
          </div>
        </section>

        {/* Packages Grid */}
        <section className="py-16 max-w-7xl mx-auto px-6 md:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">{t('choose_package')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sampleProducts.map((product) => (
              <div key={product.name} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                      {product.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{product.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed">{product.desc}</p>
                  <p className="text-3xl font-extrabold mb-6" style={{ color: primaryColor }}>{product.price}</p>
                  
                  {/* Features list */}
                  <div className="border-t border-slate-100 pt-6 mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('whats_included')}</p>
                    <ul className="space-y-2.5">
                      {product.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-600 text-sm">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <a 
                  href="/contact"
                  className="block text-center py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  {t('get_started')}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Add-ons Section */}
        <section className="py-16 max-w-7xl mx-auto px-6 md:px-8 border-t border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">{t('addons_title')}</h2>
          <p className="text-center text-slate-500 mb-12">{t('addons_subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {addons.map((addon) => (
              <div key={addon.name} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{addon.name}</h3>
                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{addon.price}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{addon.desc}</p>
                </div>
                <div className="mt-4 border-t border-slate-50 pt-4 flex justify-end">
                  <a href="/contact" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">{t('add_to_package')}</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return null
}

export default async function SitePage({ params }: { params: { slug?: string[], locale: string } }) {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  const t = await getTranslations('Storefront')

  const slug = params.slug ? params.slug.join('/') : 'home'

  // Standard pages that have built-in fallback templates
  const standardPages = ['about', 'contact', 'products', 'shop', 'catalog', 'privacy', 'terms']

  // Try to get the website config & DB page
  let websiteConfig: any = null
  let dbPage: any = null
  let primaryColor = '#4f46e5'
  let siteTitle = 'DagangOS Digital Indonesia'

  if (tenantId) {
    const websiteRes = await getPublicWebsiteConfig(tenantId)
    if (websiteRes.success && websiteRes.website) {
      websiteConfig = websiteRes.website
      const themeConfig = websiteConfig.themeConfig as any || {}
      const colors = themeConfig.colors || {}
      primaryColor = colors.primary || '#4f46e5'
      siteTitle = websiteConfig.siteTitle || siteTitle

      // Try to get specific DB page
      const pageRes = await getPublicPage(websiteRes.tenantId!, slug)
      if (pageRes.success && pageRes.page) {
        dbPage = pageRes.page
      }
    }
  }

  // Force standard pages to use fallback templates for absolute localization
  if (['shop', 'products', 'about', 'contact'].includes(slug)) {
    return renderFallbackPage(slug, siteTitle, primaryColor, tenantId || '', params.locale, t)
  }

  // If there's a DB page, render it
  if (dbPage) {
    // BR-2: Soft delete + 301 redirect matrix
    if (dbPage.isDeleted) {
      permanentRedirect(dbPage.redirectTo || '/home')
    }

    const themeConfig = websiteConfig?.themeConfig as any || {}
    const layoutBlocks = (dbPage.layoutBlocks as any[]) || []

    return (
      <div 
        className="min-h-screen" 
        style={{ 
          backgroundColor: themeConfig.colors?.background || '#ffffff',
          color: themeConfig.colors?.text || '#111827'
        }}
      >
        <main className="max-w-7xl mx-auto p-6 py-12">
          {layoutBlocks.length === 0 ? (
            <div className="prose max-w-none py-20 text-center">
              <h1 className="text-4xl font-bold mb-4" style={{ color: primaryColor }}>{dbPage.title}</h1>
              <p className="text-slate-600">This page has no content yet.</p>
            </div>
          ) : (
            layoutBlocks.map((block, index) => {
              switch (block.type) {
                case 'hero':
                  return (
                    <section key={index} className="py-20 text-center">
                      <h1 className="text-5xl font-extrabold mb-4">{block.data?.heading}</h1>
                      <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">{block.data?.subheading}</p>
                      {block.data?.cta && (
                        <button 
                          className="px-8 py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {block.data.cta}
                        </button>
                      )}
                    </section>
                  )
                case 'text':
                  return (
                    <section key={index} className="py-8 prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: block.data?.html || '' }} />
                    </section>
                  )
                case 'features':
                  return (
                    <section key={index} className="py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                      {block.data?.items?.map((item: any, i: number) => (
                        <div key={i} className="p-6 rounded-2xl bg-black/5 border border-black/10">
                          <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                          <p className="opacity-80">{item.description}</p>
                        </div>
                      ))}
                    </section>
                  )
                default:
                  return null
              }
            })
          )}
        </main>
      </div>
    )
  }

  // If it's a standard page, render the built-in fallback template
  if (standardPages.includes(slug)) {
    return renderFallbackPage(slug, siteTitle, primaryColor, tenantId || '', params.locale, t)
  }

  // For all other unknown pages, show 404
  notFound()
}
