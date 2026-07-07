'use server'

import { PrismaClient, OrderStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'



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

export async function updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus) {
  try {
    const order = await prisma.tenantOrder.update({
      where: { id: orderId, tenantId },
      data: { orderStatus: status }
    })
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
