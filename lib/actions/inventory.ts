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

    const [catalogItems, batches] = await Promise.all([
      prisma.tenantCatalogItem.findMany({ where: { tenantId } }),
      prisma.tenantInventoryBatch.findMany({
        where: { tenantId },
        include: { catalogItem: true, location: true },
        orderBy: [{ expiresAt: 'asc' }, { receivedAt: 'desc' }],
      }),
    ])

    return { success: true, locations, balances, catalogItems, batches }
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

export async function adjustInventory(
  tenantId: string,
  balanceId: string,
  quantityAdjustment: number,
  batchId?: string,
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    let updated: any
    let updatedBatch: any = null

    if (batchId) {
      const result = await prisma.$transaction(async tx => {
        const balance = await tx.tenantInventoryBalance.findFirst({ where: { id: balanceId, tenantId } })
        if (!balance) throw new Error('Balance not found')

        const batch = await tx.tenantInventoryBatch.findFirst({
          where: {
            id: batchId,
            tenantId,
            locationId: balance.locationId,
            catalogItemId: balance.catalogItemId,
          },
        })
        if (!batch) throw new Error('Selected batch does not belong to this inventory balance')

        const nextQuantity = batch.quantityOnHand + quantityAdjustment
        if (nextQuantity < 0) throw new Error('Adjustment exceeds stock available in the selected batch')

        const nextBatch = await tx.tenantInventoryBatch.update({
          where: { id: batch.id },
          data: { quantityOnHand: nextQuantity },
          include: { catalogItem: true, location: true },
        })
        await tx.tenantInventoryBatchMovement.create({
          data: {
            tenantId,
            batchId: batch.id,
            movementType: 'adjustment',
            quantityDelta: quantityAdjustment,
            reason: 'Manual inventory adjustment',
            metadata: { balanceId },
            createdBy: user.id,
          },
        })
        const nextBalance = await syncBatchBalance(tx, tenantId, balance.locationId, balance.catalogItemId)
        return { nextBalance, nextBatch }
      })
      updated = result.nextBalance
      updatedBatch = result.nextBatch
    } else {
      const balance = await prisma.tenantInventoryBalance.findFirst({ where: { id: balanceId, tenantId } })
      if (!balance) return { success: false, error: 'Balance not found' }

      const newQty = Math.max(0, balance.quantityOnHand + quantityAdjustment)
      updated = await prisma.tenantInventoryBalance.update({
        where: { id: balanceId },
        data: {
          quantityOnHand: newQty,
          status: computeStatus(newQty, balance.lowStockThreshold),
        },
        include: { catalogItem: true, location: true },
      })
    }

    if (updated.status === 'low' || updated.status === 'critical') {
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
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
          take: 3,
        })
        for (const admin of admins) {
          await dispatchNotification(tenantId, admin.email, 'email', 'inventory_alert', {
            item_name: updated.catalogItem?.title || 'Inventory Item',
            qty: String(updated.quantityOnHand),
            threshold: String(updated.lowStockThreshold),
            status: String(updated.status).toUpperCase(),
          })
        }
      } catch (error) {
        console.error('Failed to dispatch low stock alert:', error)
      }
    }

    revalidatePath('/admin/inventory')
    return { success: true, balance: updated, batch: updatedBatch }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function transferStock(
  tenantId: string,
  sourceLocationId: string,
  targetLocationId: string,
  catalogItemId: string,
  quantity: number,
  batchId?: string,
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    if (quantity <= 0) return { success: false, error: 'Quantity must be greater than zero' }
    if (sourceLocationId === targetLocationId) return { success: false, error: 'Source and target locations must be different' }

    if (batchId) {
      const result = await prisma.$transaction(async tx => {
        const [sourceBatch, targetLocation] = await Promise.all([
          tx.tenantInventoryBatch.findFirst({
            where: { id: batchId, tenantId, locationId: sourceLocationId, catalogItemId },
          }),
          tx.tenantInventoryLocation.findFirst({ where: { id: targetLocationId, tenantId } }),
        ])
        if (!sourceBatch) throw new Error('Selected source batch was not found')
        if (!targetLocation) throw new Error('Target location was not found')
        if (sourceBatch.quantityOnHand < quantity) throw new Error('Insufficient stock in the selected batch')

        const nextSourceBatch = await tx.tenantInventoryBatch.update({
          where: { id: sourceBatch.id },
          data: { quantityOnHand: sourceBatch.quantityOnHand - quantity },
          include: { catalogItem: true, location: true },
        })
        const targetBatch = await tx.tenantInventoryBatch.upsert({
          where: {
            tenantId_locationId_catalogItemId_lotNumber: {
              tenantId,
              locationId: targetLocationId,
              catalogItemId,
              lotNumber: sourceBatch.lotNumber,
            },
          },
          update: { quantityOnHand: { increment: quantity } },
          create: {
            tenantId,
            locationId: targetLocationId,
            catalogItemId,
            lotNumber: sourceBatch.lotNumber,
            quantityOnHand: quantity,
            receivedAt: new Date(),
            expiresAt: sourceBatch.expiresAt,
            supplier: sourceBatch.supplier,
            notes: sourceBatch.notes,
          },
          include: { catalogItem: true, location: true },
        })

        await tx.tenantInventoryBatchMovement.createMany({
          data: [
            {
              tenantId,
              batchId: sourceBatch.id,
              movementType: 'transfer_out',
              quantityDelta: -quantity,
              reason: 'Inventory transfer',
              metadata: { targetLocationId, targetBatchId: targetBatch.id },
              createdBy: user.id,
            },
            {
              tenantId,
              batchId: targetBatch.id,
              movementType: 'transfer_in',
              quantityDelta: quantity,
              reason: 'Inventory transfer',
              metadata: { sourceLocationId, sourceBatchId: sourceBatch.id },
              createdBy: user.id,
            },
          ],
        })

        const [sourceBalance, targetBalance] = await Promise.all([
          syncBatchBalance(tx, tenantId, sourceLocationId, catalogItemId),
          syncBatchBalance(tx, tenantId, targetLocationId, catalogItemId),
        ])
        return { sourceBalance, targetBalance, sourceBatch: nextSourceBatch, targetBatch }
      })

      revalidatePath('/admin/inventory')
      return { success: true, ...result }
    }

    const result = await prisma.$transaction(async tx => {
      const sourceBalance = await tx.tenantInventoryBalance.findUnique({
        where: { locationId_catalogItemId: { locationId: sourceLocationId, catalogItemId } },
      })
      if (!sourceBalance || sourceBalance.tenantId !== tenantId) throw new Error('Source balance not found')
      if (sourceBalance.quantityOnHand < quantity) throw new Error('Insufficient stock at source location')

      await tx.tenantInventoryBalance.update({
        where: { id: sourceBalance.id },
        data: {
          quantityOnHand: sourceBalance.quantityOnHand - quantity,
          status: computeStatus(sourceBalance.quantityOnHand - quantity, sourceBalance.lowStockThreshold),
        },
      })

      const targetBalance = await tx.tenantInventoryBalance.findUnique({
        where: { locationId_catalogItemId: { locationId: targetLocationId, catalogItemId } },
      })
      if (targetBalance) {
        if (targetBalance.tenantId !== tenantId) throw new Error('Target balance tenant mismatch')
        await tx.tenantInventoryBalance.update({
          where: { id: targetBalance.id },
          data: {
            quantityOnHand: targetBalance.quantityOnHand + quantity,
            status: computeStatus(targetBalance.quantityOnHand + quantity, targetBalance.lowStockThreshold),
          },
        })
      } else {
        const targetLocation = await tx.tenantInventoryLocation.findFirst({ where: { id: targetLocationId, tenantId } })
        if (!targetLocation) throw new Error('Target location was not found')
        await tx.tenantInventoryBalance.create({
          data: {
            tenantId,
            locationId: targetLocationId,
            catalogItemId,
            quantityOnHand: quantity,
            lowStockThreshold: sourceBalance.lowStockThreshold,
            status: computeStatus(quantity, sourceBalance.lowStockThreshold),
          },
        })
      }
      return { success: true }
    })
    return result
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


async function syncBatchBalance(
  tx: any,
  tenantId: string,
  locationId: string,
  catalogItemId: string,
) {
  const aggregate = await tx.tenantInventoryBatch.aggregate({
    where: { tenantId, locationId, catalogItemId },
    _sum: { quantityOnHand: true },
  })
  const quantityOnHand = aggregate._sum.quantityOnHand || 0
  const existing = await tx.tenantInventoryBalance.findUnique({
    where: { locationId_catalogItemId: { locationId, catalogItemId } },
  })
  const threshold = existing?.lowStockThreshold ?? 5

  return tx.tenantInventoryBalance.upsert({
    where: { locationId_catalogItemId: { locationId, catalogItemId } },
    update: {
      quantityOnHand,
      status: computeStatus(quantityOnHand, threshold),
    },
    create: {
      tenantId,
      locationId,
      catalogItemId,
      quantityOnHand,
      lowStockThreshold: threshold,
      status: computeStatus(quantityOnHand, threshold),
    },
    include: { catalogItem: true, location: true },
  })
}

export async function createInventoryBatch(tenantId: string, data: {
  locationId: string
  catalogItemId: string
  lotNumber: string
  quantityOnHand: number
  receivedAt?: string
  expiresAt?: string
  supplier?: string
  notes?: string
}) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    const lotNumber = data.lotNumber.trim()
    const quantityOnHand = Math.max(0, Math.floor(Number(data.quantityOnHand)))
    if (!lotNumber) throw new Error('Lot number is required')
    if (!Number.isFinite(quantityOnHand)) throw new Error('Batch quantity is invalid')

    const result = await prisma.$transaction(async tx => {
      const [location, catalogItem] = await Promise.all([
        tx.tenantInventoryLocation.findFirst({ where: { id: data.locationId, tenantId } }),
        tx.tenantCatalogItem.findFirst({ where: { id: data.catalogItemId, tenantId } }),
      ])
      if (!location || !catalogItem) throw new Error('Invalid location or catalog item')

      const batch = await tx.tenantInventoryBatch.create({
        data: {
          tenantId,
          locationId: data.locationId,
          catalogItemId: data.catalogItemId,
          lotNumber,
          quantityOnHand,
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          supplier: data.supplier?.trim() || null,
          notes: data.notes?.trim() || null,
        },
        include: { catalogItem: true, location: true },
      })
      if (quantityOnHand !== 0) {
        await tx.tenantInventoryBatchMovement.create({
          data: {
            tenantId,
            batchId: batch.id,
            movementType: 'receipt',
            quantityDelta: quantityOnHand,
            reason: 'Batch created',
            metadata: { lotNumber },
            createdBy: user.id,
          },
        })
      }
      const balance = await syncBatchBalance(tx, tenantId, data.locationId, data.catalogItemId)
      return { batch, balance }
    })

    revalidatePath('/admin/inventory')
    return { success: true, ...result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateInventoryBatch(
  tenantId: string,
  batchId: string,
  data: { lotNumber?: string; quantityOnHand?: number; expiresAt?: string | null; supplier?: string; notes?: string },
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    const result = await prisma.$transaction(async tx => {
      const current = await tx.tenantInventoryBatch.findFirst({ where: { id: batchId, tenantId } })
      if (!current) throw new Error('Batch not found')

      const batch = await tx.tenantInventoryBatch.update({
        where: { id: batchId },
        data: {
          lotNumber: data.lotNumber?.trim() || undefined,
          quantityOnHand: data.quantityOnHand === undefined
            ? undefined
            : Math.max(0, Math.floor(Number(data.quantityOnHand))),
          expiresAt: data.expiresAt === undefined
            ? undefined
            : data.expiresAt ? new Date(data.expiresAt) : null,
          supplier: data.supplier === undefined ? undefined : data.supplier.trim() || null,
          notes: data.notes === undefined ? undefined : data.notes.trim() || null,
        },
        include: { catalogItem: true, location: true },
      })
      const quantityDelta = batch.quantityOnHand - current.quantityOnHand
      if (quantityDelta !== 0) {
        await tx.tenantInventoryBatchMovement.create({
          data: {
            tenantId,
            batchId: batch.id,
            movementType: 'adjustment',
            quantityDelta,
            reason: 'Batch quantity updated',
            metadata: { lotNumber: batch.lotNumber },
            createdBy: user.id,
          },
        })
      }
      const balance = await syncBatchBalance(tx, tenantId, current.locationId, current.catalogItemId)
      return { batch, balance }
    })

    revalidatePath('/admin/inventory')
    return { success: true, ...result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteInventoryBatch(tenantId: string, batchId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(user.id, tenantId, 'inventory', 'write')

    const balance = await prisma.$transaction(async tx => {
      const current = await tx.tenantInventoryBatch.findFirst({ where: { id: batchId, tenantId } })
      if (!current) throw new Error('Batch not found')
      await tx.tenantInventoryBatch.deleteMany({ where: { id: batchId, tenantId } })
      if (current.quantityOnHand !== 0) {
        await tx.tenantInventoryBatchMovement.create({
          data: {
            tenantId,
            batchId: null,
            movementType: 'removal',
            quantityDelta: -current.quantityOnHand,
            reason: 'Batch deleted',
            metadata: { batchId: current.id, lotNumber: current.lotNumber, locationId: current.locationId, catalogItemId: current.catalogItemId },
            createdBy: user.id,
          },
        })
      }
      return syncBatchBalance(tx, tenantId, current.locationId, current.catalogItemId)
    })

    revalidatePath('/admin/inventory')
    return { success: true, balance }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
