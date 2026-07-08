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
    const paymentGateway = themeConfig.paymentGateway || 'mock'
    
    // Scaffold for actual provider integration
    if (paymentGateway === 'xendit') {
      const apiKey = process.env.XENDIT_SECRET_KEY || 'xnd_development_dummy'
      const res = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          external_id: `txn_${Date.now()}`,
          amount: body.amount || 10000,
          payer_email: body.email || 'customer@example.com',
          description: 'Checkout Order'
        })
      })
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to create Xendit invoice' }, { status: 502 })
      }
      const data = await res.json()
      return NextResponse.json({ url: data.invoice_url })
    }
    
    if (paymentGateway === 'midtrans') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-dummy'
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
            gross_amount: body.amount || 10000
          },
          customer_details: {
            email: body.email || 'customer@example.com'
          }
        })
      })
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to create Midtrans Snap transaction' }, { status: 502 })
      }
      const data = await res.json()
      return NextResponse.json({ url: data.redirect_url })
    }

    // Default Sandbox / Mock behavior
    return NextResponse.json({ url: '/checkout/success' })
    
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
