import { MetadataRoute } from 'next'
import { getWmpBaseDomain } from '@/lib/wmp-domain'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${getWmpBaseDomain()}`

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
