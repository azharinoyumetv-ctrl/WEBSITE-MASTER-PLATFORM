'use server'

import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCatalogItems } from './catalog'
import prisma from "@/lib/prisma"



export async function getPosData(tenantId: string) {
  try {
    const terminals = await prisma.tenantPosTerminal.findMany({
      where: { tenantId }
    })

    // If no terminals, create a default one
    let activeTerminal = terminals[0]
    if (!activeTerminal) {
      activeTerminal = await prisma.tenantPosTerminal.create({
        data: {
          tenantId,
          terminalName: 'Main Register 1',
          hardwareIdentifier: 'MAIN-REG-1-' + Date.now(),
          status: 'online'
        }
      })
    }

    const activeSession = await prisma.tenantPosSession.findFirst({
      where: { tenantId, terminalId: activeTerminal.id, status: 'open' },
      orderBy: { openedAt: 'desc' }
    })

    const { items: catalogItems } = await getCatalogItems(tenantId)

    return { success: true, terminal: activeTerminal, catalogItems: catalogItems || [], activeSession }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processPosPayment(tenantId: string, terminalId: string, cart: any[], paymentMethod: string, total: number, currency: string = 'USD') {
  try {
    // Note: In real system, we'd ensure a POS session is open
    const isCash = paymentMethod === 'cash'
    const paymentStatus = isCash ? 'succeeded' : 'initiated'
    const orderStatus = isCash ? 'completed' : 'pending'

    const order = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.tenantOrder.create({
        data: {
          tenantId,
          orderStatus: orderStatus,
          totalAmount: total,
          currency: currency,
          items: {
            create: cart.map(item => ({
              tenantId,
              catalogItemId: item.id,
              quantity: item.qty,
              unitPrice: item.price
            }))
          },
          payments: {
            create: {
              tenantId,
              processorKey: `pos_${paymentMethod}`,
              amount: total,
              currency: currency,
              paymentStatus: paymentStatus
            }
          }
        }
      })

      // 2. Atomic Inventory Deduction
      // We will deduct from the primary location of the terminal if set, or just the first available balance
      const terminal = await tx.tenantPosTerminal.findUnique({ where: { id: terminalId } })
      
      for (const item of cart) {
        // Find balance
        const balanceQuery = terminal?.locationId 
          ? { tenantId, catalogItemId: item.id, locationId: terminal.locationId }
          : { tenantId, catalogItemId: item.id }

        const balance = await tx.tenantInventoryBalance.findFirst({ where: balanceQuery })

        if (balance) {
          const newQty = balance.quantityOnHand - item.qty
          let status: any = 'optimal'
          if (newQty <= 0) status = 'out_of_stock'
          else if (newQty <= balance.lowStockThreshold) status = 'low'
          
          await tx.tenantInventoryBalance.update({
            where: { id: balance.id },
            data: { 
              quantityOnHand: newQty,
              status
            }
          })
        }
      }

      return newOrder
    })

    revalidatePath('/admin/pos')
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Terminal CRUD
export async function createTerminal(tenantId: string, data: any) {
  try {
    const terminal = await prisma.tenantPosTerminal.create({
      data: { ...data, tenantId }
    })
    revalidatePath('/admin/pos')
    return { success: true, terminal }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateTerminal(tenantId: string, id: string, data: any) {
  try {
    const terminal = await prisma.tenantPosTerminal.update({
      where: { id, tenantId },
      data
    })
    revalidatePath('/admin/pos')
    return { success: true, terminal }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTerminal(tenantId: string, id: string) {
  try {
    await prisma.tenantPosTerminal.delete({
      where: { id, tenantId }
    })
    revalidatePath('/admin/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Session CRUD
export async function openSession(tenantId: string, terminalId: string, openedBy: string, openingBalance: number) {
  try {
    const session = await prisma.tenantPosSession.create({
      data: { tenantId, terminalId, openedBy, openingBalance, status: 'open' }
    })
    revalidatePath('/admin/pos')
    return { success: true, session }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function closeSession(tenantId: string, sessionId: string, closedBy: string, closingBalance: number) {
  try {
    const session = await prisma.tenantPosSession.update({
      where: { id: sessionId, tenantId },
      data: { closedBy, closingBalance, status: 'reconciled', closedAt: new Date() }
    })
    revalidatePath('/admin/pos')
    return { success: true, session }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function generateReceipt(tenantId: string, orderId: string) {
  try {
    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId, tenantId },
      include: { items: { include: { catalogItem: true } } }
    })
    if (!order) return { success: false, error: 'Order not found' }
    
    const receiptHtml = `
      <div style="font-family: monospace; padding: 20px; max-width: 300px; margin: auto; background: white; color: black;">
        <h2 style="text-align: center;">Store Receipt</h2>
        <p style="text-align: center; border-bottom: 1px dashed black; padding-bottom: 10px;">Order: ${order.id.slice(0,8).toUpperCase()}<br/>Date: ${order.createdAt.toLocaleString()}</p>
        <div style="margin: 10px 0;">
          ${order.items.map(i => `
            <div style="display: flex; justify-content: space-between;">
              <span>${i.quantity}x ${i.catalogItem?.title?.slice(0, 15) || 'Item'}</span>
              <span>$${(Number(i.unitPrice) * i.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <p style="text-align: right; border-top: 1px dashed black; padding-top: 10px;"><b>Total: $${Number(order.totalAmount).toFixed(2)}</b></p>
        <p style="text-align: center; margin-top: 20px;">Thank you for your purchase!</p>
      </div>
    `
    return { success: true, receiptHtml }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
