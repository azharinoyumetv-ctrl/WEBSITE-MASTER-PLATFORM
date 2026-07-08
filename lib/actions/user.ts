'use server'

import { PrismaClient, UserStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import prisma from "@/lib/prisma"



export async function getUsers(tenantId: string) {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      include: {
        userRoles: {
          include: { role: true }
        },
        profile: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = users.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: null, // Would be fetched from auth records if implemented
      roles: u.userRoles.map(ur => ur.role.name)
    }))

    return { success: true, users: formatted }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getRoles(tenantId: string) {
  try {
    const roles = await prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    })
    return { success: true, roles }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function inviteUser(tenantId: string, email: string, roleId: string, invitedBy: string) {
  try {
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } }
    })
    
    if (existing) {
      return { success: false, error: 'User already exists in this tenant' }
    }

    const token = crypto.randomBytes(32).toString('hex')

    const invitation = await prisma.tenantInvitation.create({
      data: {
        tenantId,
        email,
        invitedBy,
        assignedRoleId: roleId,
        tokenHash: token, // In real app, hash this before storing
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      }
    })

    // TODO: Send email here using Notification service
    
    revalidatePath('/admin/users')
    return { success: true, invitation }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleUserStatus(tenantId: string, userId: string, newStatus: UserStatus) {
  try {
    const user = await prisma.user.update({
      where: { id: userId, tenantId },
      data: { status: newStatus }
    })
    
    revalidatePath('/admin/users')
    return { success: true, user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
