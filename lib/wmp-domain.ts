export const DEFAULT_WMP_DOMAIN = 'wmp.dagangos.com'

export const LEGACY_WMP_DOMAINS = new Set([
  'store.dagangos.com',
  'shop.dagangos.com',
])

export function normalizeHostname(hostHeader: string) {
  return hostHeader.split(':')[0].trim().toLowerCase()
}

export function getWmpBaseDomain() {
  return normalizeHostname(process.env.NEXT_PUBLIC_BASE_DOMAIN || DEFAULT_WMP_DOMAIN)
}

export function isLegacyWmpHostname(hostHeader: string) {
  return LEGACY_WMP_DOMAINS.has(normalizeHostname(hostHeader))
}

export function getCanonicalWmpUrl(pathname = '/', search = '') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(`${normalizedPath}${search}`, `https://${getWmpBaseDomain()}`)
}
