'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { requirePermission, getAuthenticatedUser } from "@/lib/rbac"

export async function getShifts(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

    const shifts = await prisma.tenantPosShift.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        terminal: {
          select: {
            id: true,
            terminalName: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    return { success: true, shifts }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createShift(
  tenantId: string,
  data: { userId: string; terminalId: string; startTime: string; endTime: string; notes?: string }
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

    const shift = await prisma.tenantPosShift.create({
      data: {
        tenantId,
        userId: data.userId,
        terminalId: data.terminalId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes || null
      }
    })

    revalidatePath('/admin/pos/shifts')
    return { success: true, shift }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateShift(
  tenantId: string,
  shiftId: string,
  data: { userId?: string; terminalId?: string; startTime?: string; endTime?: string; notes?: string }
) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

    const shift = await prisma.tenantPosShift.update({
      where: { id: shiftId, tenantId },
      data: {
        ...(data.userId && { userId: data.userId }),
        ...(data.terminalId && { terminalId: data.terminalId }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.notes !== undefined && { notes: data.notes })
      }
    })

    revalidatePath('/admin/pos/shifts')
    return { success: true, shift }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteShift(tenantId: string, shiftId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'write')

    await prisma.tenantPosShift.delete({
      where: { id: shiftId, tenantId }
    })

    revalidatePath('/admin/pos/shifts')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getSchedulerResources(tenantId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.tenantId !== tenantId) throw new Error("Unauthorized tenant access")
    await requirePermission(user.id, tenantId, 'pos', 'read')

    const terminals = await prisma.tenantPosTerminal.findMany({
      where: { tenantId },
      select: { id: true, terminalName: true }
    })

    const users = await prisma.user.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, firstName: true, lastName: true, email: true }
    })

    return { success: true, terminals, users }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
