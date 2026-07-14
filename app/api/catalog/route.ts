import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId') || req.headers.get('x-tenant-id')
    
    if (!tenantId) {
      // Fallback to first tenant if none provided
      const firstTenant = await prisma.systemTenant.findFirst()
      if (!firstTenant) {
        return NextResponse.json({ success: false, error: 'No tenant found' }, { status: 400 })
      }
      const items = await prisma.tenantCatalogItem.findMany({
        where: { tenantId: firstTenant.id, isVisible: true },
        orderBy: { createdAt: 'desc' },
        include: { category: true }
      })
      return NextResponse.json({ success: true, items })
    }

    const items = await prisma.tenantCatalogItem.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { createdAt: 'desc' },
      include: { category: true }
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
