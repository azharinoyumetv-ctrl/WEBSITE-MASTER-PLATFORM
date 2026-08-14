import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/actions/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getTrustedHeaderClientIp } from '@/lib/request-ip'

export async function POST(req: Request) {
  try {
    const ip = getTrustedHeaderClientIp(req)
    const rateLimit = await checkRateLimit(ip, 'auth_forgot_password', 5, 15 * 60 * 1000)
    if (rateLimit.limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again in 15 minutes.' }, { status: 429 })
    }

    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    
    const res = await requestPasswordReset(email)
    if (!res.success) {
      return NextResponse.json({ error: 'Failed to process password reset.' }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[auth/forgot-password] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
