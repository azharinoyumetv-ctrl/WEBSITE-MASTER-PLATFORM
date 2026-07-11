'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getCrmData(tenantId: string) {
  try {
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
    const contact = await prisma.tenantCrmContact.update({
      where: { id, tenantId },
      data
    })
    revalidatePath('/admin/crm')
    return { success: true, contact }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCrmContact(tenantId: string, id: string) {
  try {
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
    const contact = await prisma.tenantCrmContact.findUnique({
      where: { id: contactId, tenantId }
    })
    if (!contact || !contact.phoneNumber) throw new Error('Contact has no phone number')

    const token = process.env.META_WA_TOKEN
    const phoneId = process.env.META_WA_PHONE_ID
    
    // 1. Send via Meta Graph API
    if (token && phoneId) {
      const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: contact.phoneNumber.replace(/\D/g, ''),
          type: 'text',
          text: { body: message }
        })
      })
      if (!response.ok) {
        const err = await response.text()
        console.error('WhatsApp API Error:', err)
        throw new Error('WhatsApp API delivery failed')
      }
    } else {
      console.warn('WhatsApp API not configured, simulating delivery')
    }

    // 2. Record in timeline
    const event = await prisma.tenantCrmTimeline.create({
      data: {
        tenantId,
        contactId,
        eventType: 'whatsapp_sent',
        sourceModule: 'crm',
        eventPayload: { message, status: 'sent' },
        occurredAt: new Date()
      }
    })
    revalidatePath('/admin/crm')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
