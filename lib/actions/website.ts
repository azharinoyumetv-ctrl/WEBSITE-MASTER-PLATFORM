'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { encrypt } from '@/lib/crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'



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

    if (!page || !page.isPublished || page.isDeleted) {
      return { success: false, error: 'Page not found' }
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
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')
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
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')
    
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

// Admin: Get Website Config
export async function getAdminWebsiteConfig(tenantId: string) {
  try {
    const website = await prisma.tenantWebsite.findUnique({
      where: { tenantId }
    })
    
    if (website) {
      // Don't leak the actual encrypted keys to the client, but return a placeholder if they exist
      if (website.xenditEncryptedSecret) (website as any).xenditSecretPlaceholder = 'sk_live_****'
      if (website.xenditEncryptedWebhookToken) (website as any).xenditWebhookPlaceholder = 'xtok_****'
      if (website.midtransEncryptedServerKey) (website as any).midtransServerKeyPlaceholder = 'Mid-server-****'
      
      // We explicitly clear these so they don't get sent to the client
      website.xenditEncryptedSecret = null
      website.xenditEncryptedSecretIv = null
      website.xenditEncryptedWebhookToken = null
      website.xenditEncryptedWebhookTokenIv = null
      website.midtransEncryptedServerKey = null
      website.midtransEncryptedServerKeyIv = null
    }

    return { success: true, website }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Save Website Config
export async function saveAdminWebsiteConfig(tenantId: string, data: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')
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
          actorId: (session.user as any).id
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

export async function getWebsiteConfigSnapshots(tenantId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'settings', 'read')
    
    const snapshots = await prisma.tenantConfigSnapshot.findMany({
      where: { tenantId, configType: 'website_theme' },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    return { success: true, snapshots }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function restoreWebsiteConfigSnapshot(tenantId: string, snapshotId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')
    
    const snapshot = await prisma.tenantConfigSnapshot.findUnique({
      where: { id: snapshotId }
    })
    
    if (!snapshot || snapshot.tenantId !== tenantId) throw new Error('Snapshot not found')
    
    const data = snapshot.snapshot as any
    const website = await prisma.tenantWebsite.update({
      where: { tenantId },
      data: {
        siteTitle: data.siteTitle,
        themeConfig: data.themeConfig,
        globalSeoMetadata: data.globalSeoMetadata,
        isActive: data.isActive
      }
    })
    
    revalidatePath('/admin/settings')
    revalidatePath('/site')
    return { success: true, website }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveTenantLogo(tenantId: string, logoUrl: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'settings', 'write')
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
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'settings', 'write')
    const encryptedSecret = data.apiSecret ? encrypt(data.apiSecret) : undefined
    const updateData: any = {
      providerKey: data.providerKey,
      selectedModelName: data.selectedModelName
    }
    if (encryptedSecret) {
      updateData.encryptedApiSecret = encryptedSecret
    }

    await prisma.tenantAiConfiguration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        providerKey: data.providerKey,
        encryptedApiSecret: encryptedSecret,
        selectedModelName: data.selectedModelName
      },
      update: updateData
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
  midtransServerKey: string 
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) throw new Error('Unauthorized')
    await requirePermission((session.user as any).id, tenantId, 'settings', 'write')
    const updateData: any = {
      xenditEnabled: data.xenditEnabled,
      midtransEnabled: data.midtransEnabled
    }

    if (data.xenditSecret && data.xenditSecret !== 'sk_live_****') {
      if (!data.xenditSecret.startsWith('xnd_') && !data.xenditSecret.startsWith('sk_')) {
        throw new Error('Invalid Xendit secret format. Must start with xnd_ or sk_')
      }
      const encryptedStr = encrypt(data.xenditSecret)
      const [iv, ciphertext] = encryptedStr.split(':')
      updateData.xenditEncryptedSecret = ciphertext
      updateData.xenditEncryptedSecretIv = iv
    }

    if (data.xenditWebhookToken && data.xenditWebhookToken !== 'xtok_****') {
      const encryptedStr = encrypt(data.xenditWebhookToken)
      const [iv, ciphertext] = encryptedStr.split(':')
      updateData.xenditEncryptedWebhookToken = ciphertext
      updateData.xenditEncryptedWebhookTokenIv = iv
    }

    if (data.midtransServerKey && data.midtransServerKey !== 'Mid-server-****') {
      if (!data.midtransServerKey.startsWith('Mid-server-') && !data.midtransServerKey.startsWith('SB-Mid-server-')) {
        throw new Error('Invalid Midtrans server key format. Must start with Mid-server- or SB-Mid-server-')
      }
      const encryptedStr = encrypt(data.midtransServerKey)
      const [iv, ciphertext] = encryptedStr.split(':')
      updateData.midtransEncryptedServerKey = ciphertext
      updateData.midtransEncryptedServerKeyIv = iv
    }

    await prisma.tenantWebsite.update({
      where: { tenantId },
      data: updateData
    })
    
    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    console.error("savePaymentConfig error:", error);
    return { success: false, error: error.message }
  }
}
