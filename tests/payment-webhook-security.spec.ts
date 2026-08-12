import crypto from 'crypto'
import { expect, test } from '@playwright/test'
import prisma from '../lib/prisma'

test.describe('payment webhook hardening', () => {
  test('rejects unsigned Xendit callbacks', async ({ request }) => {
    const response = await request.post('/api/webhook/xendit', {
      data: {
        id: `xendit-reject-${crypto.randomUUID()}`,
        external_id: crypto.randomUUID(),
        status: 'PAID',
      },
    })

    expect(response.status()).toBe(401)
  })

  test('rejects Midtrans callbacks without a signature', async ({ request }) => {
    const response = await request.post('/api/webhook/midtrans', {
      data: {
        transaction_id: `midtrans-reject-${crypto.randomUUID()}`,
        order_id: crypto.randomUUID(),
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '10000.00',
      },
    })

    expect(response.status()).toBe(401)
  })

  test('records a failed Xendit payment against the real payment id', async ({ request }) => {
    const tenant = await prisma.systemTenant.findFirst({ where: { subdomain: 'dagangos' } })
    expect(tenant).not.toBeNull()

    const eventId = `xendit-failed-${crypto.randomUUID()}`
    const order = await prisma.tenantOrder.create({
      data: {
        tenantId: tenant!.id,
        guestEmail: 'payment-webhook-ci@dagangos.test',
        totalAmount: 125000,
        currency: 'IDR',
        orderStatus: 'awaiting_payment',
      },
    })
    const payment = await prisma.tenantPayment.create({
      data: {
        tenantId: tenant!.id,
        orderId: order.id,
        processorKey: 'xendit',
        externalTransactionId: `xendit-payment-${crypto.randomUUID()}`,
        amount: 125000,
        currency: 'IDR',
        paymentStatus: 'initiated',
        metadata: {},
      },
    })

    try {
      const response = await request.post('/api/webhook/xendit', {
        headers: { 'x-callback-token': process.env.XENDIT_WEBHOOK_TOKEN || '' },
        data: {
          id: eventId,
          external_id: order.id,
          status: 'EXPIRED',
        },
      })

      expect(response.status()).toBe(200)

      const [updatedPayment, updatedOrder, ledger, idempotency] = await Promise.all([
        prisma.tenantPayment.findUnique({ where: { id: payment.id } }),
        prisma.tenantOrder.findUnique({ where: { id: order.id } }),
        prisma.tenantPaymentLedger.findFirst({ where: { orderId: order.id, type: 'reversal' } }),
        prisma.paymentIdempotencyKey.findUnique({ where: { idempotencyKey: eventId } }),
      ])

      expect(updatedPayment?.paymentStatus).toBe('failed')
      expect(updatedOrder?.orderStatus).toBe('cancelled')
      expect(ledger?.paymentId).toBe(payment.id)
      expect(idempotency?.tenantId).toBe(tenant!.id)
    } finally {
      await prisma.paymentIdempotencyKey.deleteMany({ where: { idempotencyKey: eventId } })
      await prisma.tenantPaymentLedger.deleteMany({ where: { orderId: order.id } })
      await prisma.tenantPayment.deleteMany({ where: { id: payment.id } })
      await prisma.tenantOrder.deleteMany({ where: { id: order.id } })
    }
  })
})
