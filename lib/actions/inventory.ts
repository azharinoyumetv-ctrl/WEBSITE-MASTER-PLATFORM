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

    const catalogItems = await prisma.tenantCatalogItem.findMany({
      where: { tenantId }
    })

    return { success: true, locations, balances, catalogItems }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ------------------------------------------------------------------
// LOCATIONS CRUD
// ------------------------------------------------------------------

export async function createLocation(tenantId: string, locationName: string, locationType: string = 'warehouse') {
  try {
    const loc = await prisma.tenantInventoryLocation.create({
      data: { tenantId, locationName, locationType }
    })
    revalidatePath('/admin/inventory')
    return { success: true, location: loc }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateLocation(tenantId: string, locationId: string, data: { locationName?: string, locationType?: string, isActive?: boolean }) {
  try {
    const loc = await prisma.tenantInventoryLocation.update({
      where: { id: locationId, tenantId },
      data
    })
    revalidatePath('/admin/inventory')
    return { success: true, location: loc }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteLocation(tenantId: string, locationId: string) {
  try {
    await prisma.tenantInventoryLocation.deleteMany({
      where: { id: locationId, tenantId }
    })
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ------------------------------------------------------------------
// BALANCES CRUD
// ------------------------------------------------------------------

function computeStatus(qty: number, threshold: number): string {
  if (qty <= 0) return 'critical'
  if (qty <= threshold) return 'low'
  return 'optimal'
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
        quantityOnHand: newQty,
        status: newStatus
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
        data: { 
          quantityOnHand: sourceBalance.quantityOnHand - quantity,
          status: computeStatus(sourceBalance.quantityOnHand - quantity, sourceBalance.lowStockThreshold)
        }
      })

      // Add to target
      let targetBalance = await tx.tenantInventoryBalance.findUnique({
        where: { locationId_catalogItemId: { locationId: targetLocationId, catalogItemId } }
      })

      if (targetBalance) {
        if (targetBalance.tenantId !== tenantId) throw new Error('Target balance tenant mismatch')
        await tx.tenantInventoryBalance.update({
          where: { id: targetBalance.id },
          data: { 
            quantityOnHand: targetBalance.quantityOnHand + quantity,
            status: computeStatus(targetBalance.quantityOnHand + quantity, targetBalance.lowStockThreshold)
          }
        })
      } else {
        await tx.tenantInventoryBalance.create({
          data: {
            tenantId,
            locationId: targetLocationId,
            catalogItemId,
            quantityOnHand: quantity,
            lowStockThreshold: sourceBalance.lowStockThreshold,
            status: computeStatus(quantity, sourceBalance.lowStockThreshold)
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

export async function addInventoryBalance(tenantId: string, locationId: string, catalogItemId: string, quantity: number, lowStockThreshold: number = 5) {
  try {
    const existing = await prisma.tenantInventoryBalance.findUnique({
      where: { locationId_catalogItemId: { locationId, catalogItemId } }
    })

    if (existing) {
      return { success: false, error: 'Inventory balance already exists for this item at this location. Use Edit instead.' }
    }

    const created = await prisma.tenantInventoryBalance.create({
      data: {
        tenantId,
        locationId,
        catalogItemId,
        quantityOnHand: quantity,
        lowStockThreshold,
        status: computeStatus(quantity, lowStockThreshold)
      },
      include: { catalogItem: true, location: true }
    })

    revalidatePath('/admin/inventory')
    return { success: true, balance: created }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateInventoryBalance(tenantId: string, balanceId: string, data: { quantityOnHand?: number, lowStockThreshold?: number, quantityReserved?: number }) {
  try {
    const balance = await prisma.tenantInventoryBalance.findUnique({
      where: { id: balanceId, tenantId }
    })

    if (!balance) return { success: false, error: 'Balance not found' }

    const qty = data.quantityOnHand ?? balance.quantityOnHand
    const threshold = data.lowStockThreshold ?? balance.lowStockThreshold
    const status = computeStatus(qty, threshold)

    const updated = await prisma.tenantInventoryBalance.update({
      where: { id: balanceId },
      data: { ...data, status },
      include: { catalogItem: true, location: true }
    })

    revalidatePath('/admin/inventory')
    return { success: true, balance: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteInventoryBalance(tenantId: string, balanceId: string) {
  try {
    await prisma.tenantInventoryBalance.deleteMany({
      where: { id: balanceId, tenantId }
    })
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
