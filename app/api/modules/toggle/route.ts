import { NextResponse } from 'next/server'
import { toggleTenantModule } from '@/lib/actions/module'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId, moduleKey, isEnabled } = await req.json()
    
    // Auth boundary check: Ensure the requester's context matches the tenant they are modifying, 
    // or they are a super-admin.
    const tokenTenantId = req.headers.get('x-tenant-id') || (session.user as any).tenantId
    if (tenantId !== tokenTenantId && !(session.user as any).roles.some((r: string) => r.toLowerCase() === 'super-admin')) {
      return NextResponse.json({ error: 'Tenant boundary violation' }, { status: 403 })
    }

    // toggleTenantModule internally enforces the platform_owner role check.
    const res = await toggleTenantModule(tenantId, moduleKey, isEnabled)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json({ success: true, module: res.module })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
