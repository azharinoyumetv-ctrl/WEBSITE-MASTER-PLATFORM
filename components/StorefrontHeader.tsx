import Link from 'next/link'
import { DagangOSBrand } from '@/components/DagangOSBrand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type StorefrontHeaderProps = {
  labels: {
    home: string
    about: string
    catalog: string
    shop: string
    contact: string
    shopNow: string
  }
}

/**
 * Public routes outside `/site` (project setup, orders, and checkout) do not
 * inherit the storefront layout. Keep their navigation visually and
 * behaviourally consistent with the main DagangOS storefront.
 */
export function StorefrontHeader({ labels }: StorefrontHeaderProps) {
  const navigation = [
    { label: labels.home, href: '/site' },
    { label: labels.about, href: '/site/about' },
    { label: labels.catalog, href: '/site/catalog' },
    { label: labels.shop, href: '/site/shop' },
    { label: labels.contact, href: '/site/contact' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 shadow-[0_12px_36px_rgba(15,23,42,.10)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/site"
          aria-label="Back to DagangOS home"
          title="Back to DagangOS home"
          className="rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <DagangOSBrand compact />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            href="/project-setup?package=landing_page&v=v2"
            className="hidden rounded-xl bg-gradient-to-r from-emerald-300 to-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:shadow-emerald-400/25 sm:inline-flex"
          >
            {labels.shopNow}
          </Link>
        </div>
      </div>
      <nav aria-label="Storefront navigation" className="border-t border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6 lg:px-8 [scrollbar-width:none]">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-slate-950 focus-visible:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
