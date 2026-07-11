import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = req.headers.get('x-callback-token');

    const orderId = body.external_id;
    if (!orderId) {
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 });
    }

    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId },
      include: { tenant: { include: { website: true } } }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const website = order.tenant.website;
    if (website?.xenditEncryptedWebhookToken && website.xenditEncryptedWebhookTokenIv) {
      const expectedToken = decrypt(`${website.xenditEncryptedWebhookTokenIv}:${website.xenditEncryptedWebhookToken}`);
      if (token !== expectedToken) {
        return NextResponse.json({ error: 'Invalid callback token' }, { status: 403 });
      }
    }

    // Process idempotent webhook
    const idempotencyKey = req.headers.get('x-idempotency-key') || body.id; // use invoice ID if no header
    if (idempotencyKey) {
      const existingKey = await prisma.paymentIdempotencyKey.findUnique({
        where: { idempotencyKey }
      });
      if (existingKey) {
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }
      await prisma.paymentIdempotencyKey.create({
        data: {
          tenantId: order.tenantId,
          idempotencyKey,
          responsePayload: body,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Update payment
    const payment = await prisma.tenantPayment.findFirst({
      where: { orderId: order.id }
    });

    if (payment) {
      let status = payment.paymentStatus;
      if (body.status === 'PAID' || body.status === 'COMPLETED' || body.status === 'SETTLED') {
        status = 'succeeded';
      } else if (body.status === 'EXPIRED') {
        status = 'expired';
      } else if (body.status === 'FAILED') {
        status = 'failed';
      }

      await prisma.tenantPayment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: status as any,
          externalTransactionId: body.id,
          metadata: body
        }
      });
    }

    // Update order status if paid
    if (body.status === 'PAID' || body.status === 'COMPLETED' || body.status === 'SETTLED') {
      await prisma.tenantOrder.update({
        where: { id: order.id },
        data: { orderStatus: 'paid' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Xendit webhook error:', error);
    // Returning 500 will trigger Xendit's retry/backoff mechanism
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
