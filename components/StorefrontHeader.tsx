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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white shadow-[0_12px_36px_rgba(2,6,23,.28)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/site"
          aria-label="Back to DagangOS home"
          title="Back to DagangOS home"
          className="rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <DagangOSBrand compact dark />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="dark" />
          <Link
            href="/project-setup?package=landing_page&v=v2"
            className="dagangos-cta-gradient hidden rounded-xl px-4 py-2.5 text-sm font-black sm:inline-flex"
          >
            {labels.shopNow}
          </Link>
        </div>
        <nav aria-label="Storefront navigation" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
          <div className="flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[.08] hover:text-white focus-visible:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <nav aria-label="Storefront navigation" className="border-t border-white/10 bg-slate-950/80 lg:hidden">
        <div className="mx-auto flex max-w-7xl justify-start gap-1 overflow-x-auto px-3 py-2 sm:justify-center sm:px-6 [scrollbar-width:none]">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[.08] hover:text-white focus-visible:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
