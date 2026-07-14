import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateV1Request } from '@/lib/v1-auth'

export async function GET(req: Request) {
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const url = new URL(req.url)
    const host = url.searchParams.get('host')

    if (!host) {
      return NextResponse.json({ success: false, error: 'Missing host parameter' }, { status: 400 })
    }

    const domainRecord = await prisma.tenantDomain.findFirst({
      where: { domain: host, isVerified: true },
      include: { instance: true }
    })

    if (!domainRecord) {
      return NextResponse.json({ success: false, error: 'Domain not found or not verified' }, { status: 404 })
    }

    return NextResponse.json({
      tenantId: domainRecord.tenantId,
      instanceId: domainRecord.instance?.instanceId || null,
      isVerified: true
    })
  } catch (error: any) {
    console.error('[v1/tenants/resolve-domain] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
