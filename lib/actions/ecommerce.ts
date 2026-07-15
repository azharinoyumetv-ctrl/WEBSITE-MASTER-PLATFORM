'use server'

import { PrismaClient, OrderStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from "@/lib/prisma"
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getOrders(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'orders', 'read')

    const orders = await prisma.tenantOrder.findMany({
      where: { tenantId },
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

export async function updateOrderStatus(tenantId: string, orderId: string, status: OrderStatus, receiptUrl?: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'orders', 'write')

    const currentOrder = await prisma.tenantOrder.findUnique({
      where: { id: orderId, tenantId }
    })
    if (!currentOrder) throw new Error("Order not found")

    const currentStatus = currentOrder.orderStatus
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['pending_requirements', 'quoted', 'awaiting_payment', 'paid', 'cancelled'],
      pending_requirements: ['quoted', 'awaiting_payment', 'cancelled'],
      quoted: ['awaiting_payment', 'paid', 'cancelled'],
      awaiting_payment: ['paid', 'cancelled'],
      paid: ['pending_fulfillment', 'processing', 'cancelled'],
      pending_fulfillment: ['processing', 'shipped', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    }

    if (currentStatus !== status) {
      const allowed = validTransitions[currentStatus] || []
      if (!allowed.includes(status)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${status}`)
      }
    }

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

export async function bulkUpdateOrderStatus(tenantId: string, orderIds: string[], status: OrderStatus) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'orders', 'write')

    const orders = await prisma.tenantOrder.findMany({
      where: { id: { in: orderIds }, tenantId }
    })

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['pending_requirements', 'quoted', 'awaiting_payment', 'paid', 'cancelled'],
      pending_requirements: ['quoted', 'awaiting_payment', 'cancelled'],
      quoted: ['awaiting_payment', 'paid', 'cancelled'],
      awaiting_payment: ['paid', 'cancelled'],
      paid: ['pending_fulfillment', 'processing', 'cancelled'],
      pending_fulfillment: ['processing', 'shipped', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    }

    for (const order of orders) {
      if (order.orderStatus !== status) {
        const allowed = validTransitions[order.orderStatus] || []
        if (!allowed.includes(status)) {
          throw new Error(`Invalid status transition for order ${order.id} from ${order.orderStatus} to ${status}`)
        }
      }
    }

    await prisma.tenantOrder.updateMany({
      where: { id: { in: orderIds }, tenantId },
      data: { orderStatus: status }
    })
    revalidatePath('/admin/ecommerce')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cancelOrder(tenantId: string, orderId: string, reason?: string) {
  try {
    const user = await getAuthenticatedUser().catch(() => null)
    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId, tenantId }
    })
    if (!order) throw new Error("Order not found")

    let hasAccess = false
    if (user) {
      if (user.tenantId === tenantId) {
        try {
          await requirePermission(user.id, tenantId, 'orders', 'write')
          hasAccess = true
        } catch {
          if (order.userId === user.id) hasAccess = true
        }
      }
    } else {
      if (order.orderStatus === 'pending') hasAccess = true
    }

    if (!hasAccess) throw new Error("Unauthorized order access")

    const updated = await prisma.tenantOrder.update({
      where: { id: orderId, tenantId },
      data: { 
        orderStatus: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : undefined
      }
    })
    revalidatePath('/admin/ecommerce')
    return { success: true, order: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createOrder(
  tenantId: string,
  data: {
    email: string
    name: string
    phone: string
    companyName?: string
    notes?: string
    items: { id: string, quantity: number }[]
  }
) {
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
        // Repurpose shippingAddress JSON as service-order contact details
        shippingAddress: {
          name: data.name,
          phone: data.phone,
          companyName: data.companyName || '',
        },
        notes: data.notes || null,
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

/**
 * Advance a project-setup order through its lifecycle and optionally
 * append a fulfillment note (timestamped) to the order notes JSON array.
 */
export async function advanceProjectOrderStatus(
  tenantId: string,
  orderId: string,
  newStatus: OrderStatus,
  fulfillmentNote?: string
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'orders', 'write')

    const current = await prisma.tenantOrder.findUnique({
      where: { id: orderId, tenantId }
    })
    if (!current) throw new Error('Order not found')

    // Build updated notes: parse existing JSON array or start fresh
    let notesArray: Array<{ ts: string; status: string; note: string }> = []
    try {
      if (current.notes) {
        const parsed = JSON.parse(current.notes)
        if (Array.isArray(parsed)) notesArray = parsed
      }
    } catch {
      // Legacy plain-text note — wrap it
      if (current.notes) {
        notesArray = [{ ts: new Date().toISOString(), status: current.orderStatus, note: current.notes }]
      }
    }

    if (fulfillmentNote?.trim()) {
      notesArray.push({
        ts: new Date().toISOString(),
        status: newStatus,
        note: fulfillmentNote.trim(),
      })
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['pending_requirements', 'paid', 'cancelled'],
      pending_requirements: ['quoted', 'cancelled'],
      quoted: ['awaiting_payment', 'cancelled'],
      awaiting_payment: ['pending_fulfillment', 'paid', 'cancelled'],
      paid: ['pending_fulfillment', 'processing', 'cancelled'],
      pending_fulfillment: ['processing', 'shipped', 'completed', 'cancelled'],
      processing: ['shipped', 'completed', 'cancelled'],
      shipped: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    const allowed = validTransitions[current.orderStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid transition from ${current.orderStatus} to ${newStatus}`)
    }

    const updated = await prisma.tenantOrder.update({
      where: { id: orderId, tenantId },
      data: {
        orderStatus: newStatus,
        notes: JSON.stringify(notesArray),
      },
    })

    revalidatePath('/admin/ecommerce')
    return { success: true, order: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
