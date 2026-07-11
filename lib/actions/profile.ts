'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import * as OTPAuth from 'otpauth'
import { encrypt } from '@/lib/crypto'

export async function getProfile(tenantId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true }
    })
    return { success: true, user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProfile(tenantId: string, userId: string, data: { firstName: string, lastName: string, phoneNumber: string }) {
  try {
    const user = await prisma.user.update({
      where: { id: userId, tenantId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        profile: {
          upsert: {
            create: { tenantId, phoneNumber: data.phoneNumber },
            update: { phoneNumber: data.phoneNumber }
          }
        }
      },
      include: { profile: true }
    })
    
    revalidatePath('/admin/profile')
    return { success: true, user }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function generateMfaSecret(tenantId: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId, tenantId } })
    if (!user) throw new Error("User not found")
    
    let secret = new OTPAuth.Secret({ size: 20 })
    let totp = new OTPAuth.TOTP({
      issuer: "DagangOS",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret
    })
    
    return { success: true, secret: secret.base32, uri: totp.toString() }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function verifyAndEnableMfa(tenantId: string, userId: string, secret: string, token: string) {
  try {
    let totp = new OTPAuth.TOTP({
      issuer: "DagangOS",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    })
    
    let delta = totp.validate({ token, window: 1 })
    if (delta === null) throw new Error("Invalid MFA token")
    
    await prisma.tenantAuthCredential.upsert({
      where: { userId },
      update: { mfaSecretEncrypted: encrypt(secret), isMfaEnabled: true },
      create: {
        userId,
        tenantId,
        passwordHash: "",
        mfaSecretEncrypted: encrypt(secret),
        isMfaEnabled: true
      }
    })
    
    revalidatePath('/admin/profile')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
