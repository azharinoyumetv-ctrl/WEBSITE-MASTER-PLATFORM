import '@/app/globals.css'
import { generateThemeCssVars } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { DagangOSBrand } from '@/components/DagangOSBrand'
import { COMPANY } from '@/lib/company'
import { headers } from 'next/headers'
import { getPublicWebsiteConfig } from '@/lib/actions/website'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { SupportChatWidget } from './support-chat-widget'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'

export default async function SiteLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-id') || 'default'

  const res = await getPublicWebsiteConfig(tenantDomain)
  const t = await getTranslations('SiteNav')
  const tStore = await getTranslations('Storefront')
  
  let website: any = null
  let tenant: any = null

  if (res.success && res.website && res.tenant) {
    website = res.website
    tenant = res.tenant
  } else if (tenantDomain === 'default') {
    // Keep the platform marketing site available if the database is briefly
    // unavailable, but prefer the resolved active tenant whenever possible.
    website = {
      siteTitle: COMPANY.legalName,
      themeConfig: { colors: { primary: '#4F46E5', secondary: '#10B981', background: '#FFFFFF', text: '#0F172A', accent: '#F59E0B' } }
    }
    tenant = {
      id: 'default',
      companyName: COMPANY.legalName,
      subdomain: 'store',
      customDomain: null
    }
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Site Not Found</h1>
          <p className="text-slate-500">This website is currently inactive or does not exist.</p>
        </div>
      </div>
    )
  }
  
  // Parse theme configuration
  let themeConfig = { colors: { primary: '#4F46E5', secondary: '#10B981', background: '#FFFFFF', text: '#0F172A', accent: '#F59E0B' } }
  try {
    if (website.themeConfig) {
      const parsed = typeof website.themeConfig === 'string' ? JSON.parse(website.themeConfig) : website.themeConfig;
      if (parsed.colors) {
        themeConfig.colors = { ...themeConfig.colors, ...parsed.colors };
      }
      themeConfig = { ...themeConfig, ...parsed, colors: themeConfig.colors };
    }
  } catch (e) {
    console.error("Failed to parse theme config", e)
  }

  // Generate CSS variables for theme injection
  const cssVars = generateThemeCssVars(themeConfig)
  const primaryColor = themeConfig.colors.primary
  const logoUrl = tenant.logoUrl || null
  const isCompanyStorefront = tenantDomain === 'default'

  const navigationTree = [
    { label: t('home'), target: '/' },
    { label: t('about'), target: '/about' },
    { label: t('catalog'), target: '/catalog' },
    { label: t('shop'), target: '/shop' },
    { label: t('contact'), target: '/contact' },
  ]

  return (
    <div 
      className="min-h-screen flex flex-col tenant-themed"
      style={cssVars as unknown as React.CSSProperties} // Inject dynamic theme tokens
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": isCompanyStorefront ? COMPANY.legalName : tenant.companyName,
            "url": `https://${website.domain || tenant.subdomain + '.' + (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com')}`,
            "logo": logoUrl || (isCompanyStorefront ? '/dagangos-logo.jpg' : ''),
            "description": website.globalSeoMetadata?.description || ''
          })
        }}
      />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 shadow-[0_12px_36px_rgba(2,6,23,.22)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[4.5rem] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={website.siteTitle} className="h-10 w-10 rounded-lg object-cover" width={40} height={40} unoptimized />
            ) : isCompanyStorefront ? (
              <DagangOSBrand compact dark />
            ) : (
              <span className="font-bold text-xl tracking-tight" style={{ color: primaryColor }}>
                {website.siteTitle}
              </span>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[.04] p-1.5">
            {navigationTree.map((nav) => (
              <Link 
                key={nav.target} 
                href={nav.target} 
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[.08] hover:text-white"
              >
                {nav.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="dark" />
            
            <Link 
              href="/project-setup?package=landing_page&v=v2"
              className="hidden md:inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:shadow-emerald-400/25"
            >
              {tStore('shop_now')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[#f7fafc]">
        {children}
      </main>

      <footer className="relative overflow-hidden bg-slate-950 py-14 text-slate-400">
        <div className="absolute inset-0 dagangos-aurora opacity-35" />
        <div className="absolute inset-0 dagangos-grid opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative grid gap-10 md:grid-cols-4 mb-10">
            <div className="md:col-span-2">
              {isCompanyStorefront ? <DagangOSBrand dark /> : <h3 className="text-white font-bold text-lg mb-3">{tenant.companyName}</h3>}
              <p className="text-slate-500 text-sm leading-relaxed">
                {tStore('footer_desc')}
              </p>
              <Link href="/support" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3.5 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/20">Open internal support chat <span aria-hidden>↗</span></Link>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{tStore('quick_links')}</h4>
              <ul className="space-y-2">
                {navigationTree.map(nav => (
                  <li key={nav.target}>
                    <Link href={nav.target} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                      {nav.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">{tStore('platform')}</h4>
              <ul className="space-y-2">
                <li><Link href="/project-setup?package=landing_page&v=v2" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{tStore('shop_now')}</Link></li>
                <li><Link href="/support" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{tStore('support')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="relative border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm">&copy; {new Date().getFullYear()} {isCompanyStorefront ? COMPANY.legalName : tenant.companyName}. {tStore('all_rights')}</p>
              <div className="flex items-center gap-3">
                <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{tStore('terms')}</Link>
                <span className="text-slate-700 text-xs">&bull;</span>
                <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">{tStore('privacy')}</Link>
              </div>
            </div>
            <p className="text-xs opacity-50">{tStore('powered_by')}</p>
          </div>
        </div>
      </footer>
      {tenantDomain === 'default' && <SupportChatWidget />}
      <AnalyticsTracker tenantId={tenant.id} />
    </div>
  )
}
