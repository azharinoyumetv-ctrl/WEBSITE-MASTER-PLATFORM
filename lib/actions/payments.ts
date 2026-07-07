'use server'

import prisma from "@/lib/prisma"



export async function getPayments(tenantId: string) {
  try {
    const payments = await prisma.tenantPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, payments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
