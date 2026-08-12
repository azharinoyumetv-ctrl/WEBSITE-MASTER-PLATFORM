'use server'

import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

function tokenDigest(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function getInvitationSummary(token: string) {
  if (!token) return { success: false, error: 'Invitation link is missing.' }

  const invitation = await prisma.tenantInvitation.findUnique({
    where: { tokenHash: tokenDigest(token) },
    include: { tenant: { select: { companyName: true } }, role: { select: { name: true } } }
  })

  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    return { success: false, error: 'This invitation is invalid or has expired.' }
  }

  return {
    success: true,
    invitation: {
      email: invitation.email,
      companyName: invitation.tenant.companyName,
      roleName: invitation.role.name,
      expiresAt: invitation.expiresAt
    }
  }
}

export async function acceptInvitation(token: string, password: string, firstName = '', lastName = '') {
  if (!token) return { success: false, error: 'Invitation link is missing.' }
  if (password.length < 12) return { success: false, error: 'Use at least 12 characters for your password.' }

  try {
    const tokenHash = tokenDigest(token)
    const invitation = await prisma.tenantInvitation.findUnique({ where: { tokenHash } })

    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      return { success: false, error: 'This invitation is invalid or has expired.' }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction(async (tx) => {
      const currentInvitation = await tx.tenantInvitation.findUnique({ where: { tokenHash } })
      if (!currentInvitation || currentInvitation.acceptedAt || currentInvitation.expiresAt <= new Date()) {
        throw new Error('This invitation is invalid or has expired.')
      }

      const existingUser = await tx.user.findUnique({
        where: { tenantId_email: { tenantId: currentInvitation.tenantId, email: currentInvitation.email } }
      })
      if (existingUser) throw new Error('A workspace user already exists for this email address.')

      const user = await tx.user.create({
        data: {
          tenantId: currentInvitation.tenantId,
          email: currentInvitation.email,
          passwordHash,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          emailVerified: true,
          status: 'active'
        }
      })

      await tx.tenantAuthCredential.create({
        data: { tenantId: currentInvitation.tenantId, userId: user.id, passwordHash }
      })
      await tx.tenantUserRole.create({
        data: { tenantId: currentInvitation.tenantId, userId: user.id, roleId: currentInvitation.assignedRoleId }
      })
      await tx.tenantInvitation.update({ where: { id: currentInvitation.id }, data: { acceptedAt: new Date() } })
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unable to activate this workspace invitation.' }
  }
}
