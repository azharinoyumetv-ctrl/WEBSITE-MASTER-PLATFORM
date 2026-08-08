import prisma from '@/lib/prisma'
import { getCanonicalOriginForHost, getTenantKeyFromHostname, normalizeHostname } from '@/lib/tenant-host'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const host = normalizeHostname(request.headers.get('x-forwarded-host') || request.headers.get('host'))
  const tenantKey = getTenantKeyFromHostname(host)

  if (tenantKey !== 'default') {
    const tenant = await prisma.systemTenant.findFirst({
      where: {
        status: 'active',
        OR: [{ subdomain: tenantKey }, { customDomain: host }],
        website: { is: { isActive: true } },
      },
      select: { id: true },
    })

    if (!tenant) {
      return new Response('User-Agent: *\nDisallow: /\n', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
  }

  const origin = getCanonicalOriginForHost(host)
  const body = [
    'User-Agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /*/admin/',
    'Disallow: /*/auth/',
    'Disallow: /*/orders/',
    '',
    `Host: ${origin}`,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, must-revalidate, no-transform',
    },
  })
}
