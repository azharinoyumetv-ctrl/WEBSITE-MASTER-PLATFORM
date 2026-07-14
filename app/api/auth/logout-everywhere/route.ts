import { NextResponse } from 'next/server'
import { logoutEverywhere } from '@/lib/actions/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'auth_logout_everywhere', 10, 15 * 60 * 1000)
    if (rl.limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const res = await logoutEverywhere()
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 401 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[auth/logout-everywhere] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
