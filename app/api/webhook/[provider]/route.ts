import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { decrypt } from '@/lib/crypto'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { sendOrderConfirmationEmail } from '@/lib/actions/notifications'

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50 // 50 requests per minute per IP

async function checkRateLimit(req: NextRequest, provider: string) {
  // Use Cloudflare true client IP if available, fallback to x-forwarded-for
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  const now = new Date()
  
  try {
    const record = await prisma.systemApiRateLimit.findUnique({
      where: {
        provider_ipAddress: {
          provider,
          ipAddress: ip
        }
      }
    })

    if (!record || now > record.resetTime) {
      // Create new record or reset window
      await prisma.systemApiRateLimit.upsert({
        where: { provider_ipAddress: { provider, ipAddress: ip } },
        update: { count: 1, resetTime: new Date(now.getTime() + RATE_LIMIT_WINDOW) },
        create: { provider, ipAddress: ip, count: 1, resetTime: new Date(now.getTime() + RATE_LIMIT_WINDOW) }
      })
      return true
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
      return false
    }

    // Increment count
    await prisma.systemApiRateLimit.update({
      where: { provider_ipAddress: { provider, ipAddress: ip } },
      data: { count: { increment: 1 } }
    })
    
    return true
  } catch (error) {
    // Fail open if database is down or table missing (e.g. before migration)
    console.error('Rate limit error:', error)
    return true
  }
}

// Simple in-memory cache to prevent repeatedly scanning & decrypting the entire tenant DB on every webhook
// Format: cache[provider] = { timestamp, data: [{ tenantId, decryptedValue }] }
const tenantTokenCache: Record<string, { timestamp: number, data: { tenantId: string, decryptedValue: string }[] }> = {}
const CACHE_TTL = 1000 * 60 * 15 // 15 minutes

export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const allowed = await checkRateLimit(req, params.provider)
  if (!allowed) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  try {
    const provider = params.provider
    const body = await req.json()
    

    let orderId = ''
    let status = ''

    if (provider === 'xendit') {
      let xenditToken = process.env.XENDIT_WEBHOOK_TOKEN
      const callbackToken = req.headers.get('x-callback-token')

      // Check tenant-specific webhook tokens if env doesn't match or doesn't exist
      if (!xenditToken || callbackToken !== xenditToken) {
        let cached = tenantTokenCache['xendit']
        if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
          const websites = await prisma.tenantWebsite.findMany({
            where: { xenditEnabled: true, xenditEncryptedWebhookToken: { not: null } }
          })
          const data = []
          for (const site of websites) {
            if (site.xenditEncryptedWebhookToken && site.xenditEncryptedWebhookTokenIv) {
              const decrypted = decrypt(`${site.xenditEncryptedWebhookTokenIv}:${site.xenditEncryptedWebhookToken}`)
              if (decrypted) data.push({ tenantId: site.tenantId, decryptedValue: decrypted })
            }
          }
          tenantTokenCache['xendit'] = { timestamp: Date.now(), data }
          cached = tenantTokenCache['xendit']
        }
        
        for (const site of cached.data) {
          if (site.decryptedValue === callbackToken) {
            xenditToken = site.decryptedValue
            break
          }
        }
      }

      if (xenditToken && callbackToken !== xenditToken) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
      }

      // Xendit invoice webhook format
      orderId = body.external_id
      status = body.status === 'PAID' ? 'succeeded' : 'failed'
    } else if (provider === 'midtrans') {
      let midtransKey = process.env.MIDTRANS_SERVER_KEY

      // Try tenant keys if env key doesn't work
      if (body.signature_key) {
        let matched = false
        if (midtransKey) {
          const envHash = crypto.createHash('sha512')
            .update(`${body.order_id}${body.status_code}${body.gross_amount}${midtransKey}`)
            .digest('hex')
          if (envHash === body.signature_key) {
            matched = true
          }
        }

        if (!matched) {
          let cached = tenantTokenCache['midtrans']
          if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
            const websites = await prisma.tenantWebsite.findMany({
              where: { midtransEnabled: true, midtransEncryptedServerKey: { not: null } }
            })
            const data = []
            for (const site of websites) {
              if (site.midtransEncryptedServerKey && site.midtransEncryptedServerKeyIv) {
                const decrypted = decrypt(`${site.midtransEncryptedServerKeyIv}:${site.midtransEncryptedServerKey}`)
                if (decrypted) data.push({ tenantId: site.tenantId, decryptedValue: decrypted })
              }
            }
            tenantTokenCache['midtrans'] = { timestamp: Date.now(), data }
            cached = tenantTokenCache['midtrans']
          }

          for (const site of cached.data) {
            const hash = crypto.createHash('sha512')
              .update(`${body.order_id}${body.status_code}${body.gross_amount}${site.decryptedValue}`)
              .digest('hex')
            if (hash === body.signature_key) {
              midtransKey = site.decryptedValue
              matched = true
              break
            }
          }
        }

        if (!matched) {
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
        where: { id: orderId },
        data: { 
          orderStatus: 'processing',
          receiptUrl: `/orders/${orderId}/receipt`
        }
      })
      
      const order = await prisma.tenantOrder.findFirst({
        where: { id: orderId }
      })

      if (order?.tenantId) {
        // Send confirmation email asynchronously
        const customerEmail = order.guestEmail || body.payer_email || 'customer@example.com';
        sendOrderConfirmationEmail(order.tenantId, order.id, customerEmail)
          .catch(err => console.error("Failed to send async generic order confirmation email", err));

        const website = await prisma.tenantWebsite.findUnique({
          where: { tenantId: order.tenantId }
        })
        const themeConfig = website?.themeConfig as any
        if (themeConfig) {
          const { whatsappPaNumber, whatsappPhoneId, whatsappToken, whatsappTemplate } = themeConfig
          if (whatsappPaNumber && whatsappPhoneId && whatsappToken && whatsappTemplate) {
            await sendWhatsAppTemplate({
              to: whatsappPaNumber,
              templateName: whatsappTemplate,
              parameters: [order.id, String(order.totalAmount)],
              credentials: { token: whatsappToken, phoneNumberId: whatsappPhoneId }
            }).catch(e => console.error("Failed to send WhatsApp notification on webhook", e))
          }
        }
      }
    }

    return NextResponse.json({ received: true })
    
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
