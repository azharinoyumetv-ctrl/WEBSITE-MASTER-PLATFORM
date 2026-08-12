import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { decrypt } from '@/lib/crypto'
import { getTenantWhatsAppConfig, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { sendOrderConfirmationEmail } from '@/lib/actions/notifications'

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50 // 50 requests per minute per IP

function secureEqual(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function decryptStoredSecret(encryptedValue: string | null | undefined, legacyIv?: string | null) {
  if (!encryptedValue) return ''

  const candidates = [encryptedValue]
  if (legacyIv) candidates.push(`${legacyIv}:${encryptedValue}`)

  for (const candidate of candidates) {
    const decrypted = decrypt(candidate)
    if (decrypted) return decrypted
  }

  return ''
}

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

    await prisma.systemApiRateLimit.update({
      where: { provider_ipAddress: { provider, ipAddress: ip } },
      data: { count: { increment: 1 } }
    })

    return true
  } catch (error) {
    // Rate limiting is defensive only; webhook authentication below still fails closed.
    console.error('Rate limit error:', error)
    return true
  }
}

// Cache decrypted tenant webhook credentials to avoid scanning the tenant table on every callback.
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
      const callbackToken = req.headers.get('x-callback-token')
      let matched = secureEqual(callbackToken, process.env.XENDIT_WEBHOOK_TOKEN)

      if (!matched) {
        let cached = tenantTokenCache.xendit
        if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
          const websites = await prisma.tenantWebsite.findMany({
            where: { xenditEnabled: true, xenditEncryptedWebhookToken: { not: null } }
          })
          const data: { tenantId: string, decryptedValue: string }[] = []
          for (const site of websites) {
            const decrypted = decryptStoredSecret(
              site.xenditEncryptedWebhookToken,
              site.xenditEncryptedWebhookTokenIv,
            )
            if (decrypted) data.push({ tenantId: site.tenantId, decryptedValue: decrypted })
          }
          tenantTokenCache.xendit = { timestamp: Date.now(), data }
          cached = tenantTokenCache.xendit
        }

        matched = cached.data.some(site => secureEqual(callbackToken, site.decryptedValue))
      }

      if (!matched) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
      }

      // Legacy Xendit invoice webhook format. Payment Requests v3 migration is handled separately.
      orderId = String(body.external_id || '')
      status = body.status === 'PAID' ? 'succeeded' : 'failed'
    } else if (provider === 'midtrans') {
      const signatureKey = typeof body.signature_key === 'string' ? body.signature_key : ''
      if (!signatureKey) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
      }

      let matched = false
      const platformKey = process.env.MIDTRANS_SERVER_KEY
      if (platformKey) {
        const envHash = crypto.createHash('sha512')
          .update(`${body.order_id}${body.status_code}${body.gross_amount}${platformKey}`)
          .digest('hex')
        matched = secureEqual(envHash, signatureKey)
      }

      if (!matched) {
        let cached = tenantTokenCache.midtrans
        if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
          const websites = await prisma.tenantWebsite.findMany({
            where: { midtransEnabled: true, midtransEncryptedServerKey: { not: null } }
          })
          const data: { tenantId: string, decryptedValue: string }[] = []
          for (const site of websites) {
            const decrypted = decryptStoredSecret(
              site.midtransEncryptedServerKey,
              site.midtransEncryptedServerKeyIv,
            )
            if (decrypted) data.push({ tenantId: site.tenantId, decryptedValue: decrypted })
          }
          tenantTokenCache.midtrans = { timestamp: Date.now(), data }
          cached = tenantTokenCache.midtrans
        }

        for (const site of cached.data) {
          const hash = crypto.createHash('sha512')
            .update(`${body.order_id}${body.status_code}${body.gross_amount}${site.decryptedValue}`)
            .digest('hex')
          if (secureEqual(hash, signatureKey)) {
            matched = true
            break
          }
        }
      }

      if (!matched) {
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 })
      }

      orderId = String(body.order_id || '')
      if (body.transaction_status === 'capture' || body.transaction_status === 'settlement') {
        status = 'succeeded'
      } else if (body.transaction_status === 'chargeback') {
        status = 'disputed'
      } else if (body.transaction_status === 'refund') {
        status = 'refunded'
      } else {
        status = 'failed'
      }
    } else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    const idempotencyKey = body.id || body.transaction_id || body.uuid || body.invoice_id || body.order_id
    if (idempotencyKey) {
      const existingKey = await prisma.paymentIdempotencyKey.findUnique({
        where: { idempotencyKey }
      })
      if (existingKey) {
        return NextResponse.json({ success: true, message: 'Already processed' })
      }
    }

    let tenantId: string | null = null
    let isBooking = false

    if (orderId) {
      const order = await prisma.tenantOrder.findUnique({ where: { id: orderId } })
      if (order) {
        tenantId = order.tenantId
      } else {
        const booking = await prisma.tenantBooking.findUnique({ where: { id: orderId } })
        if (booking) {
          tenantId = booking.tenantId
          isBooking = true
        }
      }
    }

    if (orderId) {
      const payment = await prisma.tenantPayment.findFirst({
        where: { orderId }
      })
      if (payment && payment.paymentStatus === status) {
        return NextResponse.json({ success: true, message: 'Status already up-to-date' })
      }
    }

    if (orderId && status === 'succeeded') {
      if (isBooking) {
        await prisma.tenantBooking.update({
          where: { id: orderId },
          data: { bookingStatus: 'confirmed', paymentIntentId: idempotencyKey }
        })
        await prisma.tenantPayment.updateMany({
          where: { orderId },
          data: { paymentStatus: 'succeeded' }
        })
      } else {
        await prisma.tenantPayment.updateMany({
          where: { orderId },
          data: { paymentStatus: 'succeeded' }
        })
        await prisma.tenantOrder.updateMany({
          where: { id: orderId },
          data: {
            orderStatus: 'pending_fulfillment',
            receiptUrl: `/orders/${orderId}/receipt`
          }
        })

        const order = await prisma.tenantOrder.findFirst({
          where: { id: orderId }
        })

        if (order?.tenantId) {
          const customerEmail = order.guestEmail || body.payer_email || 'customer@example.com'
          sendOrderConfirmationEmail(order.tenantId, order.id, customerEmail)
            .catch(err => console.error('Failed to send async generic order confirmation email', err))

          const whatsAppConfig = await getTenantWhatsAppConfig(order.tenantId)
          if (whatsAppConfig?.recipientNumber && whatsAppConfig.templateName) {
            await sendWhatsAppTemplate({
              to: whatsAppConfig.recipientNumber,
              templateName: whatsAppConfig.templateName,
              parameters: [order.id, String(order.totalAmount)],
              credentials: whatsAppConfig,
            }).catch(e => console.error('Failed to send WhatsApp notification on webhook', e))
          }
        }
      }
    } else if (orderId && status === 'disputed') {
      await prisma.tenantPayment.updateMany({
        where: { orderId },
        data: { paymentStatus: 'disputed' }
      })

      const payment = await prisma.tenantPayment.findFirst({
        where: { orderId }
      })
      if (payment) {
        const existingDispute = await prisma.tenantPaymentDispute.findFirst({
          where: { tenantId: payment.tenantId, paymentId: payment.id }
        })
        if (!existingDispute) {
          await prisma.tenantPaymentDispute.create({
            data: {
              tenantId: payment.tenantId,
              paymentId: payment.id,
              status: 'under_review',
              amount: payment.amount,
              reason: `${provider} Webhook Chargeback Notification`
            }
          })
        }
      }
    } else if (orderId && (status === 'failed' || status === 'refunded')) {
      if (isBooking) {
        await prisma.tenantBooking.update({
          where: { id: orderId },
          data: { bookingStatus: 'cancelled' }
        })
        await prisma.tenantPayment.updateMany({
          where: { orderId },
          data: { paymentStatus: status }
        })
      } else {
        await prisma.tenantPayment.updateMany({
          where: { orderId },
          data: { paymentStatus: status }
        })
        await prisma.tenantOrder.updateMany({
          where: { id: orderId },
          data: { orderStatus: 'cancelled' }
        })

        const [order, payment] = await Promise.all([
          prisma.tenantOrder.findFirst({ where: { id: orderId } }),
          prisma.tenantPayment.findFirst({ where: { orderId } }),
        ])
        if (order?.tenantId && payment) {
          await prisma.tenantPaymentLedger.create({
            data: {
              tenantId: order.tenantId,
              paymentId: payment.id,
              orderId: order.id,
              type: 'reversal',
              amount: order.totalAmount,
              currency: order.currency || 'IDR',
              gateway: provider,
              gatewayTxId: body.id || body.transaction_id || 'unknown',
              status: 'failed',
              metadata: body
            }
          })
        }
      }
    }

    // Record idempotency only after business-state processing completes. If processing throws,
    // the provider retry remains eligible instead of being incorrectly treated as completed.
    if (idempotencyKey && tenantId) {
      await prisma.paymentIdempotencyKey.create({
        data: {
          tenantId,
          idempotencyKey,
          responsePayload: body,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }).catch(err => console.error('Idempotency log failed', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook/provider] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
