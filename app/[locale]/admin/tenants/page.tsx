import { getTenants } from '@/lib/actions/tenant'
import { TenantsClient } from './tenants-client'

export default async function TenantsPage() {
  const res = await getTenants()
  const tenants = res.success ? res.tenants : []

  return <TenantsClient initialTenants={tenants} />
}
