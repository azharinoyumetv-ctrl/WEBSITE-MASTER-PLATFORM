import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedV1Instance, licenseKeysMatch, validateV1Request } from '@/lib/v1-auth'
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

    const authenticatedLicenseKey = req.headers.get('x-license-key') || ''
    if (!licenseKeysMatch(authenticatedLicenseKey, licenseKey)) {
      return NextResponse.json({ success: false, error: 'Invalid license identity' }, { status: 401 })
    }

    const instance = await getAuthenticatedV1Instance(req)
    if (!instance || instance.instanceId !== instanceId) {
      return NextResponse.json({ success: false, error: 'Invalid license or instance' }, { status: 401 })
    }
    const respond = (response: NextResponse) => withTenantApiTelemetry({ tenantId: instance.tenantId, request: req, response, startedAt })

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
