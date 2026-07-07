'use server'

import prisma from "@/lib/prisma"

export async function submitContactForm(tenantId: string, data: { name: string, email: string, subject: string, message: string }) {
  try {
    let resolvedTenantId = tenantId
    if (tenantId === 'default') {
      const defaultTenant = await prisma.systemTenant.findFirst({
        where: { subdomain: 'default' }
      })
      if (defaultTenant) {
        resolvedTenantId = defaultTenant.id
      } else {
        console.log('Contact submission received for default tenant, but default tenant is not seeded:', data)
        return { success: true }
      }
    }

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

    webhooksToTrigger.forEach(w => {
      fetch(w.targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error('Webhook delivery failed:', err))
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
