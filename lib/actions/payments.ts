'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import { decrypt } from '@/lib/crypto'

async function getXenditAuth(tenantId: string) {
  const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
  if (!website?.xenditEnabled || !website.xenditEncryptedSecret || !website.xenditEncryptedSecretIv) {
    throw new Error('Xendit is not configured or enabled for this tenant');
  }
  const secret = decrypt(`${website.xenditEncryptedSecretIv}:${website.xenditEncryptedSecret}`);
  if (!secret) throw new Error('Failed to decrypt Xendit secret');
  return Buffer.from(secret + ':').toString('base64');
}

export async function createInvoice(tenantId: string, orderId: string, amount: number, customerEmail?: string) {
  try {
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: orderId,
        amount: amount,
        payer_email: customerEmail || 'guest@example.com',
        description: `Invoice for order ${orderId}`
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create Xendit invoice');

    return { success: true, invoiceUrl: data.invoice_url, invoiceId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPayments(tenantId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'payments', 'read')

    const payments = await prisma.tenantPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, payments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function refundPayment(tenantId: string, paymentId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'refunded') return { success: false, error: 'Already refunded' }
    if (!payment.externalTransactionId) return { success: false, error: 'No external transaction ID to refund' }
    
    // Call Xendit Refund API (for invoices/ewallet/etc depending on channel, usually Refunds API)
    // Here we assume it's a generic charge that supports /refunds
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch(`https://api.xendit.co/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        charge_id: payment.externalTransactionId,
        amount: Number(payment.amount),
        reason: 'REQUESTED_BY_CUSTOMER'
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Refund failed via gateway');

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
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }
    if (payment.paymentStatus === 'succeeded') return { success: false, error: 'Already captured' }
    if (!payment.externalTransactionId) return { success: false, error: 'No external transaction ID to capture' }
    
    const authHeader = await getXenditAuth(tenantId);
    const res = await fetch(`https://api.xendit.co/credit_card_charges/${payment.externalTransactionId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(payment.amount)
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Capture failed via gateway');

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
