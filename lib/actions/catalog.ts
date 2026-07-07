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
