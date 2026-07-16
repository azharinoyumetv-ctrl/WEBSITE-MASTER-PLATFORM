export type TenantPublicAddress = {
  subdomain: string
  customDomain?: string | null
}

/**
 * Returns the browser-facing origin for a tenant. The platform/company tenant
 * intentionally uses the root storefront domain rather than `default.<domain>`.
 */
export function getTenantPublicUrl(
  tenant: TenantPublicAddress,
  baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com',
) {
  const domain = tenant.customDomain || (
    tenant.subdomain === 'default' ? baseDomain : `${tenant.subdomain}.${baseDomain}`
  )

  return `https://${domain}`
}
