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
