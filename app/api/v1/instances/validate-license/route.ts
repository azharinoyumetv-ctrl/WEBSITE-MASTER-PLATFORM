import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateV1Request } from '@/lib/v1-auth'
import { withTenantApiTelemetry } from '@/lib/api-telemetry'

export async function POST(req: Request) {
  const startedAt = Date.now()
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { licenseKey, instanceId } = body

    if (!licenseKey || !instanceId) {
      return NextResponse.json({ success: false, error: 'Missing license validation parameters' }, { status: 400 })
    }

    const instance = await prisma.tenantInstance.findUnique({
      where: { instanceId }
    })

    if (!instance) {
      return NextResponse.json({ success: false, error: 'Instance not found' }, { status: 404 })
    }
    const respond = (response: NextResponse) => withTenantApiTelemetry({ tenantId: instance.tenantId, request: req, response, startedAt })

    const valid = instance.licenseKeyHash === licenseKey

    if (!valid) {
      return respond(NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 401 }))
    }

    return respond(NextResponse.json({
      valid: true,
      tenantId: instance.tenantId,
      tier: 'enterprise',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }))
  } catch (error: any) {
    console.error('[v1/instances/validate-license] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
