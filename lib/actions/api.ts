'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'

export async function getApiData(tenantId: string) {
  try {
    const keys = await prisma.tenantApiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    
    const webhooks = await prisma.tenantApiWebhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, keys, webhooks }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

import crypto from 'crypto'

export async function createApiKey(tenantId: string, keyName: string, scopes: string[] = ['read', 'write']) {
  try {
    const user = await prisma.user.findFirst({
      where: { tenantId }
    })
    
    if (!user) {
      return { success: false, error: 'No user found for the tenant context.' }
    }

    const rawKey = crypto.randomBytes(24).toString('hex')
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const key = await prisma.tenantApiKey.create({
      data: {
        tenantId,
        createdBy: user.id,
        keyName,
        keyPrefix: 'live_',
        keyHash: keyHash,
        scopes: scopes
      }
    })
    
    revalidatePath('/admin/api-portal')
    return { success: true, key: { ...key, rawKey } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createWebhook(tenantId: string, targetUrl: string, events: string[]) {
  try {
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

export async function deleteApiKey(tenantId: string, id: string) {
  try {
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
        keyName: oldKey.keyName,
        keyPrefix: oldKey.keyPrefix,
        keyHash: keyHash,
        scopes: oldKey.scopes
      }
    })
    
    revalidatePath('/admin/api-portal')
    return { success: true, key: { ...newKey, rawKey } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteWebhook(tenantId: string, id: string) {
  try {
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
