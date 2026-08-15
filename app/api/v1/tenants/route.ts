import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const roles = (user.roles || []).map(role => role.toLowerCase())
    const isPlatformOperator = roles.some(role =>
      role === 'platform_owner' || role === 'platform owner' || role === 'super-admin'
    )

    if (!isPlatformOperator) {
      return NextResponse.json({ success: false, error: 'Platform operator access required' }, { status: 403 })
    }

    const instances = await prisma.tenantInstance.findMany({
      select: {
        id: true,
        tenantId: true,
        instanceId: true,
        instanceUrl: true,
        status: true,
        lastHeartbeat: true,
        syncErrorCount: true,
        infraMetadata: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            companyName: true,
            subdomain: true,
            customDomain: true,
            status: true,
            plan: true,
          },
        },
        domains: {
          select: {
            domain: true,
            isPrimary: true,
            isVerified: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { domain: 'asc' }],
        },
        entitlements: {
          select: {
            enabledModules: true,
            featureFlags: true,
            quota: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ status: 'asc' }, { lastHeartbeat: 'desc' }],
    })

    const now = Date.now()
    return NextResponse.json({
      success: true,
      instances: instances.map(instance => {
        const heartbeatAgeMs = instance.lastHeartbeat
          ? now - instance.lastHeartbeat.getTime()
          : null
        const health = instance.status !== 'active'
          ? 'inactive'
          : heartbeatAgeMs === null || heartbeatAgeMs > 15 * 60 * 1000
            ? 'offline'
            : heartbeatAgeMs > 7 * 60 * 1000
              ? 'degraded'
              : 'healthy'

        return {
          ...instance,
          health,
          lastHeartbeat: instance.lastHeartbeat?.toISOString() || null,
          createdAt: instance.createdAt.toISOString(),
          updatedAt: instance.updatedAt.toISOString(),
        }
      }),
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }
}
