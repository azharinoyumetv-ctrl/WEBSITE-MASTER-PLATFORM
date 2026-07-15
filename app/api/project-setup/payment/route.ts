import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { createDokuCheckout, createInvoice, createMidtransCheckout } from '@/lib/actions/payments'
import { resolvePublicTenant } from '@/lib/tenant-context'

type Gateway = 'doku' | 'xendit' | 'midtrans'

const gatewayOrder: Gateway[] = ['doku', 'xendit', 'midtrans']

export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ orderId: z.string().uuid() }).safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }
    const { orderId } = parsed.data

    const [tenant, order] = await Promise.all([
      resolvePublicTenant(request),
      prisma.tenantOrder.findUnique({
        where: { id: orderId },
        include: { tenant: { include: { website: true } } },
      }),
    ])
    if (!tenant || !order || order.tenantId !== tenant.id) {
      return NextResponse.json({ success: false, error: 'Order was not found for this storefront' }, { status: 404 })
    }
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
      return NextResponse.json({ success: false, error: 'This order cannot be paid' }, { status: 409 })
    }

    const website = order.tenant.website
    const preferredGateway = (website?.themeConfig as { paymentGateway?: Gateway } | null)?.paymentGateway
    const enabledGateways = gatewayOrder.filter(gateway =>
      (gateway === 'doku' && website?.dokuEnabled) ||
      (gateway === 'xendit' && website?.xenditEnabled) ||
      (gateway === 'midtrans' && website?.midtransEnabled),
    )
    const gateway = preferredGateway && enabledGateways.includes(preferredGateway)
      ? preferredGateway
      : enabledGateways[0]

    if (!gateway) {
      return NextResponse.json({ success: false, error: 'No payment gateway is configured for this storefront' }, { status: 409 })
    }

    const amount = Number(order.totalAmount)
    const requestUrl = new URL(request.url)
    const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '')
    const host = request.headers.get('host') || requestUrl.host
    const returnBaseUrl = `${protocol}://${host}`
    let paymentUrl: string | undefined
    if (gateway === 'doku') {
      const result = await createDokuCheckout(
        order.tenantId,
        order.id,
        amount,
        order.currency,
        { email: order.guestEmail || undefined },
        returnBaseUrl,
      )
      paymentUrl = result.success ? result.paymentUrl : undefined
    } else if (gateway === 'xendit') {
      const result = await createInvoice(order.tenantId, order.id, amount, order.guestEmail || undefined)
      paymentUrl = result.success ? result.invoiceUrl : undefined
    } else {
      const result = await createMidtransCheckout(order.tenantId, order.id, amount, order.guestEmail || undefined)
      paymentUrl = result.success ? result.redirectUrl : undefined
    }

    if (!paymentUrl) {
      console.error(`[project-setup payment] ${gateway} did not provide a payment URL for order ${order.id}`)
      return NextResponse.json({ success: false, error: 'Unable to start payment. Please try again or contact support.' }, { status: 502 })
    }

    await prisma.tenantOrder.update({
      where: { id: order.id },
      data: { orderStatus: 'awaiting_payment' },
    })
    return NextResponse.json({ success: true, paymentUrl })
  } catch (error) {
    console.error('[project-setup payment] Failed to create payment:', error)
    return NextResponse.json({ success: false, error: 'Unable to start payment. Please try again or contact support.' }, { status: 500 })
  }
}
