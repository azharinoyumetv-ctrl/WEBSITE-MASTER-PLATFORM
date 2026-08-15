export const DEFAULT_WMP_DOMAIN = 'wmp.dagangos.com'

// These hostnames are intentionally reserved for other DagangOS products.
// WMP must never render, redirect, or claim them as alternate platform origins.
export const RESERVED_NON_WMP_DOMAINS = new Set([
  'store.dagangos.com',
  'shop.dagangos.com',
])

export function normalizeHostname(hostHeader: string) {
  return hostHeader.split(':')[0].trim().toLowerCase()
}

export function getWmpBaseDomain() {
  const configured = normalizeHostname(process.env.NEXT_PUBLIC_BASE_DOMAIN || DEFAULT_WMP_DOMAIN)

  // Production WMP has exactly one platform hostname. A stale server env must
  // not silently claim a hostname reserved for another DagangOS product.
  if (process.env.NODE_ENV === 'production' && RESERVED_NON_WMP_DOMAINS.has(configured)) {
    return DEFAULT_WMP_DOMAIN
  }

  return configured
}

export function isReservedNonWmpHostname(hostHeader: string) {
  return RESERVED_NON_WMP_DOMAINS.has(normalizeHostname(hostHeader))
}


export type TenantHostnameIdentity = {
  id: string
  subdomain?: string | null
  customDomain?: string | null
}

/**
 * Match an incoming hostname to a tenant without comparing a hostname slug to
 * the tenant UUID. This helper is deliberately database-free so middleware can
 * use the tenant identity already refreshed into the signed JWT.
 */
export function isHostnameForTenant(
  hostHeader: string,
  tenant: TenantHostnameIdentity,
) {
  const host = normalizeHostname(hostHeader)
  const baseDomain = getWmpBaseDomain()
  const subdomain = normalizeHostname(tenant.subdomain || '')
  const customDomain = normalizeHostname(tenant.customDomain || '')
  const tenantId = tenant.id.trim().toLowerCase()

  if (!host || !tenantId) return false
  if (customDomain && host === customDomain) return true
  if (subdomain && (host === `${subdomain}.${baseDomain}` || host === `${subdomain}.localhost`)) return true

  // Preserve UUID-based tenant hostnames for older self-hosted deployments.
  return host === `${tenantId}.${baseDomain}` || host === `${tenantId}.localhost`
}
