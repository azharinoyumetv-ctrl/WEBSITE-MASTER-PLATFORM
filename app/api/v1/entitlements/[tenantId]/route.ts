import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthenticatedV1Instance, validateV1Request } from '@/lib/v1-auth'
import { withTenantApiTelemetry } from '@/lib/api-telemetry'

const tenantIdSchema = z.string().uuid()

export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const startedAt = Date.now()
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const { tenantId: requestedTenantId } = await params
    const parsedTenantId = tenantIdSchema.safeParse(requestedTenantId)
    if (!parsedTenantId.success) {
      return NextResponse.json({ success: false, error: 'Invalid tenantId' }, { status: 400 })
    }

    const tenantId = parsedTenantId.data
    const instance = await getAuthenticatedV1Instance(req)
    if (!instance || instance.tenantId !== tenantId) {
      return NextResponse.json({ success: false, error: 'License is not authorized for this tenant' }, { status: 403 })
    }
    const respond = (response: NextResponse) => withTenantApiTelemetry({ tenantId, request: req, response, startedAt })

    const entitlement = await prisma.tenantEntitlement.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    if (!entitlement) {
      return respond(NextResponse.json({
        modules: [],
        featureFlags: {},
        quota: {}
      }))
    }

    return respond(NextResponse.json({
      modules: entitlement.enabledModules,
      featureFlags: entitlement.featureFlags,
      quota: entitlement.quota
    }))
  } catch (error: any) {
    console.error('[v1/entitlements] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
