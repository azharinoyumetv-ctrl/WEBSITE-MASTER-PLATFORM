import { MetadataRoute } from 'next'
import { getWmpBaseDomain } from '@/lib/wmp-domain'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = `https://${getWmpBaseDomain()}`

  const routes = ['', '/site/about', '/site/catalog', '/site/shop', '/site/contact', '/site/support', '/site/terms', '/site/privacy']
  const locales = ['en', 'id'] as const

  return locales.flatMap((locale) => routes.map((route) => {
    const alternateRoute = (alternateLocale: typeof locales[number]) => `${baseUrl}/${alternateLocale}${route}`
    return {
      url: alternateRoute(locale),
      changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
      priority: route === '' ? 1 : (route.includes('catalog') || route.includes('shop') ? 0.9 : 0.7),
      alternates: {
        languages: {
          en: alternateRoute('en'),
          id: alternateRoute('id'),
          'x-default': alternateRoute('en'),
        },
      },
    }
  }))
}
