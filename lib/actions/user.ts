'use server'

import { UserStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import prisma from "@/lib/prisma"
import { getAuthenticatedUser, requirePermission } from '@/lib/rbac'
import { dispatchNotification, getActiveGatewayWithRouting } from '@/lib/actions/notifications'
import { getTenantPublicUrl } from '@/lib/tenant-url'



export async function getUsers(tenantId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (currentUser.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(currentUser.id, tenantId, 'user_management', 'read')

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
    const currentUser = await getAuthenticatedUser()
    if (currentUser.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(currentUser.id, tenantId, 'user_management', 'read')

    const roles = await prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    })
    return { success: true, roles }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function inviteUser(tenantId: string, email: string, roleId: string) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (currentUser.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(currentUser.id, tenantId, 'user_management', 'write')

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address')
    }

    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: normalizedEmail } }
    })
    
    if (existing) {
      return { success: false, error: 'User already exists in this tenant' }
    }

    const [tenant, role] = await Promise.all([
      prisma.systemTenant.findUnique({ where: { id: tenantId }, select: { companyName: true, subdomain: true, customDomain: true } }),
      prisma.role.findFirst({ where: { id: roleId, tenantId }, select: { id: true } })
    ])
    if (!tenant || !role) throw new Error('Workspace or assigned role was not found')

    // A raw token is sent once; only its SHA-256 digest is stored.
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    // Keep a single valid invitation per email address so an older link cannot
    // be accepted after an administrator has re-issued access.
    await prisma.tenantInvitation.deleteMany({
      where: { tenantId, email: normalizedEmail, acceptedAt: null }
    })

    await prisma.tenantInvitation.create({
      data: {
        tenantId,
        email: normalizedEmail,
        invitedBy: currentUser.id,
        assignedRoleId: roleId,
        tokenHash,
        expiresAt
      }
    })

    const origin = (process.env.NEXTAUTH_URL || 'https://store.dagangos.com').replace(/\/$/, '')
    const accessUrl = `${origin}/id/auth/accept-invitation?token=${encodeURIComponent(token)}`
    const emailGateway = await getActiveGatewayWithRouting(tenantId, 'email')

    let delivery: 'email_queued' | 'copy_link' = 'copy_link'
    if (emailGateway) {
      const notification = await dispatchNotification(tenantId, normalizedEmail, 'email', 'workspace_invitation', {
        company_name: tenant.companyName,
        workspace_url: getTenantPublicUrl(tenant),
        access_url: accessUrl,
        expires_at: expiresAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      })
      if (notification.success) delivery = 'email_queued'
    }

    revalidatePath('/admin/users')
    return {
      success: true,
      delivery,
      ...(delivery === 'copy_link' ? { accessUrl } : {})
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleUserStatus(tenantId: string, userId: string, newStatus: UserStatus) {
  try {
    const currentUser = await getAuthenticatedUser()
    if (currentUser.tenantId !== tenantId) throw new Error('Unauthorized tenant access')
    await requirePermission(currentUser.id, tenantId, 'user_management', 'write')

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
