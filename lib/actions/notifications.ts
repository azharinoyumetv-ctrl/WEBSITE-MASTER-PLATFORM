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
    
    if (gateway && gateway.providerConfig) {
      const config = gateway.providerConfig as any
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
        providerConfig: secureConfig,
        isActive: true
      },
      create: {
        tenantId,
        channelType,
        providerName,
        providerConfig: secureConfig,
        isActive: true
      }
    })

    revalidatePath('/admin/notifications')
    return { success: true, gateway }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
