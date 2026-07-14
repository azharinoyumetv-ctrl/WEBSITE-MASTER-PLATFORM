import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'auth_reset_password', 5, 15 * 60 * 1000)
    
    if (rl.limited) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }

    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const authCred = await prisma.tenantAuthCredential.findUnique({
      where: { passwordResetToken: token },
      include: { user: true }
    })

    if (!authCred || !authCred.passwordResetExpires || authCred.passwordResetExpires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    const newHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      await tx.tenantAuthCredential.update({
        where: { id: authCred.id },
        data: {
          passwordHash: newHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      })
      // Also update legacy hash if needed
      await tx.user.update({
        where: { id: authCred.user.id },
        data: { passwordHash: newHash }
      })
      // Revoke all refresh tokens
      await tx.tenantRefreshToken.updateMany({
        where: { userId: authCred.user.id },
        data: { isRevoked: true }
      })
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[auth/reset-password] Internal error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
