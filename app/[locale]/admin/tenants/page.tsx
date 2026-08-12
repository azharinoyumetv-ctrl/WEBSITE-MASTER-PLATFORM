import { getTenants } from '@/lib/actions/tenant'
import { TenantsClient } from './tenants-client'
import { AdminState } from '../admin-state'

export default async function TenantsPage() {
  const res = await getTenants()

  if (!res.success) {
    const errorMsg = (res as any).error || 'Unknown error'
    const restricted = errorMsg.toLowerCase().includes('forbidden')
    if (!restricted) console.error('[admin-tenants] Failed to load tenants:', errorMsg)
    return <AdminState
      kind={restricted ? 'restricted' : 'error'}
      title={restricted ? 'Platform-owner access required' : 'Tenant administration is temporarily unavailable'}
      description={restricted
        ? 'Tenant provisioning and deletion are limited to platform owners. Your workspace data and other admin tools remain available.'
        : 'The tenant directory could not be loaded. Please retry shortly or review the server logs if the issue continues.'}
    />
  }

  const tenants = res.tenants!

  return <TenantsClient initialTenants={tenants} />
}
