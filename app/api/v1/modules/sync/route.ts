import { NextResponse } from 'next/server'
import { getAuthenticatedV1Instance, validateV1Request } from '@/lib/v1-auth'
import { withTenantApiTelemetry } from '@/lib/api-telemetry'

export async function POST(req: Request) {
  const startedAt = Date.now()
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { modules, syncId } = body

    if (!Array.isArray(modules) || modules.some(moduleKey => typeof moduleKey !== 'string') || !syncId) {
      return NextResponse.json({ success: false, error: 'Missing sync modules or syncId' }, { status: 400 })
    }

    const instance = await getAuthenticatedV1Instance(req)
    if (!instance) {
      return NextResponse.json({ success: false, error: 'Unknown license' }, { status: 403 })
    }

    console.log(`[Instance Sync] Applied modules: ${modules.join(', ')} (Sync ID: ${syncId})`)

    const response = NextResponse.json({
      status: 'applied',
      syncId
    })
    return withTenantApiTelemetry({ tenantId: instance.tenantId, request: req, response, startedAt })
  } catch (error: any) {
    console.error('[v1/modules/sync] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
