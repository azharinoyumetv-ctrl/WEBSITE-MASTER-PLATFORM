export const DEFAULT_WMP_DOMAIN = 'wmp.dagangos.com'

export const LEGACY_WMP_DOMAINS = new Set([
  'store.dagangos.com',
  'shop.dagangos.com',
])

export function normalizeHostname(hostHeader: string) {
  return hostHeader.split(':')[0].trim().toLowerCase()
}

export function getWmpBaseDomain() {
  const configured = normalizeHostname(process.env.NEXT_PUBLIC_BASE_DOMAIN || DEFAULT_WMP_DOMAIN)

  // Production WMP has exactly one platform hostname. A stale server env must
  // not silently reactivate either retired hostname after deployment.
  if (process.env.NODE_ENV === 'production' && LEGACY_WMP_DOMAINS.has(configured)) {
    return DEFAULT_WMP_DOMAIN
  }

  return configured
}

export function isLegacyWmpHostname(hostHeader: string) {
  return LEGACY_WMP_DOMAINS.has(normalizeHostname(hostHeader))
}

export function getCanonicalWmpUrl(pathname = '/', search = '') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(`${normalizedPath}${search}`, `https://${getWmpBaseDomain()}`)
}
