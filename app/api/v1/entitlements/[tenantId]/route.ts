import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  try {
    const { tenantId } = params

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Missing tenantId' }, { status: 400 })
    }

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
