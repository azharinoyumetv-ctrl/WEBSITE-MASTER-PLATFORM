'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

// Categories
export async function getCategories(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'read')

    const categories = await prisma.tenantCategory.findMany({
      where: { tenantId },
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { sortOrder: 'asc' }
    })
    return { success: true, categories }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createCategory(tenantId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    const category = await prisma.tenantCategory.create({
      data: {
        tenantId,
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder || 0
      }
    })
    revalidatePath('/admin/catalog')
    return { success: true, category }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCategory(tenantId: string, categoryId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    const category = await prisma.tenantCategory.update({
      where: { id: categoryId, tenantId },
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder
      }
    })
    revalidatePath('/admin/catalog')
    return { success: true, category }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    await prisma.tenantCategory.deleteMany({
      where: { id: categoryId, tenantId }
    })
    revalidatePath('/admin/catalog')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Catalog Items
export async function getCatalogItems(tenantId: string) {
  try {
    const items = await prisma.tenantCatalogItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { category: true, variants: true, media: true }
    })
    return { success: true, items }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createCatalogItem(tenantId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    const item = await prisma.tenantCatalogItem.create({
      data: {
        tenantId,
        title: data.title,
        sku: data.sku,
        basePrice: data.basePrice,
        categoryId: data.categoryId || null,
        description: data.description,
        isVisible: data.isVisible ?? true,
        customAttributes: data.customAttributes || {},
        imageUrls: data.imageUrls || [],
        variants: data.variants ? {
          create: data.variants.map((v: any) => ({
            tenantId,
            name: v.name,
            sku: v.sku || null,
            priceOffset: v.priceOffset || 0,
            quantity: v.quantity || 0
          }))
        } : undefined,
        media: data.media ? {
          create: data.media.map((m: any) => ({
            tenantId,
            url: m.url,
            fileType: m.fileType || 'image/jpeg',
            fileSize: m.fileSize || 0
          }))
        } : undefined
      },
      include: { category: true, variants: true, media: true }
    })
    revalidatePath('/admin/catalog')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCatalogItem(tenantId: string, itemId: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    const item = await prisma.$transaction(async (tx) => {
      if (data.variants) {
        await tx.tenantCatalogItemVariant.deleteMany({
          where: { catalogItemId: itemId, tenantId }
        })
      }
      if (data.media) {
        await tx.tenantCatalogItemMedia.deleteMany({
          where: { catalogItemId: itemId, tenantId }
        })
      }

      return await tx.tenantCatalogItem.update({
        where: { id: itemId, tenantId },
        data: {
          title: data.title,
          sku: data.sku,
          basePrice: data.basePrice,
          categoryId: data.categoryId || null,
          description: data.description,
          isVisible: data.isVisible,
          customAttributes: data.customAttributes,
          imageUrls: data.imageUrls,
          variants: data.variants ? {
            create: data.variants.map((v: any) => ({
              tenantId,
              name: v.name,
              sku: v.sku || null,
              priceOffset: v.priceOffset || 0,
              quantity: v.quantity || 0
            }))
          } : undefined,
          media: data.media ? {
            create: data.media.map((m: any) => ({
              tenantId,
              url: m.url,
              fileType: m.fileType || 'image/jpeg',
              fileSize: m.fileSize || 0
            }))
          } : undefined
        },
        include: { category: true, variants: true, media: true }
      })
    })

    revalidatePath('/admin/catalog')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCatalogItem(tenantId: string, itemId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    // Delete related inventory balances first
    await prisma.tenantInventoryBalance.deleteMany({
      where: { catalogItemId: itemId, tenantId }
    })
    
    await prisma.tenantCatalogItem.deleteMany({
      where: { id: itemId, tenantId }
    })
    revalidatePath('/admin/catalog')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function uploadCatalogImage(tenantId: string, fileName: string, fileType: string, base64Data: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'catalog', 'write')

    const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64')
    
    const fs = require('fs')
    const path = require('path')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', tenantId)
    fs.mkdirSync(uploadDir, { recursive: true })
    
    const cleanName = path.basename(fileName).replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = path.join(uploadDir, cleanName)
    fs.writeFileSync(storagePath, buffer)
    
    const publicUrl = `/uploads/${tenantId}/${cleanName}`
    
    const fileRecord = await prisma.tenantStorageRegistry.create({
      data: {
        tenantId,
        uploadedBy: user.id,
        fileName: cleanName,
        mimeType: fileType,
        fileSizeBytes: buffer.length,
        storageBucketPath: storagePath,
        publicUrl
      }
    })
    
    return { success: true, publicUrl, fileId: fileRecord.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
