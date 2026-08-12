import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { resolvePublicTenant } from '@/lib/tenant-context'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const tenant = await resolvePublicTenant(req)
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Storefront tenant was not found' },
        { status: 404 }
      )
    }

    const items = await prisma.tenantCatalogItem.findMany({
      where: { tenantId: tenant.id, isVisible: true },
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('[catalog GET] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
