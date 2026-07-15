import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { packages, addonsList } from '@/lib/constants/packages'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, packageKey, addons, total, currency, requirements } = body

    if (!tenantId || !packageKey || !requirements?.contactEmail) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const pkg = packages[packageKey]
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Invalid package' }, { status: 400 })
    }

    const tenant = await prisma.systemTenant.findUnique({
      where: { id: tenantId },
      select: { id: true, subdomain: true, companyName: true },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    }

    const order = await prisma.tenantOrder.create({
      data: {
        tenantId: tenant.id,
        guestEmail: requirements.contactEmail,
        orderStatus: 'pending',
        totalAmount: total,
        currency: currency || 'IDR',
        notes: JSON.stringify({
          packageKey,
          packageName: pkg.name,
          addons: addons.map((key: string) => {
            const addon = addonsList.find(a => a.key === key)
            return addon ? { key: addon.key, name: addon.name, price: addon.price } : null
          }).filter(Boolean),
          requirements,
          source: 'project_setup',
        }),
      },
    })

    return NextResponse.json({ success: true, orderId: order.id })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create order' }, { status: 500 })
  }
}
