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
