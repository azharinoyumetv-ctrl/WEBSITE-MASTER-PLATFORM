/**
 * Utility for sending messages via official Meta WhatsApp Cloud API
 */
import prisma from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export type WhatsAppCredentials = {
  token: string
  phoneNumberId: string
}

export type TenantWhatsAppConfig = WhatsAppCredentials & {
  recipientNumber: string
  templateName: string
}

/** Resolves credentials only for a tenant that owns the WhatsApp Business add-on. */
export async function getTenantWhatsAppConfig(tenantId: string): Promise<TenantWhatsAppConfig | null> {
  const [module, website] = await Promise.all([
    prisma.tenantModule.findUnique({
      where: { tenantId_moduleKey: { tenantId, moduleKey: 'whatsapp_module' } },
      select: { isEnabled: true },
    }),
    prisma.tenantWebsite.findUnique({ where: { tenantId } }),
  ])

  if (!module?.isEnabled || !website) return null

  const themeConfig = (website.themeConfig as Record<string, unknown>) || {}
  const legacyToken = typeof themeConfig.whatsappToken === 'string' ? themeConfig.whatsappToken : ''
  const token = website.whatsappEncryptedAccessToken
    ? decrypt(website.whatsappEncryptedAccessToken)
    : legacyToken
  const phoneNumberId = typeof themeConfig.whatsappPhoneId === 'string' ? themeConfig.whatsappPhoneId.trim() : ''
  const recipientNumber = typeof themeConfig.whatsappPaNumber === 'string' ? themeConfig.whatsappPaNumber.trim() : ''
  const templateName = typeof themeConfig.whatsappTemplate === 'string' ? themeConfig.whatsappTemplate.trim() : ''

  if (!token || !phoneNumberId) return null
  return { token, phoneNumberId, recipientNumber, templateName }
}

export async function sendWhatsAppText({
  to,
  message,
  credentials,
}: {
  to: string
  message: string
  credentials: WhatsAppCredentials
}) {
  const cleanPhone = to.replace(/[^0-9]/g, '')
  if (!cleanPhone || !message.trim()) return { success: false, error: 'Recipient and message are required' }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${credentials.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { body: message.trim() },
      }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error?.message || 'WhatsApp delivery failed' }
    return { success: true, data }
  } catch (error: any) {
    console.error('WhatsApp API Network/Execution Error:', error)
    return { success: false, error: error.message || 'WhatsApp delivery failed' }
  }
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  parameters = [],
  languageCode = 'id',
  credentials
}: {
  to: string
  templateName: string
  parameters: string[]
  languageCode?: string
  credentials?: WhatsAppCredentials
}) {
  const token = credentials?.token || process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = credentials?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.error('WhatsApp API credentials missing in environment variables.')
    return { success: false, error: 'Credentials missing' }
  }

  // Clean the phone number (must be international format without + or leading 0, e.g. 628999155182)
  const cleanPhone = to.replace(/[^0-9]/g, '')

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: [
        {
          type: 'body',
          parameters: parameters.map(param => ({
            type: 'text',
            text: param
          }))
        }
      ]
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('WhatsApp API Error Response:', data)
      return { success: false, error: data.error?.message || 'Failed to send WhatsApp message' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('WhatsApp API Network/Execution Error:', error)
    return { success: false, error: error.message }
  }
}
