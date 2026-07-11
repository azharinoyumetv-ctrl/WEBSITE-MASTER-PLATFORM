'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'



export async function getNotificationTemplates(tenantId: string) {
  try {
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
    // Encrypt password if present
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

import nodemailer from 'nodemailer'

export async function dispatchTestNotification(tenantId: string, templateId: string) {
  try {
    const template = await prisma.tenantNotificationTemplate.findUnique({
      where: { id: templateId, tenantId }
    })
    if (!template) throw new Error('Template not found')
    
    const gateway = await prisma.tenantNotificationGateway.findFirst({
      where: { tenantId, channelType: template.channelType, isActive: true }
    })
    if (!gateway) throw new Error('No active gateway found for this channel')

    const config = gateway.encryptedCredentials as any
    const password = config.password ? decrypt(config.password) : ''
    
    if (template.channelType === 'email') {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: parseInt(config.port, 10),
        secure: config.encryption === 'SSL' || config.port === '465',
        auth: {
          user: config.username,
          pass: password,
        }
      })
      
      const mailOptions = {
        from: config.username,
        to: 'test@example.com',
        subject: template.subjectLine || 'Test Notification',
        html: template.htmlBodyMarkup
      }

      await transporter.sendMail(mailOptions)
    }

    await prisma.tenantNotificationLog.create({
      data: {
        tenantId,
        gatewayId: gateway.id,
        recipient: 'test@example.com',
        channelType: template.channelType,
        status: 'delivered',
        sentAt: new Date()
      }
    })
    
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

    return { success: true, log }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processNotificationQueue(tenantId: string) {
  try {
    const pendingLogs = await prisma.tenantNotificationLog.findMany({
      where: { tenantId, status: { in: ['pending', 'failed'] }, retryCount: { lt: 3 } },
      take: 10
    })
    
    let processed = 0
    for (const log of pendingLogs) {
      if (!log.gatewayId) {
        await prisma.tenantNotificationLog.update({
          where: { id: log.id },
          data: { status: 'failed', deliveryError: 'No gateway assigned', retryCount: 3 }
        })
        continue
      }
      
      const gateway = await prisma.tenantNotificationGateway.findUnique({ where: { id: log.gatewayId } })
      if (!gateway || !gateway.isActive) {
         await prisma.tenantNotificationLog.update({
          where: { id: log.id },
          data: { status: 'failed', deliveryError: 'Gateway inactive or missing', retryCount: 3 }
        })
        continue
      }
      
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
        }
        
        await prisma.tenantNotificationLog.update({
          where: { id: log.id },
          data: { status: 'delivered', sentAt: new Date(), deliveryError: null }
        })
        processed++
      } catch (err: any) {
        await prisma.tenantNotificationLog.update({
          where: { id: log.id },
          data: { 
            status: 'failed', 
            deliveryError: err.message,
            retryCount: log.retryCount + 1
          }
        })
      }
    }
    return { success: true, processed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getNotificationLogs(tenantId: string) {
  try {
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
    const log = await prisma.tenantNotificationLog.findUnique({
      where: { id: logId, tenantId }
    })
    if (!log) throw new Error("Log not found")
    
    // Simplistic retry mark for processNotificationQueue to pick up later
    await prisma.tenantNotificationLog.update({
      where: { id: logId },
      data: { status: 'pending', deliveryError: null, retryCount: log.retryCount + 1 }
    })
    
    // We could immediately call processNotificationQueue(tenantId) here, but marking it pending is enough
    revalidatePath('/admin/notifications')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
