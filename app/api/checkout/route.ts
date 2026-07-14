import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tenantId = req.headers.get('x-tenant-id') || body.tenantId
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const { validateCheckoutNonce } = require('@/lib/crypto')
    if (!body.nonce || !validateCheckoutNonce(body.nonce, tenantId)) {
      return NextResponse.json({ error: 'Invalid or expired checkout session' }, { status: 403 })
    }

    // --- Requirements-before-payment gate ---
    if (!body.name || String(body.name).trim() === '') {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    }
    if (!body.phone || String(body.phone).trim() === '') {
      return NextResponse.json({ error: 'Customer phone is required' }, { status: 400 })
    }
    if (!body.email || String(body.email).trim() === '') {
      return NextResponse.json({ error: 'Customer email is required for checkout' }, { status: 400 })
    }

    // Items are mandatory — do not trust client-supplied amounts
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required for checkout' }, { status: 400 })
    }

    const websiteRes = await prisma.tenantWebsite.findUnique({
      where: { tenantId }
    })
    
    const themeConfig = websiteRes?.themeConfig as any || {}
    const paymentGateway = themeConfig.paymentGateway || 'unset'
    const currency = body.currency || themeConfig.baseCurrency || 'IDR'

    // Server-side price computation — never trust client amount
    const catalogItems = await prisma.tenantCatalogItem.findMany({
      where: { id: { in: body.items.map((i: any) => i.id) }, tenantId }
    })

    let computedTotal = 0
    const orderItemsData = body.items.map((i: any) => {
      const catItem = catalogItems.find((c: any) => c.id === i.id)
      if (!catItem) throw new Error(`Item ${i.id} not found or not accessible`)
      const unitPrice = catItem.basePrice
      const total = Number(unitPrice) * i.quantity
      computedTotal += total
      return {
        tenantId,
        catalogItemId: i.id,
        quantity: i.quantity,
        unitPrice: unitPrice,
        totalPrice: total
      }
    })

    const order = await prisma.tenantOrder.create({
      data: {
        tenantId,
        guestEmail: body.email,
        totalAmount: computedTotal,
        orderStatus: 'pending',
        // Service-order contact fields stored in shippingAddress JSON
        shippingAddress: {
          name: String(body.name).trim(),
          phone: String(body.phone).trim(),
          companyName: body.companyName ? String(body.companyName).trim() : '',
        },
        notes: body.notes ? String(body.notes).trim() : null,
        items: {
          create: orderItemsData
        }
      }
    })

    const orderId = order.id
    const totalAmount = computedTotal

    // Create initiated payment record
    await prisma.tenantPayment.create({
      data: {
        tenantId,
        orderId,
        processorKey: paymentGateway,
        externalTransactionId: `pending_${orderId}`,
        amount: totalAmount,
        currency,
        paymentStatus: 'initiated'
      }
    })

    if (paymentGateway === 'xendit') {
      let apiKey = process.env.XENDIT_SECRET_KEY
      if (websiteRes?.xenditEncryptedSecret && websiteRes.xenditEncryptedSecretIv) {
        apiKey = decrypt(`${websiteRes.xenditEncryptedSecretIv}:${websiteRes.xenditEncryptedSecret}`) || apiKey
      }
      if (!apiKey) return NextResponse.json({ error: 'Payment provider not configured. Add your API key in Settings.' }, { status: 500 })

      const res = await fetch('https://api.xendit.co/v2/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          external_id: orderId,
          amount: totalAmount,
          payer_email: body.email,
          description: `Checkout Order ${orderId}`,
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
      let serverKey = process.env.MIDTRANS_SERVER_KEY
      if (websiteRes?.midtransEncryptedServerKey && websiteRes.midtransEncryptedServerKeyIv) {
        serverKey = decrypt(`${websiteRes.midtransEncryptedServerKeyIv}:${websiteRes.midtransEncryptedServerKey}`) || serverKey
      }
      if (!serverKey) return NextResponse.json({ error: 'Payment provider not configured. Add your API key in Settings.' }, { status: 500 })

      const baseUrl = (serverKey.startsWith('SB-') || serverKey.toLowerCase().includes('sandbox'))
        ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
        : 'https://app.midtrans.com/snap/v1/transactions'

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: totalAmount
          },
          customer_details: {
            email: body.email,
            first_name: String(body.name).trim(),
            phone: String(body.phone).trim()
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
    console.error('[checkout] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
