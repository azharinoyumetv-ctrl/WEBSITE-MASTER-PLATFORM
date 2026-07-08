import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const provider = params.provider
    const body = await req.json()
    

    let orderId = ''
    let status = ''

    if (provider === 'xendit') {
      const xenditToken = process.env.XENDIT_WEBHOOK_TOKEN
      const callbackToken = req.headers.get('x-callback-token')
      if (xenditToken && callbackToken !== xenditToken) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
      }

      // Xendit invoice webhook format
      orderId = body.external_id
      status = body.status === 'PAID' ? 'succeeded' : 'failed'
    } else if (provider === 'midtrans') {
      const midtransKey = process.env.MIDTRANS_SERVER_KEY
      if (midtransKey && body.signature_key) {
        const hash = crypto.createHash('sha512')
          .update(`${body.order_id}${body.status_code}${body.gross_amount}${midtransKey}`)
          .digest('hex')
        if (hash !== body.signature_key) {
          return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
        }
      }

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
