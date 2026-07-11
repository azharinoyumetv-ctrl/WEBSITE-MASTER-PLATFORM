'use server'

import { PrismaClient, OrderStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from "@/lib/prisma"



export async function getOrders(tenantId: string) {
  try {
    const orders = await prisma.tenantOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { catalogItem: true }
        }
      }
    })
    
    // Map to plain objects if needed, or return raw
    return { success: true, orders }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus, receiptUrl?: string) {
  try {
    const order = await prisma.tenantOrder.update({
      where: { id: orderId, tenantId },
      data: { 
        orderStatus: status,
        ...(receiptUrl !== undefined && { receiptUrl })
      }
    })
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelOrder(tenantId: string, orderId: string, reason?: string) {
  try {
    const order = await prisma.tenantOrder.update({
      where: { id: orderId, tenantId },
      data: { 
        orderStatus: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : undefined
      }
    })
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createOrder(tenantId: string, data: { email: string, items: { id: string, quantity: number }[] }) {
  try {
    const catalogItems = await prisma.tenantCatalogItem.findMany({
      where: { id: { in: data.items.map(i => i.id) }, tenantId }
    })
    
    let totalAmount = 0
    const orderItemsData = data.items.map(i => {
      const catItem = catalogItems.find(c => c.id === i.id)
      if (!catItem) throw new Error(`Item ${i.id} not found`)
      const unitPrice = catItem.basePrice
      const total = Number(unitPrice) * i.quantity
      totalAmount += total
      return {
        tenantId,
        catalogItemId: i.id,
        quantity: i.quantity,
        unitPrice: unitPrice,
        totalPrice: total
      }
    })

    const order = await prisma.tenantOrder.create({
      data: {
        tenantId,
        guestEmail: data.email,
        totalAmount,
        orderStatus: 'pending',
        items: {
          create: orderItemsData
        }
      }
    })
    
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUserOrders(tenantId: string, email: string) {
  try {
    const orders = await prisma.tenantOrder.findMany({
      where: { tenantId, guestEmail: email },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { catalogItem: true }
        }
      }
    })
    return { success: true, orders }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
