import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const provider = params.provider
    const body = await req.json()
    
    // In a real implementation, you would verify the webhook signature here
    // e.g. x-callback-token for Xendit, or signature_key for Midtrans

    let orderId = ''
    let status = ''

    if (provider === 'xendit') {
      // Xendit invoice webhook format
      orderId = body.external_id
      status = body.status === 'PAID' ? 'succeeded' : 'failed'
    } else if (provider === 'midtrans') {
      // Midtrans notification webhook format
      orderId = body.order_id
      status = (body.transaction_status === 'capture' || body.transaction_status === 'settlement') ? 'succeeded' : 'failed'
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    if (orderId && status === 'succeeded') {
      // Update payment and order in database
      await prisma.tenantPayment.updateMany({
        where: { id: orderId },
        data: { paymentStatus: status }
      })
      await prisma.tenantOrder.updateMany({
        where: { id: orderId }, // assuming payment id or order id match up
        data: { status: 'processing' } // Update order status upon successful payment
      })
    }

    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
