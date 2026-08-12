import prisma from '@/lib/prisma'

/**
 * Resolves a public request to the same active tenant that renders the
 * storefront. This must happen on the server: a tenant ID received from the
 * browser is not an authorization boundary.
 */
export async function resolvePublicTenant(request: Request) {
  const requestUrl = new URL(request.url)
  return resolvePublicTenantFromHost(
    request.headers.get('host') || requestUrl.hostname,
    request.headers.get('x-tenant-id'),
  )
}

export async function resolvePublicTenantFromHost(hostHeader: string, tenantContext: string | null) {
  const host = hostHeader.split(':')[0].toLowerCase()
  const context = (tenantContext || '').toLowerCase()
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com').toLowerCase()
  const isDefaultHost = context === 'default' || host === baseDomain || host === 'localhost' || host === '127.0.0.1' || host.startsWith('www.')

  if (isDefaultHost) {
    return prisma.systemTenant.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, subdomain: true, customDomain: true, companyName: true },
    })
  }

  const tenantDomain = context || host
  return prisma.systemTenant.findFirst({
    where: {
      status: 'active',
      OR: [{ subdomain: tenantDomain }, { customDomain: host }],
    },
    select: { id: true, subdomain: true, customDomain: true, companyName: true },
  })
}
