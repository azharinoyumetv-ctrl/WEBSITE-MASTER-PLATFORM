import { getShifts, getSchedulerResources } from '@/lib/actions/shifts'
import { getAuthenticatedUser } from '@/lib/rbac'
import { ShiftsClient } from './shifts-client'

export default async function ShiftsPage() {
  const user = await getAuthenticatedUser()
  const tenantId = user.tenantId

  const [shiftsRes, resourcesRes] = await Promise.all([
    getShifts(tenantId),
    getSchedulerResources(tenantId)
  ])

  if (!shiftsRes.success || !resourcesRes.success) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-red-600">Failed to load shifts data</h2>
        <p className="text-slate-500 mt-2">{shiftsRes.error || resourcesRes.error}</p>
      </div>
    )
  }

  return (
    <ShiftsClient
      initialShifts={shiftsRes.shifts || []}
      terminals={resourcesRes.terminals || []}
      users={resourcesRes.users || []}
      tenantId={tenantId}
    />
  )
}
