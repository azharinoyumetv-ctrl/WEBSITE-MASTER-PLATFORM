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

    const [timeline, expenses] = await Promise.all([
      prisma.tenantCrmTimeline.findMany({
        where: {
          tenantId,
          eventType: { in: ['login', 'order_placed', 'form_submission', 'contact_created', 'expense_recorded'] },
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      prisma.tenantCrmExpense.findMany({
        where: { tenantId },
        include: { contact: true },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    return { success: true, contacts, timeline, expenses }
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


export async function createCrmExpense(tenantId: string, data: {
  contactId?: string
  category: string
  amount: number
  currency?: string
  description?: string
  expenseDate: string
  receiptUrl?: string
}) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const amount = Number(data.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Expense amount must be greater than zero')
    if (!data.category.trim()) throw new Error('Expense category is required')
    const expenseDate = new Date(data.expenseDate)
    if (Number.isNaN(expenseDate.getTime())) throw new Error('Expense date is invalid')

    if (data.contactId) {
      const contact = await prisma.tenantCrmContact.findFirst({ where: { id: data.contactId, tenantId } })
      if (!contact) throw new Error('CRM contact not found')
    }

    const expense = await prisma.$transaction(async tx => {
      const created = await tx.tenantCrmExpense.create({
        data: {
          tenantId,
          contactId: data.contactId || null,
          category: data.category.trim(),
          amount,
          currency: (data.currency || 'IDR').trim().toUpperCase().slice(0, 3),
          description: data.description?.trim() || null,
          expenseDate,
          receiptUrl: data.receiptUrl?.trim() || null,
          createdBy: user.id,
        },
        include: { contact: true },
      })

      if (data.contactId) {
        await tx.tenantCrmTimeline.create({
          data: {
            tenantId,
            contactId: data.contactId,
            eventType: 'expense_recorded',
            sourceModule: 'crm',
            eventPayload: { expenseId: created.id, category: created.category, amount: Number(created.amount), currency: created.currency },
            occurredAt: new Date(),
          },
        })
      }
      return created
    })

    revalidatePath('/admin/crm')
    return { success: true, expense }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCrmExpense(tenantId: string, expenseId: string, data: {
  contactId?: string | null
  category?: string
  amount?: number
  currency?: string
  description?: string | null
  expenseDate?: string
  receiptUrl?: string | null
}) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'crm', 'write')

    const current = await prisma.tenantCrmExpense.findFirst({ where: { id: expenseId, tenantId } })
    if (!current) throw new Error('Expense not found')
    if (data.amount !== undefined && (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0)) {
      throw new Error('Expense amount must be greater than zero')
    }

    const expense = await prisma.tenantCrmExpense.update({
      where: { id: expenseId },
      data: {
        contactId: data.contactId === undefined ? undefined : data.contactId || null,
        category: data.category?.trim(),
        amount: data.amount,
        currency: data.currency?.trim().toUpperCase().slice(0, 3),
        description: data.description === undefined ? undefined : data.description?.trim() || null,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        receiptUrl: data.receiptUrl === undefined ? undefined : data.receiptUrl?.trim() || null,
      },
      include: { contact: true },
    })
    revalidatePath('/admin/crm')
    return { success: true, expense }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCrmExpense(tenantId: string, expenseId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'crm', 'write')
    await prisma.tenantCrmExpense.deleteMany({ where: { id: expenseId, tenantId } })
    revalidatePath('/admin/crm')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
