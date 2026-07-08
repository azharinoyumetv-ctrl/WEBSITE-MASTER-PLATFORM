import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tenantId = req.headers.get('x-tenant-id') || body.tenantId
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const websiteRes = await prisma.tenantWebsite.findUnique({
      where: { tenantId }
    })
    
    const themeConfig = websiteRes?.themeConfig as any || {}
    const paymentGateway = themeConfig.paymentGateway || 'unset'
    
    if (!body.email) {
      return NextResponse.json({ error: 'Customer email is required for checkout' }, { status: 400 })
    }
    
    if (!body.amount) {
      return NextResponse.json({ error: 'Order amount is required for checkout' }, { status: 400 })
    }

    const currency = body.currency || themeConfig.baseCurrency || 'USD'

    if (paymentGateway === 'xendit') {
      const apiKey = process.env.XENDIT_SECRET_KEY
      if (!apiKey) return NextResponse.json({ error: 'Payment Gateway not configured (Xendit)' }, { status: 500 })

      const res = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          external_id: `txn_${Date.now()}`,
          amount: body.amount,
          payer_email: body.email,
          description: 'Checkout Order',
          currency: currency
        })
      })
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to create Xendit invoice' }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ url: data.invoice_url })
    }
    
    if (paymentGateway === 'midtrans') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY
      if (!serverKey) return NextResponse.json({ error: 'Payment Gateway not configured (Midtrans)' }, { status: 500 })

      const res = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: `txn_${Date.now()}`,
            gross_amount: body.amount
          },
          customer_details: {
            email: body.email
          }
        })
      })
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to create Midtrans Snap transaction' }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ url: data.redirect_url })
    }

    return NextResponse.json({ error: 'Invalid or unsupported payment gateway configured' }, { status: 400 })
    
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
