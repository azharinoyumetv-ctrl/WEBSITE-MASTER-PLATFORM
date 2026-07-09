'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'

export async function getInventory(tenantId: string) {
  try {
    const locations = await prisma.tenantInventoryLocation.findMany({
      where: { tenantId }
    })

    const balances = await prisma.tenantInventoryBalance.findMany({
      where: { tenantId },
      include: { catalogItem: true, location: true }
    })

    return { success: true, locations, balances }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function adjustInventory(tenantId: string, balanceId: string, quantityAdjustment: number) {
  try {
    const balance = await prisma.tenantInventoryBalance.findUnique({
      where: { id: balanceId, tenantId }
    })

    if (!balance) return { success: false, error: 'Balance not found' }

    const newQty = Math.max(0, balance.quantityOnHand + quantityAdjustment)
    const newStatus = newQty <= 0 ? 'critical' : (newQty <= balance.lowStockThreshold ? 'low' : 'optimal')

    const updated = await prisma.tenantInventoryBalance.update({
      where: { id: balanceId },
      data: {
        quantityOnHand: newQty
      }
    })

    revalidatePath('/admin/inventory')
    return { success: true, balance: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function transferStock(tenantId: string, sourceLocationId: string, targetLocationId: string, catalogItemId: string, quantity: number) {
  try {
    if (quantity <= 0) return { success: false, error: 'Quantity must be greater than zero' }
    if (sourceLocationId === targetLocationId) return { success: false, error: 'Source and target locations must be different' }

    return await prisma.$transaction(async (tx) => {
      // Check source balance
      const sourceBalance = await tx.tenantInventoryBalance.findUnique({
        where: { locationId_catalogItemId: { locationId: sourceLocationId, catalogItemId } }
      })

      if (!sourceBalance || sourceBalance.tenantId !== tenantId) {
        throw new Error('Source balance not found')
      }

      if (sourceBalance.quantityOnHand < quantity) {
        throw new Error('Insufficient stock at source location')
      }

      // Deduct from source
      await tx.tenantInventoryBalance.update({
        where: { id: sourceBalance.id },
        data: { quantityOnHand: sourceBalance.quantityOnHand - quantity }
      })

      // Add to target
      let targetBalance = await tx.tenantInventoryBalance.findUnique({
        where: { locationId_catalogItemId: { locationId: targetLocationId, catalogItemId } }
      })

      if (targetBalance) {
        if (targetBalance.tenantId !== tenantId) throw new Error('Target balance tenant mismatch')
        await tx.tenantInventoryBalance.update({
          where: { id: targetBalance.id },
          data: { quantityOnHand: targetBalance.quantityOnHand + quantity }
        })
      } else {
        await tx.tenantInventoryBalance.create({
          data: {
            tenantId,
            locationId: targetLocationId,
            catalogItemId,
            quantityOnHand: quantity
          }
        })
      }

      return { success: true }
    })
  } catch (error: any) {
    return { success: false, error: error.message }
  } finally {
    revalidatePath('/admin/inventory')
  }
}
