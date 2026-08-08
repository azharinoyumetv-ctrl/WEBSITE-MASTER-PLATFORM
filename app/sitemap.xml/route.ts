import prisma from '@/lib/prisma'
import { getCanonicalOriginForHost, getTenantKeyFromHostname, normalizeHostname } from '@/lib/tenant-host'

export const dynamic = 'force-dynamic'

const platformRoutes = ['', '/pricing', '/business', '/site/about', '/site/catalog', '/site/shop', '/site/contact', '/site/support', '/site/terms', '/site/privacy', '/site/refund']
const locales = ['en', 'id'] as const

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[character] || character))
}

export async function GET(request: Request) {
  const host = normalizeHostname(request.headers.get('x-forwarded-host') || request.headers.get('host'))
  const tenantKey = getTenantKeyFromHostname(host)
  let routes: string[] = platformRoutes

  if (tenantKey !== 'default') {
    const tenant = await prisma.systemTenant.findFirst({
      where: {
        status: 'active',
        OR: [{ subdomain: tenantKey }, { customDomain: host }],
        website: { is: { isActive: true } },
      },
      select: {
        pages: {
          where: { isPublished: true, isDeleted: false },
          select: { slug: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!tenant || !tenant.pages.some(page => page.slug === 'home')) {
      return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    routes = tenant.pages
      .filter(page => page.slug !== 'catalog')
      .map(page => page.slug === 'home' ? '' : `/site/${page.slug}`)
  }

  const origin = getCanonicalOriginForHost(host)
  const entries = locales.flatMap(locale => routes.map(route => {
    const url = `${origin}/${locale}${route}`
    const alternate = locale === 'en' ? 'id' : 'en'
    return [
      '  <url>',
      `    <loc>${escapeXml(url)}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(url)}" />`,
      `    <xhtml:link rel="alternate" hreflang="${alternate}" href="${escapeXml(`${origin}/${alternate}${route}`)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/en${route}`)}" />`,
      `    <changefreq>${route === '' ? 'weekly' : 'monthly'}</changefreq>`,
      `    <priority>${route === '' ? '1.0' : '0.7'}</priority>`,
      '  </url>',
    ].join('\n')
  }))
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, must-revalidate, no-transform',
    },
  })
}
