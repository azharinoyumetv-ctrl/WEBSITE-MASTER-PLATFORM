'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"
import { dispatchNotification } from './notifications'

export async function getInventory(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'read')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    const balance = await prisma.tenantInventoryBalance.findUnique({
      where: { id: balanceId, tenantId }
    })

    if (!balance) return { success: false, error: 'Balance not found' }

    const newQty = Math.max(0, balance.quantityOnHand + quantityAdjustment)
    const newStatus = computeStatus(newQty, balance.lowStockThreshold)

    const updated = await prisma.tenantInventoryBalance.update({
      where: { id: balanceId },
      data: {
        quantityOnHand: newQty,
        status: newStatus
      },
      include: { catalogItem: true }
    })

    if (newStatus === 'low' || newStatus === 'critical') {
      try {
        const admins = await prisma.user.findMany({
          where: {
            tenantId,
            status: 'active',
            userRoles: {
              some: {
                role: {
                  name: {
                    in: ['platform_owner', 'platform owner', 'admin'],
                    mode: 'insensitive'
                  }
                }
              }
            }
          },
          take: 3
        })
        for (const admin of admins) {
          await dispatchNotification(tenantId, admin.email, 'email', 'inventory_alert', {
            item_name: updated.catalogItem?.title || 'Inventory Item',
            qty: String(newQty),
            threshold: String(balance.lowStockThreshold),
            status: newStatus.toUpperCase()
          })
        }
      } catch (e) {
        console.error("Failed to dispatch low stock alert:", e)
      }
    }

    revalidatePath('/admin/inventory')
    return { success: true, balance: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function transferStock(tenantId: string, sourceLocationId: string, targetLocationId: string, catalogItemId: string, quantity: number) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

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

    if (status === 'low' || status === 'critical') {
      try {
        const admins = await prisma.user.findMany({
          where: {
            tenantId,
            status: 'active',
            userRoles: {
              some: {
                role: {
                  name: {
                    in: ['platform_owner', 'platform owner', 'admin'],
                    mode: 'insensitive'
                  }
                }
              }
            }
          },
          take: 3
        })
        for (const admin of admins) {
          await dispatchNotification(tenantId, admin.email, 'email', 'inventory_alert', {
            item_name: updated.catalogItem?.title || 'Inventory Item',
            qty: String(qty),
            threshold: String(threshold),
            status: status.toUpperCase()
          })
        }
      } catch (e) {
        console.error("Failed to dispatch low stock alert:", e)
      }
    }

    revalidatePath('/admin/inventory')
    return { success: true, balance: updated }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteInventoryBalance(tenantId: string, balanceId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    await prisma.tenantInventoryBalance.deleteMany({
      where: { id: balanceId, tenantId }
    })
    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function bulkAdjustInventory(
  tenantId: string,
  balanceIds: string[],
  quantityAdjustment: number,
  lowStockThreshold?: number
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    if (balanceIds.length === 0) return { success: true, balances: [] }

    const results = []
    for (const balanceId of balanceIds) {
      const balance = await prisma.tenantInventoryBalance.findUnique({
        where: { id: balanceId, tenantId }
      })
      if (!balance) continue

      const newQty = Math.max(0, balance.quantityOnHand + quantityAdjustment)
      const threshold = lowStockThreshold !== undefined ? lowStockThreshold : balance.lowStockThreshold
      const newStatus = computeStatus(newQty, threshold)

      const updated = await prisma.tenantInventoryBalance.update({
        where: { id: balanceId },
        data: {
          quantityOnHand: newQty,
          lowStockThreshold: threshold,
          status: newStatus
        },
        include: { catalogItem: true }
      })

      if (newStatus === 'low' || newStatus === 'critical') {
        try {
          const admins = await prisma.user.findMany({
            where: {
              tenantId,
              status: 'active',
              userRoles: {
                some: {
                  role: {
                    name: { in: ['admin', 'platform_owner', 'platform owner'], mode: 'insensitive' }
                  }
                }
              }
            },
            take: 3
          })
          for (const admin of admins) {
            dispatchNotification(tenantId, admin.email, 'email', 'inventory_alert', {
              item_name: updated.catalogItem?.title || 'Inventory Item',
              qty: String(newQty),
              threshold: String(threshold),
              status: newStatus.toUpperCase()
            }).catch(e => console.error("Failed to send bulk adjust low stock notification", e))
          }
        } catch (e) {
          console.error("Failed to fetch admin users for notification", e)
        }
      }
      results.push(updated)
    }

    revalidatePath('/admin/inventory')
    return { success: true, balances: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function bulkDeleteInventoryBalances(tenantId: string, balanceIds: string[]) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    if (balanceIds.length === 0) return { success: true }

    await prisma.tenantInventoryBalance.deleteMany({
      where: {
        id: { in: balanceIds },
        tenantId
      }
    })

    revalidatePath('/admin/inventory')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
