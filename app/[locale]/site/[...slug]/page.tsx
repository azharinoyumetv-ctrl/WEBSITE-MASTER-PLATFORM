import { headers } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import { getPublicWebsiteConfig, getPublicPage } from '@/lib/actions/website'
import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'
import { AboutClient } from '../about-client'
import { ContactClient } from '../contact-client'
import { SupportPageClient } from '../support-page-client'
import { getTranslations } from 'next-intl/server'
import { addonsList, packages } from '@/lib/constants/packages'
import { COMPANY } from '@/lib/company'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { slug?: string[], locale: string } }): Promise<Metadata> {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  const locale = params.locale === 'id' ? 'id' : 'en'
  const isIndonesian = locale === 'id'
  const slug = params.slug ? params.slug.join('/') : 'home'
  const pageLabels: Record<string, { en: string, id: string }> = {
    home: { en: 'Home', id: 'Beranda' },
    about: { en: 'About Us', id: 'Tentang Kami' },
    contact: { en: 'Contact Us', id: 'Hubungi Kami' },
    support: { en: 'Support', id: 'Dukungan' },
    products: { en: 'Products', id: 'Produk' },
    shop: { en: 'Ownership Packages', id: 'Paket Kepemilikan' },
    catalog: { en: 'Solutions', id: 'Solusi' },
    terms: { en: 'Terms of Service', id: 'Syarat & Ketentuan' },
    privacy: { en: 'Privacy Policy', id: 'Kebijakan Privasi' },
  }
  const pageDescriptions: Record<string, { en: string, id: string }> = {
    about: {
      en: 'Learn how DagangOS delivers self-hosted, modular digital business platforms for Indonesian companies.',
      id: 'Pelajari cara DagangOS menghadirkan platform bisnis digital modular dan self-hosted untuk perusahaan Indonesia.',
    },
    contact: {
      en: 'Talk with DagangOS about your website, commerce, POS, or custom business platform project.',
      id: 'Diskusikan proyek website, perdagangan, POS, atau platform bisnis khusus Anda bersama DagangOS.',
    },
    support: {
      en: 'Get public pre-sales guidance about DagangOS packages, project setup, and platform ownership.',
      id: 'Dapatkan panduan pra-penjualan tentang paket DagangOS, penyiapan proyek, dan kepemilikan platform.',
    },
    products: {
      en: 'Compare DagangOS one-time, self-hosted digital business platform packages.',
      id: 'Bandingkan paket platform bisnis digital DagangOS yang self-hosted dan sekali bayar.',
    },
    shop: {
      en: 'Compare one-time ownership packages for websites, e-commerce, restaurant operations, retail POS, and custom platforms.',
      id: 'Bandingkan paket kepemilikan sekali bayar untuk website, e-commerce, restoran, POS ritel, dan platform khusus.',
    },
    catalog: {
      en: 'Explore DagangOS solutions for brand websites, commerce, restaurant operations, retail POS, and custom workflows.',
      id: 'Jelajahi solusi DagangOS untuk website merek, perdagangan, restoran, POS ritel, dan alur kerja khusus.',
    },
    terms: {
      en: 'Read the DagangOS terms of service.',
      id: 'Baca syarat dan ketentuan layanan DagangOS.',
    },
    privacy: {
      en: 'Read how DagangOS handles personal data and privacy.',
      id: 'Baca cara DagangOS menangani data pribadi dan privasi.',
    },
  }
  const pageLabel = pageLabels[slug]?.[locale] || (isIndonesian ? 'Halaman' : 'Page')
  const defaultDescription = pageDescriptions[slug]?.[locale]
    || (isIndonesian
      ? 'Platform bisnis digital self-hosted sekali bayar untuk bisnis Indonesia.'
      : 'One-time, self-hosted digital business platforms for Indonesian businesses.')
  const canonicalPath = slug === 'home' ? `/${locale}` : `/${locale}/site/${slug}`
  const alternatePath = slug === 'home'
    ? (language: string) => `/${language}`
    : (language: string) => `/${language}/site/${slug}`
  const createMetadata = (resolvedTitle: string, description: string): Metadata => ({
    title: { absolute: resolvedTitle },
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: alternatePath('en'),
        id: alternatePath('id'),
        'x-default': alternatePath('en'),
      },
    },
    openGraph: {
      type: 'website',
      url: canonicalPath,
      locale: isIndonesian ? 'id_ID' : 'en_US',
      alternateLocale: isIndonesian ? ['en_US'] : ['id_ID'],
      title: resolvedTitle,
      description,
      images: [{
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'DagangOS Web — self-hosted digital business platforms',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: ['/og.png'],
    },
  })

  if (!tenantId) return createMetadata(`${pageLabel} | ${COMPANY.legalName}`, defaultDescription)

  const websiteRes = await getPublicWebsiteConfig(tenantId)
  const siteTitle = websiteRes.success && websiteRes.website?.siteTitle 
    ? websiteRes.website.siteTitle 
    : COMPANY.legalName

  if (!websiteRes.success || !websiteRes.website) {
    return createMetadata(`${pageLabel} | ${siteTitle}`, defaultDescription)
  }

  const pageRes = await getPublicPage(websiteRes.tenantId!, slug)
  
  if (pageRes.isDraft) {
    notFound()
  }

  if (!pageRes.success || !pageRes.page) {
    if (!['shop', 'products', 'about', 'contact', 'support', 'terms', 'privacy'].includes(slug)) {
      notFound()
    }
    return createMetadata(`${pageLabel} | ${siteTitle}`, defaultDescription)
  }

  const pageSeo = pageRes.page.seoMetadata as any || {}
  const globalSeo = websiteRes.website.globalSeoMetadata as any || {}

  if (['shop', 'products', 'about', 'contact', 'support', 'catalog', 'terms', 'privacy'].includes(slug)) {
    const standardDescription = isIndonesian
      ? defaultDescription
      : pageSeo.description || globalSeo.description || defaultDescription
    return createMetadata(`${pageLabel} | ${siteTitle}`, standardDescription)
  }

  const description = pageSeo.description || globalSeo.description || defaultDescription
  const databaseTitle = String(pageRes.page.title || pageLabel).trim()
  const resolvedTitle = databaseTitle.toLocaleLowerCase().includes(siteTitle.toLocaleLowerCase())
    ? databaseTitle
    : `${databaseTitle} | ${siteTitle}`
  return createMetadata(resolvedTitle, description)
}

// Built-in fallback templates for standard pages
function renderFallbackPage(slug: string, siteTitle: string, primaryColor: string, tenantId: string, locale: string, t: any) {
  if (slug === 'about') {
    return <AboutClient primaryColor={primaryColor} siteTitle={siteTitle} />
  }

  if (slug === 'contact') {
    return (
      <div className="min-h-screen bg-[#f7fafc]">
        <section className="relative isolate overflow-hidden py-24 text-white dagangos-aurora">
          <div className="absolute inset-0 dagangos-grid opacity-35" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">DagangOS Digital Indonesia</span>
            <h1 className="mt-6 text-5xl font-black tracking-[-0.045em] mb-6">{t('contact_us')}</h1>
            <p className="text-xl text-slate-300">
              {t('contact_desc')}
            </p>
          </div>
        </section>

        <section className="py-20 max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_16px_45px_rgba(15,23,42,.08)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{t('direct_contact')}</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950 mb-8">{t('get_in_touch')}</h2>
              <div className="space-y-6">
                {[
                  { label: t('contact_email'), value: 'contact@dagangos.com', icon: '✉️' },
                  { label: t('contact_phone'), value: '+62 899 9155 182', icon: '📞' },
                  { label: t('contact_address'), value: COMPANY.address, icon: '📍' },
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
            <ContactClient tenantId={tenantId} />
          </div>
        </section>
      </div>
    )
  }

  if (slug === 'support') {
    return <SupportPageClient />
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
      <div className="min-h-screen bg-[#f7fafc]">
        <section className="relative isolate overflow-hidden py-24 text-white dagangos-aurora">
          <div className="absolute inset-0 dagangos-grid opacity-35" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-black tracking-[-0.045em]">{title}</h1>
          </div>
        </section>
        <section className="my-16 max-w-4xl mx-auto rounded-[1.75rem] border border-slate-200 bg-white px-6 py-10 prose prose-slate max-w-none prose-h1:hidden shadow-[0_16px_45px_rgba(15,23,42,.08)]">
          <ReactMarkdown>{markdownContent}</ReactMarkdown>
        </section>
      </div>
    )
  }

  if (slug === 'products' || slug === 'shop') {
    const label = slug === 'shop' ? t('shop') : t('products')
    const sampleProducts = (t.raw('shop_products') as any[]) || []

    return (
      <div className="min-h-screen bg-[#f7fafc]">
        <section className="relative isolate overflow-hidden py-24 text-white dagangos-aurora">
          <div className="absolute inset-0 dagangos-grid opacity-35" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100">DagangOS launch packages</span>
            <h1 className="mt-6 text-5xl font-black tracking-[-0.045em] mb-6">{label} {t('plans_title')}</h1>
            <p className="text-xl text-slate-300">
              {t('plans_subtitle')}
            </p>
            <div className="mt-5 inline-block rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
              {t('infra_note2')}
            </div>
          </div>
        </section>

        {/* Packages Grid */}
        <section className="py-16 max-w-7xl mx-auto px-6 md:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">{t('choose_package')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sampleProducts.map((product, index) => {
              const packageKey = Object.keys(packages)[index] || 'landing_page'
              const pkg = packages[packageKey]
              return (
              <div key={product.name} className="relative overflow-hidden bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-[0_16px_45px_rgba(15,23,42,.08)] hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col justify-between">
                <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-500" />
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                      {product.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
                  <p className="text-slate-500 text-sm mb-4 leading-relaxed">{pkg.desc}</p>
                  <p className="text-3xl font-extrabold mb-6" style={{ color: primaryColor }}>{pkg.key === 'custom' ? 'Starting at ' : ''}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pkg.price)}</p>
                  
                  {/* Features list */}
                  <div className="border-t border-slate-100 pt-6 mb-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('whats_included')}</p>
                    <ul className="space-y-2.5">
                      {product.features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-slate-600 text-sm">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <a 
                  href={`/project-setup?package=${packageKey}`}
                  className="block text-center py-3 rounded-xl font-black text-slate-950 transition hover:-translate-y-0.5 w-full bg-gradient-to-r from-emerald-300 to-sky-400"
                >
                  {t('get_started')}
                </a>
              </div>
              )
            })}
          </div>
        </section>

        {/* Add-ons Section */}
        <section className="py-16 max-w-7xl mx-auto px-6 md:px-8 border-t border-slate-200">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">{t('addons_title')}</h2>
          <p className="text-center text-slate-500 mb-12">{t('addons_subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {addonsList.map((addon) => {
              const href = `/project-setup?package=landing_page&addons=${addon.key}`
              return (
              <div key={addon.name} className="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-[0_16px_45px_rgba(15,23,42,.06)] flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-slate-900">{addon.name}</h3>
                    <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(addon.price)}{addon.priceNote ? `, ${addon.priceNote}` : ''}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{addon.desc}</p>
                </div>
                <div className="mt-4 border-t border-slate-50 pt-4 flex justify-end">
                  <a href={href} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">{t('add_to_package')}</a>
                </div>
              </div>
              )
            })}
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
  const standardPages = ['about', 'contact', 'support', 'products', 'shop', 'catalog', 'privacy', 'terms']

  // Try to get the website config & DB page
  let websiteConfig: any = null
  let dbPage: any = null
  let primaryColor = '#4f46e5'
  let siteTitle = COMPANY.legalName
  let resolvedTenantId = ''

  if (tenantId) {
    const websiteRes = await getPublicWebsiteConfig(tenantId)
    if (websiteRes.success && websiteRes.website) {
      websiteConfig = websiteRes.website
      resolvedTenantId = websiteRes.tenantId || ''
      const themeConfig = websiteConfig.themeConfig as any || {}
      const colors = themeConfig.colors || {}
      primaryColor = colors.primary || '#4f46e5'
      siteTitle = websiteConfig.siteTitle || siteTitle

      // Try to get specific DB page
      const pageRes = await getPublicPage(websiteRes.tenantId!, slug)
      
      if (pageRes.isDraft) {
        notFound()
      }

      if (pageRes.success && pageRes.page) {
        dbPage = pageRes.page
      }
    }
  }

  // Force standard pages to use fallback templates for absolute localization
  if (['shop', 'products', 'about', 'contact', 'support'].includes(slug)) {
    return renderFallbackPage(slug, siteTitle, primaryColor, resolvedTenantId, params.locale, t)
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
    return renderFallbackPage(slug, siteTitle, primaryColor, resolvedTenantId, params.locale, t)
  }

  // For all other unknown pages, show 404
  notFound()
}
