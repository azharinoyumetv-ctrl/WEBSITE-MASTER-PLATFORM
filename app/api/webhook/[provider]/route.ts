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
    const provider = params.provider.toLowerCase()
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

    const rawEventId = body.id || body.transaction_id || body.uuid || body.invoice_id || body.order_id
    const idempotencyKey = rawEventId ? `${provider}:${String(rawEventId)}:${status}` : null
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

    const payment = orderId
      ? await prisma.tenantPayment.findFirst({ where: { orderId } })
      : null

    if (!orderId || !tenantId || !payment) {
      return NextResponse.json({ error: 'Payment target not found' }, { status: 404 })
    }

    if (payment.tenantId !== tenantId || payment.processorKey.toLowerCase() !== provider) {
      return NextResponse.json({ error: 'Payment provider or tenant mismatch' }, { status: 409 })
    }

    const receivedAmountRaw = provider === 'midtrans'
      ? body.gross_amount
      : (body.paid_amount ?? body.amount)
    if (receivedAmountRaw !== undefined && receivedAmountRaw !== null) {
      const receivedAmount = Number(receivedAmountRaw)
      if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - Number(payment.amount)) > 0.01) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 422 })
      }
    }

    const receivedCurrency = String(body.currency || '').trim().toUpperCase()
    if (receivedCurrency && receivedCurrency !== payment.currency.toUpperCase()) {
      return NextResponse.json({ error: 'Payment currency mismatch' }, { status: 422 })
    }

    const notificationOrder = await prisma.$transaction(async (tx) => {
      const currentPayment = await tx.tenantPayment.findUnique({ where: { id: payment.id } })
      if (!currentPayment) {
        throw new Error('Payment disappeared during webhook processing')
      }

      let orderToNotify: {
        id: string
        tenantId: string
        guestEmail: string | null
        totalAmount: unknown
      } | null = null

      if (currentPayment.paymentStatus !== status) {
        if (status === 'succeeded') {
          await tx.tenantPayment.update({
            where: { id: currentPayment.id },
            data: { paymentStatus: 'succeeded' }
          })

          if (isBooking) {
            await tx.tenantBooking.update({
              where: { id: orderId },
              data: { bookingStatus: 'confirmed', paymentIntentId: String(rawEventId || '') }
            })
          } else {
            orderToNotify = await tx.tenantOrder.update({
              where: { id: orderId },
              data: {
                orderStatus: 'pending_fulfillment',
                receiptUrl: `/orders/${orderId}/receipt`
              }
            })
          }
        } else if (status === 'disputed') {
          await tx.tenantPayment.update({
            where: { id: currentPayment.id },
            data: { paymentStatus: 'disputed' }
          })

          const existingDispute = await tx.tenantPaymentDispute.findFirst({
            where: { tenantId: currentPayment.tenantId, paymentId: currentPayment.id }
          })
          if (!existingDispute) {
            await tx.tenantPaymentDispute.create({
              data: {
                tenantId: currentPayment.tenantId,
                paymentId: currentPayment.id,
                status: 'under_review',
                amount: currentPayment.amount,
                reason: `${provider} Webhook Chargeback Notification`
              }
            })
          }
        } else if (status === 'failed' || status === 'refunded') {
          await tx.tenantPayment.update({
            where: { id: currentPayment.id },
            data: { paymentStatus: status }
          })

          if (isBooking) {
            await tx.tenantBooking.update({
              where: { id: orderId },
              data: { bookingStatus: 'cancelled' }
            })
          } else {
            const order = await tx.tenantOrder.update({
              where: { id: orderId },
              data: { orderStatus: 'cancelled' }
            })
            await tx.tenantPaymentLedger.create({
              data: {
                tenantId: order.tenantId,
                paymentId: currentPayment.id,
                orderId: order.id,
                type: 'reversal',
                amount: currentPayment.amount,
                currency: currentPayment.currency,
                gateway: provider,
                gatewayTxId: String(rawEventId || 'unknown'),
                status: 'failed',
                metadata: body
              }
            })
          }
        }
      }

      if (idempotencyKey) {
        await tx.paymentIdempotencyKey.create({
          data: {
            tenantId,
            idempotencyKey,
            responsePayload: body,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })
      }

      return orderToNotify
    }, { isolationLevel: 'Serializable' })

    if (notificationOrder) {
      const customerEmail = notificationOrder.guestEmail || body.payer_email || 'customer@example.com'
      sendOrderConfirmationEmail(notificationOrder.tenantId, notificationOrder.id, customerEmail)
        .catch((err: unknown) => console.error('Failed to send async generic order confirmation email', err))

      const whatsAppConfig = await getTenantWhatsAppConfig(notificationOrder.tenantId)
      if (whatsAppConfig?.recipientNumber && whatsAppConfig.templateName) {
        await sendWhatsAppTemplate({
          to: whatsAppConfig.recipientNumber,
          templateName: whatsAppConfig.templateName,
          parameters: [notificationOrder.id, String(notificationOrder.totalAmount)],
          credentials: whatsAppConfig,
        }).catch((error: unknown) => console.error('Failed to send WhatsApp notification on webhook', error))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook/provider] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
