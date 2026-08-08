const RESERVED_TENANT_SUBDOMAINS = new Set([
  'admin',
  'api',
  'assets',
  'auth',
  'cdn',
  'mail',
  'send',
  'shop',
  'status',
  'store',
  'support',
  'wmp',
  'www',
])

export function isReservedTenantSubdomain(subdomain: string) {
  return RESERVED_TENANT_SUBDOMAINS.has(subdomain.trim().toLowerCase())
}
