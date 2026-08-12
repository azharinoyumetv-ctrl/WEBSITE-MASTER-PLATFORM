import { getWmpBaseDomain } from '@/lib/wmp-domain'

export type TenantPublicAddress = {
  subdomain: string
  customDomain?: string | null
}

/**
 * Returns the browser-facing origin for a tenant. The platform/company tenant
 * intentionally uses the root WMP domain rather than `default.<domain>`.
 */
export function getTenantPublicUrl(
  tenant: TenantPublicAddress,
  baseDomain = getWmpBaseDomain(),
) {
  const domain = tenant.customDomain || (
    tenant.subdomain === 'default' ? baseDomain : `${tenant.subdomain}.${baseDomain}`
  )

  return `https://${domain}`
}
