'use server'

import prisma from "@/lib/prisma"
import { Resend } from "resend"
import { getTenantWhatsAppConfig, sendWhatsAppTemplate } from "@/lib/whatsapp"
import crypto from 'crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { resolvePublicTenantFromHost } from '@/lib/tenant-context'
import { getWebhookSigningSecret } from '@/lib/webhook-signing'

const resend = new Resend(process.env.RESEND_API_KEY)

const contactFormSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(255).refine(value => !/[\r\n]/.test(value), 'Subject must be a single line.'),
  message: z.string().trim().min(1).max(5000),
  turnstileToken: z.string().trim().max(4096).nullable().optional(),
})

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)
}

export async function submitContactForm(tenantId: string, data: { name: string, email: string, subject: string, message: string, turnstileToken?: string | null }) {
  try {
    const parsed = contactFormSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: 'Please provide a valid name, email, and message.' }
    data = parsed.data

    const requestHeaders = headers()
    const publicTenant = await resolvePublicTenantFromHost(
      requestHeaders.get('host') || '',
      requestHeaders.get('x-tenant-id'),
    )
    if (!publicTenant || publicTenant.id !== tenantId) {
      return { success: false, error: 'This storefront is not available.' }
    }

    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!data.turnstileToken) {
        return { success: false, error: 'Security check is required.' }
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: data.turnstileToken,
        }),
      })
      const verifyData = await verifyRes.json().catch(() => ({ success: false }))
      if (!verifyRes.ok || !verifyData.success) {
        return { success: false, error: 'Security check failed. Please try again.' }
      }
    }
    const resolvedTenantId = publicTenant.id

    // 1. Create or Update CRM Contact
    const [firstName, ...lastNames] = data.name.split(' ')
    const lastName = lastNames.join(' ')
    
    let contact = await prisma.tenantCrmContact.findFirst({
      where: { tenantId: resolvedTenantId, email: data.email }
    })

    if (!contact) {
      contact = await prisma.tenantCrmContact.create({
        data: {
          tenantId: resolvedTenantId,
          email: data.email,
          firstName: firstName || '',
          lastName: lastName || '',
          tags: ['website_lead']
        }
      })
    }

    // 2. Add to Timeline
    await prisma.tenantCrmTimeline.create({
      data: {
        tenantId: resolvedTenantId,
        contactId: contact.id,
        eventType: 'contact_form_submitted',
        sourceModule: 'website',
        occurredAt: new Date(),
        eventPayload: {
          subject: data.subject,
          message: data.message
        }
      }
    })

    // 3. Trigger Webhooks for "contact.message_received"
    const activeWebhooks = await prisma.tenantApiWebhook.findMany({
      where: { tenantId: resolvedTenantId, isActive: true }
    })
    
    const webhooksToTrigger = activeWebhooks.filter(w => {
      const events = w.subscribedEvents as string[] || []
      return events.includes('contact.message_received') || events.includes('*')
    })

    // Fire webhook requests asynchronously in the background
    const payload = {
      event: 'contact.message_received',
      tenantId: resolvedTenantId,
      timestamp: new Date().toISOString(),
      data: {
        contact: {
          id: contact.id,
          name: data.name,
          email: data.email
        },
        message: {
          subject: data.subject,
          body: data.message
        }
      }
    }

    const payloadString = JSON.stringify(payload)
    webhooksToTrigger.forEach(w => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const signature = crypto.createHmac('sha256', getWebhookSigningSecret(w.secretSigningToken)).update(payloadString).digest('hex')
      headers['X-Webhook-Signature'] = signature

      fetch(w.targetUrl, {
        method: 'POST',
        headers,
        body: payloadString
      }).catch(err => console.error('Webhook delivery failed:', err))
    })

    // 4. Send Confirmation Email via Resend
    if (process.env.RESEND_API_KEY) {
      const safeFirstName = escapeHtml(firstName || 'there')
      const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br/>')
      await resend.emails.send({
        from: 'contact@dagangos.com',
        to: [data.email],
        subject: `Re: ${data.subject || 'Thank you for contacting us'}`,
        html: `
          <div>
            <p>Hi ${safeFirstName},</p>
            <p>Thank you for reaching out! We've received your message and will get back to you shortly.</p>
            <br/>
            <p><strong>Your message:</strong></p>
            <blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #555;">
              ${safeMessage}
            </blockquote>
            <br/>
            <p>Best regards,<br/>The Team</p>
          </div>
        `
      }).catch(err => console.error('Resend email failed:', err))
    }

    // 5. Trigger WhatsApp PA Alert (if configured)
    const whatsAppConfig = await getTenantWhatsAppConfig(resolvedTenantId)
    if (whatsAppConfig?.recipientNumber && whatsAppConfig.templateName) {
      await sendWhatsAppTemplate({
        to: whatsAppConfig.recipientNumber,
        templateName: whatsAppConfig.templateName,
        parameters: [data.name, data.email],
        credentials: whatsAppConfig,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Contact form submission failed', { name: error instanceof Error ? error.name : 'unknown' })
    return { success: false, error: 'Unable to send your message right now.' }
  }
}
