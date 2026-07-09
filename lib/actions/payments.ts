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

import { revalidatePath } from 'next/cache'

export async function refundPayment(tenantId: string, paymentId: string) {
  try {
    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'refunded') return { success: false, error: 'Already refunded' }
    
    // Simulate gateway refund, update local DB
    const updated = await prisma.tenantPayment.update({
      where: { id: paymentId },
      data: { paymentStatus: 'refunded' }
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function capturePayment(tenantId: string, paymentId: string) {
  try {
    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'succeeded') return { success: false, error: 'Already captured' }
    
    // Simulate gateway capture, update local DB
    const updated = await prisma.tenantPayment.update({
      where: { id: paymentId },
      data: { paymentStatus: 'succeeded' }
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
