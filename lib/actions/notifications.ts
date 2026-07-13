'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"
import nodemailer from 'nodemailer'

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

export async function getNotificationGateway(tenantId: string, channelType: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'notifications', 'read')

    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType }
    })
    
    if (gateway && gateway.encryptedCredentials) {
      const config = typeof gateway.encryptedCredentials === 'string' ? JSON.parse(gateway.encryptedCredentials) : gateway.encryptedCredentials
      if (config.password) {
        config.password = decrypt(config.password)
      }
      return { success: true, gateway: { ...gateway, providerConfig: config } }
    }
    
    return { success: true, gateway }
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
    if (secureConfig.password) {
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
    return { success: true, gateway }
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
    return { success: true, gateway }
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
        const config = gateway.encryptedCredentials as any
        const password = config.password ? decrypt(config.password) : ''
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: parseInt(config.port, 10),
          secure: config.encryption === 'SSL' || config.port === '465',
          auth: {
            user: config.username,
            pass: password,
          }
        })
        
        await transporter.sendMail({
          from: config.username,
          to: log.recipient,
          subject: 'System Notification',
          text: 'You have a new notification.'
        })
      } else if (log.channelType === 'sms') {
        console.log(`[SMS] Sending to ${log.recipient} via Twilio simulation.`)
      }
      success = true
    } catch (err: any) {
      attempt++
      lastError = err.message
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
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
    
    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType: template.channelType, isActive: true }
    })
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

export async function dispatchNotification(tenantId: string, recipient: string, channelType: string) {
  try {
    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType, isActive: true }
    })

    const log = await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway?.id,
        recipient,
        channelType,
        status: 'pending'
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

    const pendingLogs = await prisma.tenantNotificationLog.findMany({
      where: { tenantId, status: { in: ['pending', 'failed'] }, retryCount: { lt: 3 } },
      take: 10
    })
    
    let processed = 0
    for (const log of pendingLogs) {
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
    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType: 'email', isActive: true }
    })
    if (!gateway) {
      console.warn("No active email gateway found. Skipping order confirmation email.")
      return { success: false, error: "No active email gateway found" }
    }

    const config = gateway.encryptedCredentials as any
    const password = config.password ? decrypt(config.password) : ''
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port, 10),
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
        from: config.username,
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
