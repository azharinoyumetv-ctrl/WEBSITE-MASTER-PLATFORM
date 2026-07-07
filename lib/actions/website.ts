'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'



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

// Admin: Get Website Config
export async function getAdminWebsiteConfig(tenantId: string) {
  try {
    const website = await prisma.tenantWebsite.findUnique({
      where: { tenantId }
    })
    return { success: true, website }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Admin: Save Website Config
export async function saveAdminWebsiteConfig(tenantId: string, data: any) {
  try {
    const website = await prisma.tenantWebsite.upsert({
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
    revalidatePath('/admin/settings')
    revalidatePath('/site')
    return { success: true, website }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function saveTenantLogo(tenantId: string, logoUrl: string) {
  try {
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
