'use server'

import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getCatalogItems } from './catalog'



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

    const { items: catalogItems } = await getCatalogItems(tenantId)

    return { success: true, terminal: activeTerminal, catalogItems: catalogItems || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function processPosPayment(tenantId: string, terminalId: string, cart: any[], paymentMethod: string, total: number) {
  try {
    // Note: In real system, we'd ensure a POS session is open
    // Create an order
    const order = await prisma.tenantOrder.create({
      data: {
        tenantId,
        orderStatus: 'completed',
        totalAmount: total,
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
            paymentStatus: 'succeeded'
          }
        }
      }
    })

    revalidatePath('/admin/pos')
    revalidatePath('/admin/ecommerce')
    return { success: true, order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
