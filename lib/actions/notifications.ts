'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"
import nodemailer from 'nodemailer'

const SECRET_MASK = '••••••••'

type EmailGatewayConfig = {
  host?: string
  port?: string
  encryption?: string
  username?: string
  password?: string
  fromEmail?: string
  fromName?: string
}

function getEmailSender(config: EmailGatewayConfig) {
  const fromEmail = config.fromEmail?.trim() || config.username?.trim()
  if (!fromEmail) return ''
  const fromName = config.fromName?.trim()
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail
}

function toSafeGateway<T extends { encryptedCredentials?: unknown }>(gateway: T | null, providerConfig?: Record<string, unknown>) {
  if (!gateway) return null
  const { encryptedCredentials: _encryptedCredentials, ...safeGateway } = gateway
  return providerConfig ? { ...safeGateway, providerConfig } : safeGateway
}

function toSafeEmailGatewayConfig(config: EmailGatewayConfig) {
  return {
    host: config.host || '',
    port: config.port || '',
    encryption: config.encryption || '',
    username: config.username || '',
    fromEmail: config.fromEmail || '',
    fromName: config.fromName || '',
    password: config.password ? SECRET_MASK : ''
  }
}

export async function getNotificationTemplates(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'read')

    const templates = await prisma.tenantNotificationTemplate.findMany({
      where: { tenantId },
      orderBy: { templateKey: 'asc' }
    })
    return { success: true, templates }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateNotificationTemplate(tenantId: string, templateId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const template = await prisma.tenantNotificationTemplate.update({
      where: { id: templateId, tenantId },
      data: {
        subjectLine: data.subjectLine,
        htmlBodyMarkup: data.htmlBodyMarkup
      }
    })
    revalidatePath('/admin/notifications')
    return { success: true, template }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getActiveGatewayWithRouting(tenantId: string, channelType: string) {
  const gateways = await prisma.tenantNotificationGateway.findMany({
    where: { tenantId, channelType, isActive: true }
  })

  if (gateways.length === 0) return null

  const mapped = gateways.map(gw => {
    let priority = 0
    let businessHours = null
    
    try {
      const config = typeof gw.encryptedCredentials === 'string' 
        ? JSON.parse(gw.encryptedCredentials) 
        : gw.encryptedCredentials
      
      if (config) {
        priority = typeof config.priority === 'number' ? config.priority : (parseInt(config.priority, 10) || 0)
        if (config.businessHoursStart && config.businessHoursEnd) {
          businessHours = {
            start: config.businessHoursStart,
            end: config.businessHoursEnd,
            timezone: config.timezone || 'UTC'
          }
        }
      }
    } catch (e) {
      // Ignore config parse errors
    }

    return { gateway: gw, priority, businessHours }
  })

  mapped.sort((a, b) => b.priority - a.priority)

  const now = new Date()

  for (const item of mapped) {
    if (item.businessHours) {
      try {
        const [sh, sm] = item.businessHours.start.split(':').map(Number)
        const [eh, em] = item.businessHours.end.split(':').map(Number)
        
        const tzTime = new Date(now.toLocaleString('en-US', { timeZone: item.businessHours.timezone }))
        const tzHour = tzTime.getHours()
        const tzMin = tzTime.getMinutes()
        
        const currentMins = tzHour * 60 + tzMin
        const startMins = sh * 60 + sm
        const endMins = eh * 60 + em

        if (startMins <= endMins) {
          if (currentMins < startMins || currentMins > endMins) {
            continue
          }
        } else {
          if (currentMins < startMins && currentMins > endMins) {
            continue
          }
        }
      } catch (err) {
        console.error("Failed to parse business hours for gateway routing", err)
      }
    }

    return item.gateway
  }

  return mapped[0]?.gateway || null
}

export async function getNotificationGateway(tenantId: string, channelType: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'read')

    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType }
    })
    
    if (gateway && gateway.encryptedCredentials) {
      const rawConfig = typeof gateway.encryptedCredentials === 'string' ? JSON.parse(gateway.encryptedCredentials) : gateway.encryptedCredentials
      const config = rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig) ? rawConfig as EmailGatewayConfig : {}
      return {
        success: true,
        // The dashboard only needs the SMTP fields it can edit. Never return
        // arbitrary provider configuration, encrypted data, or a raw token.
        gateway: toSafeGateway(gateway, channelType === 'email'
          ? toSafeEmailGatewayConfig(config)
          : { credentialsConfigured: true })
      }
    }
    
    return { success: true, gateway: toSafeGateway(gateway) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveNotificationGateway(tenantId: string, channelType: string, providerName: string, config: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const secureConfig = { ...config }
    const existingGateway = await prisma.tenantNotificationGateway.findUnique({
      where: {
        tenantId_channelType_providerName: {
          tenantId,
          channelType,
          providerName
        }
      },
      select: { encryptedCredentials: true }
    })
    const existingConfig = existingGateway?.encryptedCredentials as EmailGatewayConfig | null

    if (secureConfig.password === SECRET_MASK) {
      if (existingConfig?.password) {
        secureConfig.password = existingConfig.password
      } else {
        delete secureConfig.password
      }
    } else if (secureConfig.password) {
      secureConfig.password = encrypt(secureConfig.password)
    }

    const gateway = await prisma.tenantNotificationGateway.upsert({
      where: {
        tenantId_channelType_providerName: {
          tenantId,
          channelType,
          providerName
        }
      },
      update: {
        encryptedCredentials: secureConfig,
        isActive: true
      },
      create: {
        tenantId,
        channelType,
        providerName,
        encryptedCredentials: secureConfig,
        isActive: true
      }
    })

    revalidatePath('/admin/notifications')
    return { success: true, gateway: toSafeGateway(gateway) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleNotificationGateway(tenantId: string, gatewayId: string, isActive: boolean) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const gateway = await prisma.tenantNotificationGateway.update({
      where: { id: gatewayId, tenantId },
      data: { isActive }
    })
    revalidatePath('/admin/notifications')
    return { success: true, gateway: toSafeGateway(gateway) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createNotificationTemplate(tenantId: string, data: { templateKey: string, channelType: string, subjectLine?: string, htmlBodyMarkup: string }) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const template = await prisma.tenantNotificationTemplate.create({
      data: {
        tenantId,
        templateKey: data.templateKey,
        channelType: data.channelType,
        subjectLine: data.subjectLine || null,
        htmlBodyMarkup: data.htmlBodyMarkup
      }
    })
    revalidatePath('/admin/notifications')
    return { success: true, template }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Internal Helper for Retry and Backoff Sending
async function sendWithRetryAndLog(logId: string, maxRetries = 3) {
  const log = await prisma.tenantNotificationLog.findUnique({
    where: { id: logId },
    include: { gateway: true }
  })
  if (!log) return false

  if (!log.gateway || !log.gateway.isActive) {
    const fallbackGateway = await getActiveGatewayWithRouting(log.tenantId, log.channelType)
    if (fallbackGateway && fallbackGateway.id !== log.gatewayId) {
      await prisma.tenantNotificationLog.update({
        where: { id: logId },
        data: { gatewayId: fallbackGateway.id }
      })
      return sendWithRetryAndLog(logId, maxRetries)
    }

    await prisma.tenantNotificationLog.update({
      where: { id: logId },
      data: { status: 'failed', deliveryError: 'Missing or inactive gateway', retryCount: 3 }
    })
    return false
  }

  const gateway = log.gateway
  let attempt = 0
  let success = false
  let lastError = ''

  while (attempt < maxRetries && !success) {
    try {
      if (log.channelType === 'email') {
        const config = gateway.encryptedCredentials as EmailGatewayConfig
        const password = config.password ? decrypt(config.password) : ''
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: parseInt(config.port || '587', 10),
          secure: config.encryption === 'SSL' || config.port === '465',
          auth: {
            user: config.username,
            pass: password,
          }
        })
        
        const metadata = log.metadata as any
        const subject = metadata?.subject || 'System Notification'
        const html = metadata?.body || 'You have a new notification.'

        await transporter.sendMail({
          from: getEmailSender(config),
          to: log.recipient,
          subject,
          html,
          text: html.replace(/<[^>]*>/g, '')
        })
      } else if (log.channelType === 'sms') {
        const config = gateway.encryptedCredentials as any
        const authToken = config.password ? decrypt(config.password) : ''
        const accountSid = config.accountSid
        const fromNumber = config.fromNumber || config.from

        if (!accountSid || !authToken || !fromNumber) {
          throw new Error('Twilio credentials missing (accountSid, password/authToken, fromNumber)')
        }

        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        
        const params = new URLSearchParams()
        params.append('To', log.recipient)
        params.append('From', fromNumber)
        params.append('Body', log.metadata ? (log.metadata as any).body || 'You have a new notification.' : 'You have a new notification.')

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Twilio API error: ${response.status} - ${errText}`)
        }
      }
      success = true
    } catch (err: any) {
      attempt++
      lastError = err.message
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  if (!success) {
    const fallbackGateway = await getActiveGatewayWithRouting(log.tenantId, log.channelType)
    if (fallbackGateway && fallbackGateway.id !== log.gatewayId) {
      await prisma.tenantNotificationLog.update({
        where: { id: logId },
        data: { gatewayId: fallbackGateway.id, retryCount: 0 }
      })
      return sendWithRetryAndLog(logId, maxRetries)
    }
  }

  await prisma.tenantNotificationLog.update({
    where: { id: logId },
    data: {
      status: success ? 'delivered' : 'failed',
      deliveryError: success ? null : `Failed after ${attempt} attempts. Last error: ${lastError}`,
      retryCount: attempt,
      sentAt: success ? new Date() : null
    }
  })

  return success
}

export async function dispatchTestNotification(tenantId: string, templateId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const template = await prisma.tenantNotificationTemplate.findUnique({
      where: { id: templateId, tenantId }
    })
    if (!template) throw new Error('Template not found')
    
    const gateway = await getActiveGatewayWithRouting(tenantId, template.channelType)
    if (!gateway) throw new Error('No active gateway found for this channel')

    const log = await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway.id,
        recipient: 'test@example.com',
        channelType: template.channelType,
        status: 'pending'
      }
    })

    const success = await sendWithRetryAndLog(log.id)
    if (!success) {
      const refreshedLog = await prisma.tenantNotificationLog.findUnique({ where: { id: log.id } })
      throw new Error(refreshedLog?.deliveryError || 'Notification dispatch failed')
    }
    
    return { success: true, message: `Test ${template.channelType.toUpperCase()} dispatched successfully.` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendSmtpTestEmail(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const gateway = await getActiveGatewayWithRouting(tenantId, 'email')
    if (!gateway) throw new Error('Save and enable an SMTP gateway before sending a test email')

    const config = gateway.encryptedCredentials as EmailGatewayConfig
    const password = config.password ? decrypt(config.password) : ''
    const from = getEmailSender(config)
    if (!config.host || !config.port || !config.username || !password || !from) {
      throw new Error('SMTP host, port, username, password, and sender email are required')
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port || '587', 10),
      secure: config.encryption === 'SSL' || config.port === '465',
      auth: { user: config.username, pass: password }
    })

    await transporter.verify()
    await transporter.sendMail({
      from,
      to: user.email,
      subject: 'DagangOS SMTP test successful',
      text: 'Your DagangOS SMTP gateway is connected and can deliver transactional email.',
      html: '<p>Your DagangOS SMTP gateway is connected and can deliver transactional email.</p>'
    })

    await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway.id,
        recipient: user.email,
        channelType: 'email',
        status: 'sent',
        sentAt: new Date(),
        metadata: { type: 'smtp_connection_test' }
      }
    })

    revalidatePath('/admin/notifications')
    return { success: true, recipient: user.email }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function dispatchNotification(
  tenantId: string,
  recipient: string,
  channelType: string,
  templateKey: string,
  variables: Record<string, string> = {}
) {
  try {
    const gateway = await getActiveGatewayWithRouting(tenantId, channelType)

    let template = await prisma.tenantNotificationTemplate.findFirst({
      where: { tenantId, templateKey, channelType }
    })

    if (!template) {
      let defaultSubject = 'System Notification'
      let defaultBody = 'Hello, you have a new notification.'

      if (templateKey === 'order_confirmation') {
        defaultSubject = 'Order Confirmation - #{{order_id}}'
        defaultBody = '<h2>Order Confirmed!</h2><p>Hello {{customer_name}},</p><p>Thank you for your order. We have successfully received your payment of Rp {{amount}}.</p><p><a href="https://store.dagangos.com/orders/{{order_id}}/receipt">View Receipt</a></p>'
      } else if (templateKey === 'workspace_invitation') {
        defaultSubject = 'Your DagangOS workspace is ready'
        defaultBody = '<h2>Welcome to DagangOS</h2><p>Your workspace for <strong>{{company_name}}</strong> is ready.</p><p><strong>Temporary domain:</strong> <a href="{{workspace_url}}">{{workspace_url}}</a></p><p>Use this secure, one-time link to set your password and activate access:</p><p><a href="{{access_url}}">Set your password</a></p><p>This link expires on {{expires_at}}. If you did not expect this invitation, please contact DagangOS Digital Indonesia.</p>'
      } else if (templateKey === 'payment_failed') {
        defaultSubject = 'Payment Failed - #{{order_id}}'
        defaultBody = '<h2>Payment Failed</h2><p>Hello {{customer_name}},</p><p>Your payment attempt of Rp {{amount}} for order #{{order_id}} failed. Please try again.</p>'
      } else if (templateKey === 'incident_alert') {
        defaultSubject = 'CRITICAL ALERT: {{incident_title}}'
        defaultBody = '<h2>Critical Incident Alert</h2><p><strong>System Alert:</strong> {{incident_title}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Time:</strong> {{time}}</p><p>Please log in to the dashboard to investigate.</p>'
      } else if (templateKey === 'incident_resolved') {
        defaultSubject = 'RESOLVED: {{incident_title}}'
        defaultBody = '<h2>Incident Resolved</h2><p><strong>System Alert:</strong> {{incident_title}}</p><p><strong>Status:</strong> RESOLVED</p><p><strong>Time:</strong> {{time}}</p><p>The incident has been marked as resolved. System operation has returned to normal.</p>'
      } else if (templateKey === 'monitoring_rule_update') {
        defaultSubject = 'Alert Rule {{action}} - {{rule_name}}'
        defaultBody = '<h2>Alert Rule Change</h2><p>An alert rule was successfully <strong>{{action}}</strong>.</p><p><strong>Rule:</strong> {{rule_name}}</p><p><strong>Time:</strong> {{time}}</p>'
      } else if (templateKey === 'inventory_alert') {
        defaultSubject = 'LOW STOCK ALERT: {{item_name}}'
        defaultBody = '<h2>Low Stock Warning</h2><p>The system has detected low stock levels for item: <strong>{{item_name}}</strong>.</p><p><strong>Current Quantity:</strong> {{qty}}</p><p><strong>Low Stock Threshold:</strong> {{threshold}}</p><p><strong>Status:</strong> {{status}}</p><p>Please replenish inventory levels as soon as possible.</p>'
      }

      try {
        template = await prisma.tenantNotificationTemplate.create({
          data: {
            tenantId,
            templateKey,
            channelType,
            subjectLine: defaultSubject,
            htmlBodyMarkup: defaultBody
          }
        })
      } catch {
        // Fallback for race condition
      }
    }

    let subject = 'System Notification'
    let body = 'You have a new notification.'

    if (template) {
      subject = template.subjectLine || subject
      body = template.htmlBodyMarkup

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
        subject = subject.replace(placeholder, value)
        body = body.replace(placeholder, value)
      }
    }

    const log = await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway?.id,
        recipient,
        channelType,
        status: 'pending',
        metadata: { subject, body }
      }
    })

    // Dispatch asynchronously
    sendWithRetryAndLog(log.id).catch(err => console.error("Async notification dispatch failed", err))

    return { success: true, log }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
export async function processNotificationQueue(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const now = new Date()
    const pendingLogs = await prisma.tenantNotificationLog.findMany({
      where: { tenantId, status: { in: ['pending', 'failed'] }, retryCount: { lt: 3 } },
      take: 10
    })
    
    // Enforce background exponential backoff scheduler
    const logsToProcess = pendingLogs.filter(log => {
      if (log.status === 'pending' && log.retryCount === 0) return true
      
      const createdTime = new Date(log.createdAt).getTime()
      const ageMs = now.getTime() - createdTime
      
      // Delay intervals: retry count 1 = 5 min, retry count 2 = 15 min
      const requiredDelayMs = log.retryCount === 1 ? 5 * 60 * 1000 : 15 * 60 * 1000
      return ageMs >= requiredDelayMs
    })
    
    let processed = 0
    for (const log of logsToProcess) {
      const success = await sendWithRetryAndLog(log.id)
      if (success) processed++
    }
    return { success: true, processed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getNotificationLogs(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'read')

    const logs = await prisma.tenantNotificationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    return { success: true, logs }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteNotificationTemplate(tenantId: string, templateId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    await prisma.tenantNotificationTemplate.delete({
      where: { id: templateId, tenantId }
    })
    revalidatePath('/admin/notifications')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function retryNotificationLog(tenantId: string, logId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'write')

    const log = await prisma.tenantNotificationLog.findUnique({
      where: { id: logId, tenantId }
    })
    if (!log) throw new Error("Log not found")
    
    await prisma.tenantNotificationLog.update({
      where: { id: logId },
      data: { status: 'pending', deliveryError: null, retryCount: log.retryCount + 1 }
    })
    
    // Process immediately
    sendWithRetryAndLog(logId).catch(err => console.error("Async retry notification dispatch failed", err))
    
    revalidatePath('/admin/notifications')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendOrderConfirmationEmail(tenantId: string, orderId: string, recipientEmail: string) {
  try {
    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            catalogItem: true
          }
        }
      }
    })
    
    if (!order) throw new Error("Order not found")

    // Find active email gateway
    const gateway = await getActiveGatewayWithRouting(tenantId, 'email')
    if (!gateway) {
      console.warn("No active email gateway found. Skipping order confirmation email.")
      return { success: false, error: "No active email gateway found" }
    }

    const config = gateway.encryptedCredentials as EmailGatewayConfig
    const password = config.password ? decrypt(config.password) : ''
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port || '587', 10),
      secure: config.encryption === 'SSL' || config.port === '465',
      auth: {
        user: config.username,
        pass: password,
      }
    })

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.catalogItem?.title || 'Product'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rp ${Number(item.unitPrice).toLocaleString('id-ID')}</td>
      </tr>
    `).join('')

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #4F46E5; text-align: center;">Order Confirmed!</h2>
        <p>Dear Customer,</p>
        <p>Thank you for your order. We have successfully received your payment.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 8px; text-align: right; font-weight: bold; color: #4F46E5;">Rp ${Number(order.totalAmount).toLocaleString('id-ID')}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="https://store.dagangos.com/orders/${orderId}/receipt" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Receipt</a>
        </div>
      </div>
    `

    // Log the notification
    const log = await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway.id,
        recipient: recipientEmail,
        channelType: 'email',
        status: 'pending'
      }
    })

    try {
      await transporter.sendMail({
        from: getEmailSender(config),
        to: recipientEmail,
        subject: `Order Confirmation - #${orderId}`,
        html: emailHtml
      })

      await prisma.tenantNotificationLog.update({
        where: { id: log.id },
        data: {
          status: 'delivered',
          sentAt: new Date()
        }
      })
      return { success: true }
    } catch (err: any) {
      await prisma.tenantNotificationLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          deliveryError: err.message
        }
      })
      throw err
    }
  } catch (error: any) {
    console.error("sendOrderConfirmationEmail error:", error)
    return { success: false, error: error.message }
  }
}
