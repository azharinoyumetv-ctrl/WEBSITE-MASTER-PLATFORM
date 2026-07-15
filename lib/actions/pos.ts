'use server'

import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCatalogItems } from './catalog'
import prisma from "@/lib/prisma"
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getPosData(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

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

export async function processPosPayment(tenantId: string, terminalId: string, cart: any[], paymentMethod: string, total: number, currency: string = 'IDR') {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

    // Verify active session (shift) is open
    const activeSession = await prisma.tenantPosSession.findFirst({
      where: { tenantId, terminalId, status: 'open' }
    })
    if (!activeSession) {
      throw new Error("No active open shift found for this terminal. Please open a shift first.")
    }

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
          userId: user.id,
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

      // 2. Atomic Inventory Deduction from terminal location
      const terminal = await tx.tenantPosTerminal.findUnique({ where: { id: terminalId } })
      
      for (const item of cart) {
        // Enforce location scope
        const balanceQuery = terminal?.locationId 
          ? { tenantId, catalogItemId: item.id, locationId: terminal.locationId }
          : { tenantId, catalogItemId: item.id }

        const balance = await tx.tenantInventoryBalance.findFirst({ where: balanceQuery })

        if (balance) {
          const newQty = Math.max(0, balance.quantityOnHand - item.qty)
          let status = 'optimal'
          if (newQty <= 0) status = 'critical'
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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

    const events = await prisma.tenantPosCashDrawerEvent.findMany({
      where: { tenantId, sessionId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, events }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getEndOfDayReport(tenantId: string, sessionId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId, tenantId },
      include: { items: { include: { catalogItem: true } } }
    })
    if (!order) return { success: false, error: 'Order not found' }
    
    const tax = Number(order.totalAmount) * 0.1
    const subtotal = Number(order.totalAmount) - tax
    
    const format = (amt: number) => {
      if (order.currency === 'EUR') return `€${amt.toFixed(2)}`
      if (order.currency === 'GBP') return `£${amt.toFixed(2)}`
      if (order.currency === 'IDR') return `Rp ${amt.toLocaleString('id-ID')}`
      return `${order.currency === 'JPY' ? '¥' : '$'}${amt.toFixed(2)}`
    }

    const receiptHtml = `
      <div style="font-family: 'Courier New', monospace; padding: 24px; max-width: 350px; margin: auto; background: #fff; color: #000; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">STORE RECEIPT</h2>
          <p style="margin: 4px 0 0; font-size: 11px; color: #666;">Tenant ID: ${tenantId.slice(0, 8).toUpperCase()}</p>
        </div>
        
        <div style="font-size: 12px; border-bottom: 1px dashed #000; pb-10; margin-bottom: 12px; padding-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Order ID:</span>
            <span>#${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date:</span>
            <span>${order.createdAt.toLocaleString()}</span>
          </div>
        </div>

        <div style="font-size: 13px; margin: 12px 0;">
          ${order.items.map(i => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${i.quantity}x ${i.catalogItem?.title?.slice(0, 18) || 'Item'}</span>
              <span>${format(Number(i.unitPrice) * i.quantity)}</span>
            </div>
          `).join('')}
        </div>

        <div style="font-size: 12px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 12px; space-y-2;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>${format(subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Tax (10%):</span>
            <span>${format(tax)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 6px; padding-top: 6px; border-top: 1px solid #000;">
            <span>TOTAL:</span>
            <span>${format(Number(order.totalAmount))}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 12px;">
          <p style="margin: 0;">Thank you for your purchase!</p>
          <p style="margin: 4px 0 0;">Please retain this receipt for your records.</p>
        </div>
      </div>
    `
    return { success: true, receiptHtml }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getPublicReceiptHtml(orderId: string) {
  try {
    const order = await prisma.tenantOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { catalogItem: true } } }
    })
    if (!order) return { success: false, error: 'Order not found' }
    
    const tax = Number(order.totalAmount) * 0.1
    const subtotal = Number(order.totalAmount) - tax
    
    const format = (amt: number) => {
      if (order.currency === 'EUR') return `€${amt.toFixed(2)}`
      if (order.currency === 'GBP') return `£${amt.toFixed(2)}`
      if (order.currency === 'IDR') return `Rp ${amt.toLocaleString('id-ID')}`
      return `${order.currency === 'JPY' ? '¥' : '$'}${amt.toFixed(2)}`
    }

    const receiptHtml = `
      <div style="font-family: 'Courier New', monospace; padding: 24px; max-width: 350px; margin: auto; background: #fff; color: #000; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">STORE RECEIPT</h2>
          <p style="margin: 4px 0 0; font-size: 11px; color: #666;">Tenant ID: ${order.tenantId.slice(0, 8).toUpperCase()}</p>
        </div>
        
        <div style="font-size: 12px; border-bottom: 1px dashed #000; pb-10; margin-bottom: 12px; padding-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Order ID:</span>
            <span style="font-weight: bold;">${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date:</span>
            <span>${order.createdAt.toLocaleString()}</span>
          </div>
        </div>

        <div style="font-size: 12px; border-bottom: 1px dashed #000; margin-bottom: 12px; padding-bottom: 8px;">
          ${order.items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>${item.catalogItem?.title || 'Product'} (x${item.quantity})</span>
              <span>${format(Number(item.unitPrice) * item.quantity)}</span>
            </div>
          `).join('')}
        </div>

        <div style="font-size: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>${format(subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Tax (10%):</span>
            <span>${format(tax)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 8px; border-top: 1px dashed #000; padding-top: 8px;">
            <span>TOTAL:</span>
            <span>${format(Number(order.totalAmount))}</span>
          </div>
        </div>

        <div style="text-align: center; font-size: 11px; color: #666; margin-top: 24px; border-top: 1px dashed #000; padding-top: 12px;">
          <p style="margin: 0; font-weight: bold;">Thank you for your business!</p>
          <p style="margin: 4px 0 0;">Please retain this receipt for your records.</p>
        </div>
      </div>
    `
    return { success: true, receiptHtml }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
