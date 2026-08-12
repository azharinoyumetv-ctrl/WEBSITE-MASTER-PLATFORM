import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { validateV1Request } from '@/lib/v1-auth'
import { withTenantApiTelemetry } from '@/lib/api-telemetry'

const tenantIdSchema = z.string().uuid()

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const startedAt = Date.now()
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const parsedTenantId = tenantIdSchema.safeParse(params.tenantId)
    if (!parsedTenantId.success) {
      return NextResponse.json({ success: false, error: 'Invalid tenantId' }, { status: 400 })
    }

    const tenantId = parsedTenantId.data
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
