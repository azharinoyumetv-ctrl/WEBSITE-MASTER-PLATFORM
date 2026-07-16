'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser, requirePermission } from "@/lib/rbac"
import { getTenantWhatsAppConfig, sendWhatsAppText } from '@/lib/whatsapp'

export async function getCrmData(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'read')

    const contacts = await prisma.tenantCrmContact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    const timeline = await prisma.tenantCrmTimeline.findMany({
      where: { 
        tenantId, 
        eventType: { in: ['login', 'order_placed', 'form_submission', 'contact_created'] } 
      },
      orderBy: { occurredAt: 'desc' },
      take: 50
    })

    return { success: true, contacts, timeline }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createCrmContact(tenantId: string, data: { firstName: string, lastName: string, email: string, phoneNumber?: string, tags?: string[] }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const contact = await prisma.tenantCrmContact.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
      }
    })

    await prisma.tenantCrmTimeline.create({
      data: {
        tenantId,
        contactId: contact.id,
        eventType: 'contact_created',
        sourceModule: 'crm',
        eventPayload: { action: 'Contact manually created by admin' },
        occurredAt: new Date()
      }
    })

    revalidatePath('/admin/crm')
    return { success: true, contact }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCrmContact(tenantId: string, id: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    // Strict allowlist for fields that client-side updates are permitted to touch
    const safeData: any = {}
    if (data.email !== undefined) safeData.email = String(data.email)
    if (data.phoneNumber !== undefined) safeData.phoneNumber = data.phoneNumber ? String(data.phoneNumber) : null
    if (data.firstName !== undefined) safeData.firstName = String(data.firstName)
    if (data.lastName !== undefined) safeData.lastName = String(data.lastName)
    if (data.tags !== undefined) safeData.tags = Array.isArray(data.tags) ? data.tags : []
    if (data.customMetadata !== undefined) safeData.customMetadata = data.customMetadata

    const contact = await prisma.tenantCrmContact.update({
      where: { id, tenantId },
      data: safeData
    })
    revalidatePath('/admin/crm')
    return { success: true, contact }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCrmContact(tenantId: string, id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    await prisma.tenantCrmContact.delete({
      where: { id, tenantId }
    })
    revalidatePath('/admin/crm')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function addTimelineEvent(tenantId: string, contactId: string, eventType: string, eventPayload: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const event = await prisma.tenantCrmTimeline.create({
      data: {
        tenantId,
        contactId,
        eventType,
        sourceModule: 'crm',
        eventPayload,
        occurredAt: new Date()
      }
    })
    revalidatePath('/admin/crm')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendTimelineWhatsApp(tenantId: string, contactId: string, message: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const contact = await prisma.tenantCrmContact.findUnique({
      where: { id: contactId, tenantId }
    })
    if (!contact || !contact.phoneNumber) throw new Error('Contact has no phone number')

    const whatsAppConfig = await getTenantWhatsAppConfig(tenantId)
    if (!whatsAppConfig) throw new Error('WhatsApp Business is not configured for this workspace.')

    const delivery = await sendWhatsAppText({
      to: contact.phoneNumber,
      message,
      credentials: whatsAppConfig,
    })
    if (!delivery.success) throw new Error(delivery.error || 'WhatsApp API delivery failed')

    const event = await prisma.tenantCrmTimeline.create({
      data: {
        tenantId,
        contactId,
        eventType: 'whatsapp_sent',
        sourceModule: 'crm',
        eventPayload: { message, status: 'sent', providerMessageId: delivery.data?.messages?.[0]?.id || null },
        occurredAt: new Date()
      }
    })
    revalidatePath('/admin/crm')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function bulkDeleteCrmContacts(tenantId: string, contactIds: string[]) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const res = await prisma.tenantCrmContact.deleteMany({
      where: {
        tenantId,
        id: { in: contactIds }
      }
    })
    revalidatePath('/admin/crm')
    return { success: true, count: res.count }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function importCrmContacts(tenantId: string, contacts: any[]) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'crm', 'write')

    let imported = 0
    const data = contacts.map(c => ({
      tenantId,
      firstName: String(c.firstName || '').substring(0, 64),
      lastName: String(c.lastName || '').substring(0, 64),
      email: String(c.email || '').substring(0, 128),
      phoneNumber: c.phoneNumber ? String(c.phoneNumber).substring(0, 32) : null,
      tags: Array.isArray(c.tags) ? c.tags : (c.tags ? String(c.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
    })).filter(c => c.firstName && c.email)

    if (data.length > 0) {
      const res = await prisma.tenantCrmContact.createMany({
        data,
        skipDuplicates: true
      })
      imported = res.count
    }
    
    revalidatePath('/admin/crm')
    return { success: true, count: imported }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
