const platformBaseDomain = () => (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'wmp.dagangos.com').toLowerCase()
const tenantBaseDomain = () => (process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || 'dagangos.com').toLowerCase()

export function normalizeHostname(hostHeader: string | null | undefined) {
  return (hostHeader || '').split(':')[0].trim().toLowerCase()
}

export function getTenantKeyFromHostname(hostHeader: string | null | undefined) {
  const hostname = normalizeHostname(hostHeader)
  const platformDomain = platformBaseDomain()
  const tenantDomain = tenantBaseDomain()
  const platformAliases = new Set([platformDomain, 'store.dagangos.com', 'www.dagangos.com'])

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || platformAliases.has(hostname)) {
    return 'default'
  }

  if (hostname.endsWith(`.${platformDomain}`)) {
    const legacySubdomain = hostname.slice(0, -(platformDomain.length + 1))
    if (legacySubdomain && !legacySubdomain.includes('.')) return legacySubdomain
  }

  if (hostname.endsWith(`.${tenantDomain}`)) {
    const subdomain = hostname.slice(0, -(tenantDomain.length + 1))
    if (subdomain && !subdomain.includes('.')) return subdomain
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.slice(0, -'.localhost'.length)
  }

  // A hostname outside the managed domains may be a verified custom domain.
  return hostname
}

export function getPlatformBaseDomain() {
  return platformBaseDomain()
}

export function getTenantBaseDomain() {
  return tenantBaseDomain()
}

export function getCanonicalOriginForHost(hostHeader: string | null | undefined) {
  const hostname = normalizeHostname(hostHeader)
  const tenantKey = getTenantKeyFromHostname(hostname)
  if (tenantKey === 'default') return `https://${platformBaseDomain()}`
  return `https://${hostname}`
}
