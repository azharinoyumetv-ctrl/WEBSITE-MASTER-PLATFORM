import { NextResponse } from 'next/server'
import { toggleTenantModule } from '@/lib/actions/module'
import { getAuthenticatedUser } from '@/lib/rbac'

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser()

    const { tenantId, moduleKey, isEnabled } = await req.json()

    if (user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Unauthorized tenant access" }, { status: 403 })
    }

    const res = await toggleTenantModule(tenantId, moduleKey, isEnabled)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json({ success: true, module: res.module })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
