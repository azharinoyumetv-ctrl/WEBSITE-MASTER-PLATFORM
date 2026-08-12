import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN 
    ? `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN}` 
    : 'https://store.dagangos.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/*/admin/',
        '/*/auth/',
        '/*/checkout/',
        '/*/orders/',
        '/*/project-setup/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
