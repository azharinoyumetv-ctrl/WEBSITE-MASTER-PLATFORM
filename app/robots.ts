import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN 
    ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}` 
    : 'https://wmp.dagangos.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/admin/',
        '/*/auth/',
        '/*/orders/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
