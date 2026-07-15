import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { validateV1Request } from '@/lib/v1-auth'

const tenantIdSchema = z.string().uuid()

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const parsedTenantId = tenantIdSchema.safeParse(params.tenantId)
    if (!parsedTenantId.success) {
      return NextResponse.json({ success: false, error: 'Invalid tenantId' }, { status: 400 })
    }

    const tenantId = parsedTenantId.data

    const entitlement = await prisma.tenantEntitlement.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    if (!entitlement) {
      return NextResponse.json({
        modules: [],
        featureFlags: {},
        quota: {}
      })
    }

    return NextResponse.json({
      modules: entitlement.enabledModules,
      featureFlags: entitlement.featureFlags,
      quota: entitlement.quota
    })
  } catch (error: any) {
    console.error('[v1/entitlements] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
