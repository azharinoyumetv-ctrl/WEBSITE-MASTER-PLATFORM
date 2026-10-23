import 'server-only'
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { timingSafeEqual } from 'crypto'

export async function getXenditCredentials(tenantId: string) {
  const tenant = await prisma.systemTenant.findUnique({ where: { id: tenantId }, include: { website: true } })
  if (!tenant) throw new Error('Tenant not found')
  const website = tenant.website
  const platformKey = process.env.XENDIT_SECRET_KEY || process.env.XENDIT_API
  if (tenant.subdomain === 'default' && platformKey) {
    if (!process.env.XENDIT_WEBHOOK_TOKEN) throw new Error('Xendit webhook verification is not configured')
    return { secret: platformKey, webhookToken: process.env.XENDIT_WEBHOOK_TOKEN, tenant }
  }
  if (!website?.xenditEnabled || !website.xenditEncryptedSecret || !website.xenditEncryptedWebhookToken) throw new Error('Xendit is not configured for this tenant')
  const unpack = (value: string, iv: string | null) => decrypt(iv && !value.includes(':') ? `${iv}:${value}` : value)
  const secret = unpack(website.xenditEncryptedSecret, website.xenditEncryptedSecretIv)
  const webhookToken = unpack(website.xenditEncryptedWebhookToken, website.xenditEncryptedWebhookTokenIv)
  if (!secret || !webhookToken) throw new Error('Xendit credentials could not be read')
  return { secret, webhookToken, tenant }
}

export function validXenditToken(actual: string | null, expected: string) {
  return !!actual && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

export function validXenditUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['checkout.xendit.co', 'checkout-staging.xendit.co'].includes(url.hostname) && !url.username && !url.password && !url.port
  } catch { return false }
}

export async function readXenditInvoice(secret: string, id: string) {
  if (!/^[a-zA-Z0-9_-]{12,100}$/.test(id)) throw new Error('Invalid Xendit invoice ID')
  const response = await fetch(`https://api.xendit.co/v2/invoices/${id}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}` },
    redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('Xendit invoice could not be verified')
  return response.json()
}
