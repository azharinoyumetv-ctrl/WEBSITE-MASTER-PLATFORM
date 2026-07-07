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

export async function createApiKey(tenantId: string, keyName: string) {
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
        scopes: ['read', 'write']
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
