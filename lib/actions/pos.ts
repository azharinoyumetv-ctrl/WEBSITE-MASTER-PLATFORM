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

// Session & Cash Drawer CRUD
export async function openSession(tenantId: string, terminalId: string, openedBy: string, openingBalance: number) {
  try {
    const session = await prisma.tenantPosSession.create({
      data: { tenantId, terminalId, openedBy, openingBalance, status: 'open' }
    })
    
    await prisma.tenantPosCashDrawerEvent.create({
      data: {
        tenantId,
        sessionId: session.id,
        eventType: 'session_open',
        amount: openingBalance,
        performedBy: openedBy,
        notes: 'Initial float'
      }
    })
    
    revalidatePath('/admin/pos')
    return { success: true, session }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function validateSession(tenantId: string, sessionId: string) {
  const session = await prisma.tenantPosSession.findUnique({ where: { id: sessionId, tenantId } })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'open') throw new Error('Session is closed')
  return session
}

export async function openCashDrawer(tenantId: string, sessionId: string, performedBy?: string, notes?: string) {
  try {
    await validateSession(tenantId, sessionId)
    const event = await prisma.tenantPosCashDrawerEvent.create({
      data: { tenantId, sessionId, eventType: 'manual_open', performedBy, notes }
    })
    revalidatePath('/admin/pos')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function recordCashDrop(tenantId: string, sessionId: string, amount: number, notes?: string, performedBy?: string) {
  try {
    await validateSession(tenantId, sessionId)
    if (amount <= 0) throw new Error('Amount must be greater than 0')
    const event = await prisma.tenantPosCashDrawerEvent.create({
      data: { tenantId, sessionId, eventType: 'cash_drop', amount, performedBy, notes }
    })
    revalidatePath('/admin/pos')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function recordCashPayout(tenantId: string, sessionId: string, amount: number, notes?: string, performedBy?: string) {
  try {
    await validateSession(tenantId, sessionId)
    if (amount <= 0) throw new Error('Amount must be greater than 0')
    const event = await prisma.tenantPosCashDrawerEvent.create({
      data: { tenantId, sessionId, eventType: 'cash_payout', amount, performedBy, notes }
    })
    revalidatePath('/admin/pos')
    return { success: true, event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getCashDrawerEvents(tenantId: string, sessionId: string) {
  try {
    const events = await prisma.tenantPosCashDrawerEvent.findMany({
      where: { tenantId, sessionId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, events }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEndOfDayReport(tenantId: string, sessionId: string, date?: string) {
  try {
    const session = await prisma.tenantPosSession.findUnique({ where: { id: sessionId, tenantId } })
    if (!session) throw new Error('Session not found')
    
    const endBound = session.closedAt || new Date()
    
    const orders = await prisma.tenantOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: session.openedAt, lte: endBound },
      },
      include: { payments: true }
    })
    
    const events = await prisma.tenantPosCashDrawerEvent.findMany({
      where: { tenantId, sessionId }
    })
    
    let totalRevenue = 0
    let cashRevenue = 0
    let cardRevenue = 0
    
    orders.forEach(o => {
      totalRevenue += Number(o.totalAmount)
      o.payments.forEach(p => {
        if (p.processorKey === 'pos_cash') cashRevenue += Number(p.amount)
        if (p.processorKey === 'pos_card') cardRevenue += Number(p.amount)
      })
    })

    let cashDrops = 0
    let cashPayouts = 0
    let openingFloat = Number(session.openingBalance)
    
    events.forEach(e => {
      if (e.eventType === 'cash_drop') cashDrops += Number(e.amount || 0)
      if (e.eventType === 'cash_payout') cashPayouts += Number(e.amount || 0)
    })
    
    const expectedDrawer = openingFloat + cashRevenue + cashDrops - cashPayouts
    const closingBalance = session.closingBalance !== null ? Number(session.closingBalance) : null
    const variance = closingBalance !== null ? closingBalance - expectedDrawer : null

    return { 
      success: true, 
      report: { 
        totalRevenue, 
        cashRevenue, 
        cardRevenue, 
        orderCount: orders.length, 
        openingFloat, 
        cashDrops,
        cashPayouts,
        expectedDrawer,
        closingBalance,
        variance,
        events
      } 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function closeCashDrawerSession(tenantId: string, sessionId: string, closingBalance?: number, performedBy?: string, notes?: string) {
  try {
    await validateSession(tenantId, sessionId)
    
    const closedAt = new Date()
    
    await prisma.tenantPosCashDrawerEvent.create({
      data: { tenantId, sessionId, eventType: 'session_close', amount: closingBalance, performedBy, notes }
    })

    const session = await prisma.tenantPosSession.update({
      where: { id: sessionId, tenantId },
      data: { closedBy: performedBy, closingBalance, status: 'reconciled', closedAt }
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
