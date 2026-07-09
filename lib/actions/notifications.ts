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

export async function dispatchTestNotification(tenantId: string, templateId: string) {
  try {
    // In a real implementation, this would fetch the gateway config,
    // compile the template using Handlebars or similar, and send the notification via an external API.
    // For now, we simulate a successful dispatch.
    const template = await prisma.tenantNotificationTemplate.findUnique({
      where: { id: templateId, tenantId }
    })
    if (!template) {
      throw new Error('Template not found')
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    return { success: true, message: `Test ${template.channelType.toUpperCase()} dispatched successfully.` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
