'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getApiData(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'read')

    const telemetrySince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [keys, webhooks, requestLogs] = await Promise.all([
      prisma.tenantApiKey.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tenantApiWebhook.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tenantApiRequestLog.findMany({
        where: { tenantId, createdAt: { gte: telemetrySince } },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: { route: true, method: true, statusCode: true, latencyMs: true, createdAt: true }
      })
    ])

    const latencies = requestLogs.map((request) => request.latencyMs).sort((a, b) => a - b)
    const errorCount = requestLogs.filter((request) => request.statusCode >= 400).length
    const p95Index = latencies.length > 0 ? Math.ceil(latencies.length * 0.95) - 1 : 0

    return {
      success: true,
      keys,
      webhooks,
      telemetry: {
        windowDays: 30,
        requestCount: requestLogs.length,
        errorCount,
        averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length) : null,
        p95LatencyMs: latencies.length ? latencies[p95Index] : null,
        latestRequestAt: requestLogs[0]?.createdAt ?? null,
        recentRequests: requestLogs.slice(0, 8)
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createApiKey(
  tenantId: string, 
  keyName: string, 
  scopes: string[] = ['catalog:read'], 
  expiresInDays?: number
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    const rawKey = crypto.randomBytes(24).toString('hex')
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    
    const expiresAt = expiresInDays && expiresInDays > 0 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) 
      : null

    const key = await prisma.tenantApiKey.create({
      data: {
        tenantId,
        createdBy: user.id,
        keyName,
        keyPrefix: 'live_',
        keyHash: keyHash,
        scopes: scopes,
        expiresAt: expiresAt
      }
    })
    
    revalidatePath('/admin/api-portal')
    return { success: true, key: { ...key, rawKey } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteApiKey(tenantId: string, id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    await prisma.tenantApiKey.deleteMany({
      where: { id, tenantId }
    })
    revalidatePath('/admin/api-portal')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rotateApiKey(tenantId: string, id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    const oldKey = await prisma.tenantApiKey.findFirst({ where: { id, tenantId } })
    if (!oldKey) throw new Error('Key not found')
    
    await prisma.tenantApiKey.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days grace
    })
    
    const rawKey = crypto.randomBytes(24).toString('hex')
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const newKey = await prisma.tenantApiKey.create({
      data: {
        tenantId,
        createdBy: oldKey.createdBy,
        keyName: oldKey.keyName + ' (Rotated)',
        keyPrefix: oldKey.keyPrefix,
        keyHash: keyHash,
        scopes: (oldKey.scopes as any) || []
      }
    })
    
    revalidatePath('/admin/api-portal')
    return { success: true, key: { ...newKey, rawKey } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateApiKey(tenantId: string, id: string, data: { keyName?: string, scopes?: string[], expiresAt?: Date | null }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    await prisma.tenantApiKey.update({
      where: { id, tenantId },
      data: {
        keyName: data.keyName,
        scopes: data.scopes,
        expiresAt: data.expiresAt
      }
    })
    revalidatePath('/admin/api-portal')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createWebhook(tenantId: string, targetUrl: string, events: string[]) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    const secretSigningToken = crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.tenantApiWebhook.create({
      data: {
        tenantId,
        targetUrl,
        secretSigningToken,
        subscribedEvents: events,
        isActive: true
      }
    })
    
    revalidatePath('/admin/api-portal')
    return { success: true, webhook }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateWebhook(tenantId: string, id: string, data: { targetUrl?: string, subscribedEvents?: string[], isActive?: boolean, failureCount?: number }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    await prisma.tenantApiWebhook.update({
      where: { id, tenantId },
      data
    })
    revalidatePath('/admin/api-portal')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteWebhook(tenantId: string, id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    await prisma.tenantApiWebhook.deleteMany({
      where: { id, tenantId }
    })
    revalidatePath('/admin/api-portal')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function testWebhookDispatch(tenantId: string, webhookId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'api', 'write')

    const webhook = await prisma.tenantApiWebhook.findUnique({
      where: { id: webhookId, tenantId }
    })
    
    if (!webhook) return { success: false, error: 'Webhook not found' }
    
    const payload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
      message: 'This is a test event from the API Portal.'
    }
    
    const res = await fetch(webhook.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': crypto.createHmac('sha256', webhook.secretSigningToken).update(JSON.stringify(payload)).digest('hex')
      },
      body: JSON.stringify(payload)
    })
    
    if (res.ok) {
      return { success: true, message: `Test payload sent successfully. Remote responded with HTTP ${res.status}.` }
    } else {
      return { success: false, error: `Remote returned HTTP ${res.status}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error while dispatching test webhook.' }
  }
}
