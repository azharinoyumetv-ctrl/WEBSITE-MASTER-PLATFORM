import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN 
    ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}` 
    : 'https://store.dagangos.com'

  // Standard public routes across all locales
  const routes = ['', '/about', '/shop', '/contact', '/terms', '/privacy']

  const sitemapEntries = routes.map((route) => ({
    url: `${baseUrl}/en${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // You can also add Indonesian (/id) routes or dynamic product routes here

  return sitemapEntries
}
