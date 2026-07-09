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

export async function createCrmContact(tenantId: string, data: { firstName: string, lastName: string, email: string, phoneNumber?: string }) {
  try {
    const contact = await prisma.tenantCrmContact.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber || null,
        tags: ["manually_added"],
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
