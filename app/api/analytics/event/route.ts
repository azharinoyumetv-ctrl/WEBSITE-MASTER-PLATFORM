import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

/**
 * POST /api/analytics/event
 * Accepts analytics events (pageviews, conversions, etc.) from client-side code.
 * Body: { tenantId: string, eventName: string, pageUrl: string, metadata?: object }
 *
 * The tenantId is required and must match an active tenant.
 * This endpoint is intentionally unauthenticated to support anonymous visitor tracking.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, eventName, pageUrl, metadata, sessionId } = body

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ success: false, error: 'tenantId is required' }, { status: 400 })
    }

    if (!eventName || typeof eventName !== 'string') {
      return NextResponse.json({ success: false, error: 'eventName is required' }, { status: 400 })
    }

    // Verify tenant exists and is active before recording event
    const tenant = await prisma.systemTenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true }
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    }

    if (tenant.status !== 'active') {
      // Silently drop events for inactive tenants rather than erroring the user's browser
      return NextResponse.json({ success: true, dropped: true })
    }

    // Generate session ID for anonymous visitors if not provided by the client
    const sid = (typeof sessionId === 'string' && sessionId)
      ? sessionId
      : `anon-${crypto.randomUUID()}`

    // Separate device properties from general event payload
    const { userAgent, referrer, timestamp, ...restMeta } = (typeof metadata === 'object' && metadata) ? metadata : {}

    await prisma.tenantAnalyticsEvent.create({
      data: {
        tenantId,
        eventName,
        pageUrl: typeof pageUrl === 'string' ? pageUrl : '/',
        sessionId: sid,
        eventPayload: Object.keys(restMeta).length > 0 ? restMeta : {},
        deviceProperties: {
          userAgent: userAgent || '',
          referrer: referrer || '',
          timestamp: timestamp || new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[analytics/event] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
