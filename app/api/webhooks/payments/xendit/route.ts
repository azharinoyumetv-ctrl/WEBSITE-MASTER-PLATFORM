import { NextRequest, NextResponse } from 'next/server'
import { POST as legacyWebhook } from '../../../webhook/[provider]/route'
import prisma from '@/lib/prisma'
import { getXenditCredentials, validXenditToken, readXenditInvoice } from '@/lib/xendit-server'
import { sendOrderConfirmationEmail } from '@/lib/actions/notifications'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (typeof body.external_id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.external_id) || typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid invoice reference' }, { status: 400 })
    const order = await prisma.tenantOrder.findUnique({ where: { id: body.external_id } })
    if (!order) {
      const booking = await prisma.tenantBooking.findUnique({ where: { id: body.external_id }, select: { id: true } })
      if (booking) return legacyWebhook(new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(body) }), { params: { provider: 'xendit' } })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const credentials = await getXenditCredentials(order.tenantId)
    if (!validXenditToken(req.headers.get('x-callback-token'), credentials.webhookToken)) return NextResponse.json({ error: 'Invalid callback token' }, { status: 403 })
    // Read Xendit directly. A forged body or a success redirect cannot pay an order.
    const invoice = await readXenditInvoice(credentials.secret, body.id)
    const amount = Number(order.totalAmount)
    if (invoice.id !== body.id || invoice.external_id !== order.id || Number(invoice.amount) !== amount || invoice.currency !== order.currency) return NextResponse.json({ error: 'Invoice does not match order' }, { status: 422 })
    const paid = ['PAID', 'SETTLED'].includes(invoice.status) && Number(invoice.paid_amount) === amount && Number.isFinite(Date.parse(invoice.paid_at))
    const expired = invoice.status === 'EXPIRED'
    if (!paid && !expired) return NextResponse.json({ received: true })
    const newlyPaid = await prisma.$transaction(async tx => {
      const payment = await tx.tenantPayment.findFirst({ where: { tenantId: order.tenantId, orderId: order.id, processorKey: 'xendit', externalTransactionId: invoice.id } })
      if (!payment) throw new Error('Payment reference is not ready')
      if (payment.paymentStatus === 'succeeded') return false
      // The conditional update makes duplicate callbacks harmless, including races.
      const changed = await tx.tenantPayment.updateMany({ where: { id: payment.id, tenantId: order.tenantId, paymentStatus: { not: 'succeeded' } }, data: { paymentStatus: paid ? 'succeeded' : 'expired', metadata: invoice } })
      if (!changed.count) return false
      if (paid) {
        await tx.tenantOrder.update({ where: { id: order.id }, data: { orderStatus: 'paid', receiptUrl: '/orders/' + order.id + '/receipt' } })
        await tx.tenantPaymentLedger.create({ data: { tenantId: order.tenantId, paymentId: payment.id, orderId: order.id, type: 'capture', amount, currency: order.currency, gateway: 'xendit', gatewayTxId: invoice.id, status: 'success' } })
      } else {
        await tx.tenantOrder.updateMany({ where: { id: order.id, tenantId: order.tenantId, orderStatus: { notIn: ['paid', 'completed'] } }, data: { orderStatus: 'cancelled' } })
      }
      return paid
    })
    if (newlyPaid && order.guestEmail) sendOrderConfirmationEmail(order.tenantId, order.id, order.guestEmail).catch(() => console.error('Xendit confirmation email could not be sent'))
    return NextResponse.json({ received: true })
  } catch {
    // A retry can recover a payment arriving during persistence or an API outage.
    return NextResponse.json({ error: 'Invoice verification will be retried' }, { status: 503 })
  }
}
