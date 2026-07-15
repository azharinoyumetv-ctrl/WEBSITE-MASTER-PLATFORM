import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { addonsList, packages } from '@/lib/constants/packages'
import { resolvePublicTenant } from '@/lib/tenant-context'
import { isTenantFeatureEnabled } from '@/lib/feature-flags'

const requestSchema = z.object({
  tenantId: z.string().uuid(),
  packageKey: z.string().min(1).max(64),
  addons: z.array(z.string().min(1).max(64)).max(addonsList.length),
  // Kept for backwards compatibility, but never used for pricing.
  total: z.number().finite().nonnegative().optional(),
  currency: z.literal('IDR').optional(),
  requirements: z.record(z.string().max(64), z.string().trim().max(4000)),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const { tenantId, packageKey, addons, total, requirements } = parsed.data
    const pkg = packages[packageKey]
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Invalid package' }, { status: 400 })
    }

    const publicTenant = await resolvePublicTenant(request)
    if (!publicTenant || publicTenant.id !== tenantId) {
      // Do not let a public request create an order for a tenant selected by a
      // modified browser payload.
      return NextResponse.json({ success: false, error: 'Invalid storefront tenant' }, { status: 403 })
    }

    const visitor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!(await isTenantFeatureEnabled(publicTenant.id, 'project_setup_intake', visitor))) {
      return NextResponse.json({ success: false, error: 'Project setup is temporarily unavailable' }, { status: 503 })
    }

    const selectedAddonKeys = Array.from(new Set(addons))
    if (selectedAddonKeys.length !== addons.length || selectedAddonKeys.some(key => !addonsList.some(addon => addon.key === key))) {
      return NextResponse.json({ success: false, error: 'Invalid add-ons' }, { status: 400 })
    }

    if (!z.string().email().safeParse(requirements.contactEmail).success) {
      return NextResponse.json({ success: false, error: 'A valid contact email is required' }, { status: 400 })
    }

    const missingRequirement = pkg.requirementsFields.find(field => field !== 'timeline' && !requirements[field])
    if (missingRequirement) {
      return NextResponse.json({ success: false, error: `Missing required field: ${missingRequirement}` }, { status: 400 })
    }

    const selectedAddons = selectedAddonKeys.map(key => addonsList.find(addon => addon.key === key)!)
    const calculatedTotal = pkg.price + selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
    if (total !== undefined && total !== calculatedTotal) {
      return NextResponse.json({ success: false, error: 'The submitted total does not match the selected package' }, { status: 400 })
    }

    const order = await prisma.tenantOrder.create({
      data: {
        tenantId: publicTenant.id,
        guestEmail: requirements.contactEmail,
        orderStatus: 'pending_requirements',
        totalAmount: calculatedTotal,
        currency: 'IDR',
        notes: JSON.stringify({
          packageKey,
          packageName: pkg.name,
          addons: selectedAddons.map(({ key, name, price }) => ({ key, name, price })),
          requirements,
          source: 'project_setup',
        }),
      },
    })

    return NextResponse.json({ success: true, orderId: order.id, total: calculatedTotal }, { status: 201 })
  } catch (error) {
    console.error('[project-setup POST] Failed to create project order:', error)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}
