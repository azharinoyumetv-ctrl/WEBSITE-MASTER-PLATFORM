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
  platformBaseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'wmp.dagangos.com',
  tenantBaseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || 'dagangos.com',
) {
  const domain = tenant.customDomain || (
    tenant.subdomain === 'default' ? platformBaseDomain : `${tenant.subdomain}.${tenantBaseDomain}`
  )

  return `https://${domain}`
}
