'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser, requirePermission } from '@/lib/rbac'
import { decrypt } from '@/lib/crypto'

async function getXenditAuth(tenantId: string) {
  const website = await prisma.tenantWebsite.findUnique({ where: { tenantId } })
  if (!website?.xenditEnabled || !website.xenditEncryptedSecret) {
    throw new Error('Xendit is not configured or enabled for this tenant');
  }
  // If the secret doesn't have 2 colons (it's legacy iv:ciphertext), handle it or expect it was rotated
  let encryptedData = website.xenditEncryptedSecret;
  if (website.xenditEncryptedSecretIv && !encryptedData.includes(':')) {
     encryptedData = `${website.xenditEncryptedSecretIv}:${website.xenditEncryptedSecret}`;
  }
  const secret = decrypt(encryptedData);
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
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'read')

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
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

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

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { paymentStatus: 'refunded' }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'refund',
          amount: Number(p.amount), // negative amount usually for refunds, or just absolute? Let's use negative
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      return p
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function capturePayment(tenantId: string, paymentId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

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

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { paymentStatus: 'succeeded' }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'capture',
          amount: Number(p.amount),
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      return p
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function manualAdjustPayment(tenantId: string, paymentId: string, adjustAmount: number, reason: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'payments', 'write')

    const payment = await prisma.tenantPayment.findUnique({ where: { id: paymentId, tenantId } })
    if (!payment) return { success: false, error: 'Payment not found' }

    const updated = await prisma.$transaction(async (tx) => {
      const newAmount = Number(payment.amount) + adjustAmount
      const p = await tx.tenantPayment.update({
        where: { id: paymentId },
        data: { amount: newAmount }
      })
      await tx.tenantPaymentLedger.create({
        data: {
          tenantId,
          paymentId,
          orderId: p.orderId,
          type: 'manual_adjustment',
          amount: adjustAmount,
          currency: p.currency,
          gateway: p.processorKey,
          gatewayTxId: p.externalTransactionId,
          status: 'success'
        }
      })
      // optional log of reason
      return p
    })
    
    revalidatePath('/admin/payments')
    return { success: true, payment: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
