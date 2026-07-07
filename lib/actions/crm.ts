'use server'

import prisma from "@/lib/prisma"

export async function getCrmData(tenantId: string) {
  try {
    const contacts = await prisma.tenantCrmContact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })

    const timeline = await prisma.tenantCrmTimeline.findMany({
      where: { 
        tenantId, 
        eventType: { in: ['login', 'order_placed', 'form_submission'] } 
      },
      orderBy: { occurredAt: 'desc' },
      take: 50
    })

    return { success: true, contacts, timeline }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
