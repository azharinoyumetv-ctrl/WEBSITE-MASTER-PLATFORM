import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const tenantId = req.headers.get('x-tenant-id') || url.searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant context is required' },
        { status: 400 }
      )
    }

    const items = await prisma.tenantCatalogItem.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('[catalog GET] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
