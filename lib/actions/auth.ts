'use server'

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getAuthenticatedUser } from "@/lib/rbac"
import * as OTPAuth from "otpauth"
import { encrypt, decrypt } from "@/lib/crypto"

function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters long."
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter."
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter."
  if (!/[0-9]/.test(password)) return "Password must contain at least one number."
  return null
}

export async function registerTenantAdmin(data: any) {
  try {
    const { firstName, lastName, email, companyName, password } = data

    if (!email || !password || !companyName || !firstName || !lastName) {
      return { success: false, error: "All fields are required." }
    }

    const policyError = validatePasswordPolicy(password)
    if (policyError) {
      return { success: false, error: policyError }
    }

    // Generate a simple subdomain from companyName (e.g. "Acme Corp" -> "acmecorp")
    let baseSubdomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!baseSubdomain) {
      baseSubdomain = 'tenant'
    }
    
    // Ensure subdomain uniqueness
    let subdomain = baseSubdomain
    let counter = 1
    while (await prisma.systemTenant.findUnique({ where: { subdomain } })) {
      subdomain = `${baseSubdomain}${counter}`
      counter++
    }

    // Ensure email uniqueness globally (or at least check if it exists)
    const existingUser = await prisma.user.findFirst({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: "Email is already in use." }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const crypto = require('crypto')
    const vToken = crypto.randomBytes(32).toString('hex')

    // Run creation in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.systemTenant.create({
        data: {
          companyName,
          subdomain,
          status: "suspended", // Tenant is suspended until email is verified
          plan: "core"
        }
      })

      // 2. Create User (Owner)
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          status: "pending_verification",
          emailVerified: false,
          verificationToken: vToken
        }
      })

      // 3. Create Auth Credential
      await tx.tenantAuthCredential.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          passwordHash
        }
      })

      // 4. Create Admin Role
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Admin',
          description: 'Super Administrator',
          permissions: {
            system: ['read', 'write'],
            catalog: ['read', 'write', 'delete'],
            orders: ['read', 'write'],
            payments: ['read'],
            inventory: ['read', 'write'],
            pos: ['read', 'write'],
            crm: ['read', 'write'],
            booking: ['read', 'write']
          }
        }
      })

      // 5. Assign Role to User
      await tx.tenantUserRole.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: adminRole.id
        }
      })

      // 6. Create User Profile
      await tx.tenantUserProfile.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          preferences: { locale: 'en', timezone: 'UTC' }
        }
      })

      // 7. Create default Website Config
      await tx.tenantWebsite.create({
        data: {
          tenantId: tenant.id,
          siteTitle: companyName,
          themeConfig: {
            colors: {
              primary: '#0F172A',
              secondary: '#3B82F6',
              background: '#FFFFFF'
            },
            typography: {
              base_font: 'Inter',
              headings: 'Geist'
            },
            layout_density: 'comfortable'
          }
        }
      })
    })

    return { success: true, message: "Registration successful. Please check your email to verify your account." }
  } catch (error: any) {
    console.error("Registration error:", error)
    return { success: false, error: error.message || "An unexpected error occurred." }
  }
}

export async function revokeAllSessions(userId: string) {
  try {
    const user = await getAuthenticatedUser()
    if (user.id !== userId) throw new Error("Unauthorized")

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } }
      }),
      prisma.tenantRefreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true }
      })
    ])
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function logoutEverywhere() {
  const user = await getAuthenticatedUser().catch(() => null)
  if (!user?.id) return { success: false, error: 'Unauthorized' }
  
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } }
    }),
    prisma.tenantRefreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true }
    })
  ])
  
  return { success: true }
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({ where: { email }, include: { authCredential: true } })
  if (!user) return { success: true } // Silently succeed for security

  const crypto = require('crypto')
  const resetToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  if (user.authCredential) {
    await prisma.tenantAuthCredential.update({
      where: { id: user.authCredential.id },
      data: { passwordResetToken: resetToken, passwordResetExpires: expiresAt }
    })
  }

  // Send email (we use nodemailer with a generic transporter for now, or just log it if no config)

  return { success: true }
}

export async function verifyEmailToken(token: string) {
  const user = await prisma.user.findUnique({ where: { verificationToken: token }, include: { tenant: true } })
  if (!user) return { success: false, error: "Invalid or expired token." }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: true, status: "active", verificationToken: null }
    })
    await tx.systemTenant.update({
      where: { id: user.tenantId },
      data: { status: "active" }
    })
  })
  return { success: true }
}

export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findFirst({ where: { email } })
  if (!user || user.emailVerified || user.status !== "pending_verification") {
    return { success: true } // Silently succeed
  }

  const crypto = require('crypto')
  const vToken = crypto.randomBytes(32).toString('hex')

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: vToken }
  })

  return { success: true }
}

export async function resetPassword(token: string, newPassword: string) {
  const authCred = await prisma.tenantAuthCredential.findUnique({ where: { passwordResetToken: token } })
  if (!authCred || !authCred.passwordResetExpires || authCred.passwordResetExpires < new Date()) {
    return { success: false, error: "Invalid or expired token." }
  }

  const policyError = validatePasswordPolicy(newPassword)
  if (policyError) return { success: false, error: policyError }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.tenantAuthCredential.update({
    where: { id: authCred.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpires: null }
  })
  return { success: true }
}

export async function generateMfaSecret() {
  const user = await getAuthenticatedUser()
  const secret = new OTPAuth.Secret({ size: 20 })
  const totp = new OTPAuth.TOTP({
    issuer: "WebsiteMasterPlatform",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret
  })
  
  return { success: true, secret: secret.base32, uri: totp.toString() }
}

export async function verifyAndEnableMfa(secretBase32: string, code: string) {
  const user = await getAuthenticatedUser()
  const totp = new OTPAuth.TOTP({
    issuer: "WebsiteMasterPlatform",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32)
  })

  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) return { success: false, error: "Invalid code" }

  const authCred = await prisma.tenantAuthCredential.findUnique({ where: { userId: user.id } })
  if (!authCred) return { success: false, error: "Auth credential not found" }

  await prisma.tenantAuthCredential.update({
    where: { id: authCred.id },
    data: { 
      isMfaEnabled: true,
      mfaSecretEncrypted: encrypt(secretBase32)
    }
  })

  return { success: true }
}

export async function disableMfa(code: string) {
  const user = await getAuthenticatedUser()
  const authCred = await prisma.tenantAuthCredential.findUnique({ where: { userId: user.id } })
  if (!authCred || !authCred.isMfaEnabled || !authCred.mfaSecretEncrypted) {
    return { success: false, error: "MFA not enabled" }
  }

  const secretBase32 = decrypt(authCred.mfaSecretEncrypted)
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secretBase32!) })
  
  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) return { success: false, error: "Invalid code" }

  await prisma.tenantAuthCredential.update({
    where: { id: authCred.id },
    data: { isMfaEnabled: false, mfaSecretEncrypted: null }
  })

  return { success: true }
}
