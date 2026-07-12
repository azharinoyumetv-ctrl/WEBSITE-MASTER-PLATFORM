import { NextResponse } from 'next/server'
import { toggleTenantModule } from '@/lib/actions/module'
import { getAuthenticatedUser } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    await getAuthenticatedUser()

    const { tenantId, moduleKey, isEnabled } = await req.json()

    // toggleTenantModule internally enforces the platform_owner role check.
    const res = await toggleTenantModule(tenantId, moduleKey, isEnabled)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json({ success: true, module: res.module })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
