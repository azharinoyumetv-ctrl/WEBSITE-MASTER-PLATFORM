import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateV1Request } from '@/lib/v1-auth'
import { withTenantApiTelemetry } from '@/lib/api-telemetry'

export async function POST(req: Request) {
  const startedAt = Date.now()
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { instanceId, tenantId, instanceUrl, customDomains, licenseKey, infraMetadata } = body

    if (!instanceId || !tenantId || !instanceUrl || !licenseKey) {
      return NextResponse.json({ success: false, error: 'Missing registration details' }, { status: 400 })
    }
    const respond = (response: NextResponse) => withTenantApiTelemetry({ tenantId, request: req, response, startedAt })

    // Ensure tenant exists to prevent Foreign Key constraint crash on fresh tenants
    await prisma.systemTenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        companyName: `Tenant ${tenantId.slice(0, 8)}`,
        subdomain: `tenant-${tenantId.slice(0, 8)}`,
        status: 'active',
        plan: 'enterprise'
      }
    })

    // Upsert tenant instance
    const instance = await prisma.tenantInstance.upsert({
      where: { instanceId },
      update: {
        instanceUrl,
        licenseKeyHash: licenseKey,
        status: 'active',
        infraMetadata: infraMetadata || {},
        lastHeartbeat: new Date()
      },
      create: {
        tenantId,
        instanceId,
        instanceUrl,
        licenseKeyHash: licenseKey,
        status: 'active',
        infraMetadata: infraMetadata || {},
        lastHeartbeat: new Date()
      }
    })

    // Upsert domains if provided
    if (customDomains && Array.isArray(customDomains)) {
      for (const domain of customDomains) {
        await prisma.tenantDomain.upsert({
          where: { tenantId_domain: { tenantId, domain } },
          update: {
            instanceId: instance.id,
            isVerified: true
          },
          create: {
            tenantId,
            instanceId: instance.id,
            domain,
            isVerified: true,
            isPrimary: false
          }
        })
      }
    }

    // Seed default entitlements
    const enabledModules = ['catalog', 'booking', 'ecommerce']
    const featureFlags = { ai_assistant: true, advanced_analytics: true }
    const quota = { maxUsers: 25, storageQuotaGB: 50 }

    await prisma.tenantEntitlement.create({
      data: {
        tenantId,
        instanceId: instance.id,
        enabledModules,
        featureFlags,
        quota
      }
    })

    return respond(NextResponse.json({
      status: 'registered',
      entitlements: {
        modules: enabledModules,
        maxUsers: quota.maxUsers,
        storageQuotaGB: quota.storageQuotaGB
      },
      syncInterval: 300
    }))
  } catch (error: any) {
    console.error('[v1/instances/register] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
