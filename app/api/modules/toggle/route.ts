import { NextResponse } from 'next/server'
import { toggleTenantModule } from '@/lib/actions/module'
import { getAuthenticatedUser } from '@/lib/rbac'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'modules_toggle', 20, 60 * 1000)
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const user = await getAuthenticatedUser()
    const { tenantId, moduleKey, isEnabled } = await req.json()

    if (user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized tenant access' }, { status: 403 })
    }

    const res = await toggleTenantModule(tenantId, moduleKey, isEnabled)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json({ success: true, module: res.module })
  } catch (error: any) {
    console.error('[modules/toggle] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
