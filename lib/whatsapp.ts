/**
 * Utility for sending messages via official Meta WhatsApp Cloud API
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  parameters = [],
  languageCode = 'id'
}: {
  to: string
  templateName: string
  parameters: string[]
  languageCode?: string
}) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

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
