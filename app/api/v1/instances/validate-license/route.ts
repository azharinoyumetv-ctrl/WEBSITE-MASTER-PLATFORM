import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { licenseKey, instanceId } = body

    if (!licenseKey || !instanceId) {
      return NextResponse.json({ success: false, error: 'Missing license validation parameters' }, { status: 400 })
    }

    const instance = await prisma.tenantInstance.findUnique({
      where: { instanceId }
    })

    if (!instance) {
      return NextResponse.json({ success: false, error: 'Instance not found' }, { status: 404 })
    }

    // A simple validation for demonstration. In production, this verifies a signed JWT.
    const valid = instance.licenseKeyHash === licenseKey

    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid license key' }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      tenantId: instance.tenantId,
      tier: 'enterprise',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
