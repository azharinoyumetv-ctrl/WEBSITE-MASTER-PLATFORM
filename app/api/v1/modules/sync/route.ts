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
    const { modules, syncId } = body

    if (!modules || !syncId) {
      return NextResponse.json({ success: false, error: 'Missing sync modules or syncId' }, { status: 400 })
    }

    const licenseKey = req.headers.get('x-license-key')
    const instance = licenseKey
      ? await prisma.tenantInstance.findFirst({ where: { licenseKeyHash: licenseKey }, select: { tenantId: true } })
      : null

    console.log(`[Instance Sync] Applied modules: ${modules.join(', ')} (Sync ID: ${syncId})`)

    const response = NextResponse.json({
      status: 'applied',
      syncId
    })
    return instance
      ? withTenantApiTelemetry({ tenantId: instance.tenantId, request: req, response, startedAt })
      : response
  } catch (error: any) {
    console.error('[v1/modules/sync] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
