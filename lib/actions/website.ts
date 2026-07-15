'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { requirePermission, getAuthenticatedUser } from '@/lib/rbac'
import crypto from 'crypto'
import { z } from 'zod'
import { COMPANY } from '@/lib/company'

const layoutBlockSchema = z.array(z.object({
  type: z.enum(['hero', 'text', 'features', 'catalog_grid', 'contact_form']),
  config: z.any().optional(),
  data: z.any().optional()
}))

// Fetch public website config (used by public site renderer)
export async function getPublicWebsiteConfig(tenantDomain: string) {
  try {
    // Attempt to match domain or subdomain
    const tenant = await prisma.systemTenant.findFirst({
      where: {
        OR: [
          { subdomain: tenantDomain },
          { customDomain: tenantDomain }
        ]
      },
      include: {
        website: true
      }
    })

    if (!tenant || !tenant.website || !tenant.website.isActive) {
      if (tenantDomain === 'default') {
        const fallbackTenant = tenant || await prisma.systemTenant.findFirst({
          where: { status: 'active' },
          orderBy: { createdAt: 'asc' }
        })

        if (fallbackTenant) {
          return {
            success: true,
            website: {
              tenantId: fallbackTenant.id,
              siteTitle: fallbackTenant.companyName || COMPANY.legalName,
              themeConfig: { colors: { primary: '#4f46e5' } },
              globalSeoMetadata: { keywords: [], description: '' },
              faviconUrl: null,
              logoUrl: null,
              isActive: true,
              xenditEnabled: false,
              midtransEnabled: false,
              dokuEnabled: false
            },
            tenantId: fallbackTenant.id,
            tenant: fallbackTenant
          }
        }
      }

      return { success: false, error: 'Website not found or inactive' }
    }

    return { success: true, website: tenant.website, tenantId: tenant.id, tenant }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Fetch public page
export async function getPublicPage(tenantId: string, slug: string) {
  try {
    const page = await prisma.tenantPage.findUnique({
      where: {
        tenantId_slug: { tenantId, slug }
      }
    })

    if (!page || page.isDeleted) {
      return { success: false, error: 'Page not found' }
    }
    if (!page.isPublished) {
      return { success: false, error: 'Page is draft', isDraft: true }
    }

    return { success: true, page }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Get all pages
export async function getAdminPages(tenantId: string) {
  try {
    const pages = await prisma.tenantPage.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, pages }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Save Page
export async function saveAdminPage(tenantId: string, pageId: string | undefined, data: any) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'website', 'write')
    
    if (data.layoutBlocks) {
      const parsed = layoutBlockSchema.safeParse(data.layoutBlocks)
      if (!parsed.success) {
        throw new Error(`Invalid page layout configuration: ${parsed.error.message}`)
      }
    }

    let page;
    if (pageId) {
      page = await prisma.tenantPage.update({
        where: { id: pageId, tenantId },
        data: {
          title: data.title,
          slug: data.slug,
          layoutBlocks: data.layoutBlocks,
          seoMetadata: data.seoMetadata,
          isPublished: data.isPublished
        }
      })
    } else {
      page = await prisma.tenantPage.create({
        data: {
          tenantId,
          title: data.title,
          slug: data.slug,
          layoutBlocks: data.layoutBlocks,
          seoMetadata: data.seoMetadata,
          isPublished: data.isPublished
        }
      })
    }
    revalidatePath('/admin/pages')
    revalidatePath('/site')
    return { success: true, page }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Delete Page
export async function deleteAdminPage(tenantId: string, pageId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'website', 'write')
    
    // Soft delete
    await prisma.tenantPage.update({
      where: { id: pageId, tenantId },
      data: { isDeleted: true }
    })
    revalidatePath('/admin/pages')
    revalidatePath('/site')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Temporary Cache for Typed AI secrets (stops API Key Leak from Browser)
const tempAiSecrets = new Map<string, { secret: string, expiresAt: number }>()

export async function createTempAiSecretToken(tenantId: string, secret: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'settings', 'write')

    const token = crypto.randomUUID()
    tempAiSecrets.set(token, {
      secret,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    })
    
    // Clean expired records
    tempAiSecrets.forEach((v, k) => {
      if (v.expiresAt < Date.now()) tempAiSecrets.delete(k)
    })

    return { success: true, token }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTempAiSecret(token: string): Promise<string | null> {
  const record = tempAiSecrets.get(token)
  if (!record) return null
  if (record.expiresAt < Date.now()) {
    tempAiSecrets.delete(token)
    return null
  }
  return record.secret
}

// Admin: Get Website Config
export async function getAdminWebsiteConfig(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'website', 'read')

    const website = await prisma.tenantWebsite.findUnique({
      where: { tenantId }
    })
    
    if (website) {
      // Return configured flags instead of raw placeholders
      (website as any).isXenditSecretConfigured = !!website.xenditEncryptedSecret;
      (website as any).isXenditWebhookTokenConfigured = !!website.xenditEncryptedWebhookToken;
      (website as any).isMidtransServerKeyConfigured = !!website.midtransEncryptedServerKey;
      (website as any).isDokuClientIdConfigured = !!website.dokuClientId;
      (website as any).isDokuMerchantPublicKeyConfigured = !!website.dokuMerchantPublicKey;
      (website as any).isDokuSnapTokenUrlConfigured = !!website.dokuSnapTokenUrl;
      (website as any).isDokuSharedKeyConfigured = !!website.dokuSharedKey;
      
      // Explicitly clear keys so they never travel to the client
      website.xenditEncryptedSecret = null
      website.xenditEncryptedSecretIv = null
      website.xenditEncryptedWebhookToken = null
      website.xenditEncryptedWebhookTokenIv = null
      website.midtransEncryptedServerKey = null
      website.midtransEncryptedServerKeyIv = null
      website.dokuClientId = null
      website.dokuMerchantPublicKey = null
      website.dokuSnapTokenUrl = null
      website.dokuSharedKey = null
    }

    return { success: true, website }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Save Website Config
export async function saveAdminWebsiteConfig(tenantId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'website', 'write')

    const website = await prisma.$transaction(async (tx) => {
      const w = await tx.tenantWebsite.upsert({
        where: { tenantId },
        create: {
          tenantId,
          siteTitle: data.siteTitle,
          themeConfig: data.themeConfig,
          globalSeoMetadata: data.globalSeoMetadata,
          isActive: data.isActive
        },
        update: {
          siteTitle: data.siteTitle,
          themeConfig: data.themeConfig,
          globalSeoMetadata: data.globalSeoMetadata,
          isActive: data.isActive
        }
      })
      
      await tx.tenantConfigSnapshot.create({
        data: {
          tenantId,
          configType: 'website_theme',
          snapshot: data,
          actorId: user.id
        }
      })
      
      return w
    })
    
    revalidatePath('/admin/settings')
    revalidatePath('/site')
    return { success: true, website }
  } catch (error: any) {
    console.error("saveAdminWebsiteConfig error:", error);
    return { success: false, error: error.message }
  }
}

export async function getWebsiteConfigSnapshots(tenantId: string, configType?: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'settings', 'read')
    
    const snapshots = await prisma.tenantConfigSnapshot.findMany({
      where: { 
        tenantId,
        configType: configType || undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return { success: true, snapshots }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreWebsiteConfigSnapshot(tenantId: string, snapshotId: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'website', 'write')
    
    const snapshot = await prisma.tenantConfigSnapshot.findUnique({
      where: { id: snapshotId }
    })
    
    if (!snapshot || snapshot.tenantId !== tenantId) throw new Error('Snapshot not found')
    
    const data = snapshot.snapshot as any

    if (snapshot.configType === 'website_theme') {
      const currentWebsite = await prisma.tenantWebsite.findUnique({
        where: { tenantId }
      })
      const currentTheme = (currentWebsite?.themeConfig as any) || {}
      const safeThemeConfig = {
        ...data.themeConfig,
        whatsappPaNumber: currentTheme.whatsappPaNumber,
        whatsappPhoneId: currentTheme.whatsappPhoneId,
        whatsappToken: currentTheme.whatsappToken,
        whatsappTemplate: currentTheme.whatsappTemplate
      }

      await prisma.tenantWebsite.update({
        where: { tenantId },
        data: {
          siteTitle: data.siteTitle,
          themeConfig: safeThemeConfig,
          globalSeoMetadata: data.globalSeoMetadata,
          isActive: data.isActive
        }
      })
    } else if (snapshot.configType === 'ai') {
      await prisma.tenantAiConfiguration.upsert({
        where: { tenantId },
        create: {
          tenantId,
          providerKey: data.providerKey,
          encryptedApiSecret: data.encryptedApiSecret,
          selectedModelName: data.selectedModelName
        },
        update: {
          providerKey: data.providerKey,
          encryptedApiSecret: data.encryptedApiSecret,
          selectedModelName: data.selectedModelName
        }
      })
    } else if (snapshot.configType === 'payments') {
      await prisma.tenantWebsite.update({
        where: { tenantId },
        data: {
          xenditEnabled: data.xenditEnabled,
          xenditEncryptedSecret: data.xenditEncryptedSecret,
          xenditEncryptedWebhookToken: data.xenditEncryptedWebhookToken,
          midtransEnabled: data.midtransEnabled,
          midtransEncryptedServerKey: data.midtransEncryptedServerKey,
          dokuEnabled: data.dokuEnabled,
          dokuEnvironment: data.dokuEnvironment,
          dokuClientId: data.dokuClientId,
          dokuMerchantPublicKey: data.dokuMerchantPublicKey,
          dokuSnapTokenUrl: data.dokuSnapTokenUrl,
          dokuSharedKey: data.dokuSharedKey,
          dokuPreferredChannel: data.dokuPreferredChannel
        }
      })
    }
    
    revalidatePath('/admin/settings')
    revalidatePath('/site')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveTenantLogo(tenantId: string, logoUrl: string) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'settings', 'write')
    await prisma.systemTenant.update({
      where: { id: tenantId },
      data: { logoUrl }
    })
    revalidatePath('/admin/settings')
    revalidatePath('/site')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveAiConfig(tenantId: string, data: { providerKey: string, apiSecret?: string, selectedModelName: string }) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'settings', 'write')
    
    if (!data.providerKey || data.providerKey.trim() === '') {
      throw new Error('Provider Key is required')
    }
    if (!data.selectedModelName || data.selectedModelName.trim() === '') {
      throw new Error('Selected Model Name is required')
    }

    const encryptedSecret = data.apiSecret && !data.apiSecret.includes('•') ? encrypt(data.apiSecret) : undefined
    const updateData: any = {
      providerKey: data.providerKey,
      selectedModelName: data.selectedModelName
    }
    if (encryptedSecret) {
      updateData.encryptedApiSecret = encryptedSecret
    }

    const config = await prisma.tenantAiConfiguration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        providerKey: data.providerKey,
        encryptedApiSecret: encryptedSecret,
        selectedModelName: data.selectedModelName
      },
      update: updateData
    })

    await prisma.tenantConfigSnapshot.create({
      data: {
        tenantId,
        configType: 'ai',
        snapshot: config as any,
        actorId: user.id
      }
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function savePaymentConfig(tenantId: string, data: { 
  xenditEnabled: boolean, 
  xenditSecret: string, 
  xenditWebhookToken: string, 
  midtransEnabled: boolean, 
  midtransServerKey: string,
  dokuEnabled?: boolean,
  dokuEnvironment?: string,
  dokuClientId?: string,
  dokuMerchantPublicKey?: string,
  dokuSnapTokenUrl?: string,
  dokuSharedKey?: string,
  dokuPreferredChannel?: string
}) {
  try {
    const user = await getAuthenticatedUser()
    await requirePermission(user.id, tenantId, 'settings', 'write')
    
    // Validations
    if (data.dokuEnabled) {
      if (!data.dokuClientId || data.dokuClientId.trim() === '' ||
          !data.dokuMerchantPublicKey || data.dokuMerchantPublicKey.trim() === '' ||
          !data.dokuSnapTokenUrl || data.dokuSnapTokenUrl.trim() === '' ||
          !data.dokuSharedKey || data.dokuSharedKey.trim() === '') {
        throw new Error('All DOKU key fields are required when DOKU is enabled');
      }
      
      if (data.dokuEnvironment === 'production') {
        const checkClientId = data.dokuClientId.includes('•') ? '' : data.dokuClientId;
        if (checkClientId && checkClientId.startsWith('MCH-0001-')) {
          throw new Error('DOKU Client ID must not start with sandbox prefix (MCH-0001-) in Production environment');
        }
      }
    }

    const updateData: any = {
      xenditEnabled: data.xenditEnabled,
      midtransEnabled: data.midtransEnabled,
      dokuEnabled: data.dokuEnabled || false,
      dokuEnvironment: data.dokuEnvironment || 'sandbox',
      dokuPreferredChannel: data.dokuPreferredChannel || 'all'
    }

    // Skip saving if input matches masked string or contains •
    if (data.xenditSecret && data.xenditSecret.trim() !== '' && !data.xenditSecret.includes('•')) {
      if (!data.xenditSecret.startsWith('xnd_') && !data.xenditSecret.startsWith('sk_')) {
        throw new Error('Invalid Xendit secret format. Must start with xnd_ or sk_')
      }
      updateData.xenditEncryptedSecret = encrypt(data.xenditSecret)
      updateData.xenditEncryptedSecretIv = ''
    }

    if (data.xenditWebhookToken && data.xenditWebhookToken.trim() !== '' && !data.xenditWebhookToken.includes('•')) {
      updateData.xenditEncryptedWebhookToken = encrypt(data.xenditWebhookToken)
      updateData.xenditEncryptedWebhookTokenIv = ''
    }

    if (data.midtransServerKey && data.midtransServerKey.trim() !== '' && !data.midtransServerKey.includes('•')) {
      if (!data.midtransServerKey.startsWith('Mid-server-') && !data.midtransServerKey.startsWith('SB-Mid-server-')) {
        throw new Error('Invalid Midtrans server key format. Must start with Mid-server- or SB-Mid-server-')
      }
      updateData.midtransEncryptedServerKey = encrypt(data.midtransServerKey)
      updateData.midtransEncryptedServerKeyIv = ''
    }

    // DOKU fields encryption
    if (data.dokuClientId && data.dokuClientId.trim() !== '' && !data.dokuClientId.includes('•')) {
      updateData.dokuClientId = encrypt(data.dokuClientId)
    }
    if (data.dokuMerchantPublicKey && data.dokuMerchantPublicKey.trim() !== '' && !data.dokuMerchantPublicKey.includes('•')) {
      updateData.dokuMerchantPublicKey = encrypt(data.dokuMerchantPublicKey)
    }
    if (data.dokuSnapTokenUrl && data.dokuSnapTokenUrl.trim() !== '' && !data.dokuSnapTokenUrl.includes('•')) {
      updateData.dokuSnapTokenUrl = encrypt(data.dokuSnapTokenUrl)
    }
    if (data.dokuSharedKey && data.dokuSharedKey.trim() !== '' && !data.dokuSharedKey.includes('•')) {
      updateData.dokuSharedKey = encrypt(data.dokuSharedKey)
    }

    const website = await prisma.tenantWebsite.update({
      where: { tenantId },
      data: updateData
    })

    await prisma.tenantConfigSnapshot.create({
      data: {
        tenantId,
        configType: 'payments',
        snapshot: {
          xenditEnabled: website.xenditEnabled,
          xenditEncryptedSecret: website.xenditEncryptedSecret,
          xenditEncryptedWebhookToken: website.xenditEncryptedWebhookToken,
          midtransEnabled: website.midtransEnabled,
          midtransEncryptedServerKey: website.midtransEncryptedServerKey,
          dokuEnabled: website.dokuEnabled,
          dokuEnvironment: website.dokuEnvironment,
          dokuClientId: website.dokuClientId,
          dokuMerchantPublicKey: website.dokuMerchantPublicKey,
          dokuSnapTokenUrl: website.dokuSnapTokenUrl,
          dokuSharedKey: website.dokuSharedKey,
          dokuPreferredChannel: website.dokuPreferredChannel
        } as any,
        actorId: user.id
      }
    })
    
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    console.error("savePaymentConfig error:", error);
    return { success: false, error: error.message }
  }
}
