'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'



// Categories
export async function getCategories(tenantId: string) {
  try {
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
      include: { category: true }
    })
    return { success: true, items }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createCatalogItem(tenantId: string, data: any) {
  try {
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
        imageUrls: data.imageUrls || []
      }
    })
    revalidatePath('/admin/catalog')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateCatalogItem(tenantId: string, itemId: string, data: any) {
  try {
    const item = await prisma.tenantCatalogItem.update({
      where: { id: itemId, tenantId },
      data: {
        title: data.title,
        sku: data.sku,
        basePrice: data.basePrice,
        categoryId: data.categoryId || null,
        description: data.description,
        isVisible: data.isVisible,
        customAttributes: data.customAttributes,
        imageUrls: data.imageUrls
      }
    })
    revalidatePath('/admin/catalog')
    return { success: true, item }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteCatalogItem(tenantId: string, itemId: string) {
  try {
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
