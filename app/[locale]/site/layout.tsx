import '@/app/globals.css'
import { generateThemeCssVars } from '@/lib/utils'
import Link from 'next/link'
import { headers } from 'next/headers'
import { getPublicWebsiteConfig } from '@/lib/actions/website'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

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

  if (tenantDomain === 'default') {
    website = {
      siteTitle: 'Website Master Platform',
      themeConfig: { colors: { primary: '#4F46E5', secondary: '#10B981', background: '#FFFFFF', text: '#0F172A', accent: '#F59E0B' } }
    }
    tenant = {
      id: 'default',
      companyName: 'Master Platform Default',
      subdomain: 'store',
      customDomain: null
    }
  } else {
    if (!res.success || !res.website || !res.tenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Site Not Found</h1>
            <p className="text-slate-500">This website is currently inactive or does not exist.</p>
          </div>
        </div>
      )
    }
    website = res.website
    tenant = res.tenant
  }
  
  // Parse theme configuration
  let themeConfig = { colors: { primary: '#4F46E5', secondary: '#10B981', background: '#FFFFFF', text: '#0F172A', accent: '#F59E0B' } }
  try {
    if (website.themeConfig) {
      const parsed = typeof website.themeConfig === 'string' ? JSON.parse(website.themeConfig) : website.themeConfig;
      if (parsed.colors) themeConfig = parsed;
    }
  } catch (e) {
    console.error("Failed to parse theme config", e)
  }

  // Generate CSS variables for theme injection
  const cssVars = generateThemeCssVars(themeConfig)
  const primaryColor = themeConfig.colors.primary

  const navigationTree = [
    { label: t('home'), target: '/' },
    { label: t('about'), target: '/about' },
    { label: t('shop'), target: '/shop' },
    { label: t('contact'), target: '/contact' },
  ]

  return (
    <div 
      className="min-h-screen flex flex-col tenant-themed"
      style={cssVars as unknown as React.CSSProperties} // Inject dynamic theme tokens
    >
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={website.siteTitle} className="h-8 max-w-[150px] object-contain" />
            ) : (
              <span className="font-bold text-xl tracking-tight" style={{ color: primaryColor }}>
                {website.siteTitle}
              </span>
            )}
          </Link>
          <nav className="hidden md:flex gap-8">
            {navigationTree.map((nav) => (
              <Link 
                key={nav.target} 
                href={nav.target} 
                className="text-sm font-medium text-slate-700 hover:opacity-80 transition-opacity"
              >
                {nav.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            
            <Link 
              href="/shop" 
              className="hidden md:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {tStore('shop_now')}
            </Link>
            <Link 
              href="/auth/login" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {tStore('login')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-white">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-white font-bold text-lg mb-3">{tenant.companyName}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {tStore('footer_desc')}
              </p>
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
                <li><Link href="/auth/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{tStore('admin_login')}</Link></li>
                <li><Link href="/shop" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{tStore('shop_now')}</Link></li>
                <li><Link href="/contact" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{tStore('support')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm">&copy; {new Date().getFullYear()} {tenant.companyName}. {tStore('all_rights')}</p>
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
    </div>
  )
}
