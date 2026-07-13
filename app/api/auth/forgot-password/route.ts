import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/actions/auth'
import prisma from '@/lib/prisma'

const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5 // 5 requests per window per IP

async function checkRateLimit(req: Request, provider: string) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  const now = new Date()
  
  try {
    const record = await prisma.systemApiRateLimit.findUnique({
      where: {
        provider_ipAddress: {
          provider,
          ipAddress: ip
        }
      }
    })

    if (!record || now > record.resetTime) {
      await prisma.systemApiRateLimit.upsert({
        where: { provider_ipAddress: { provider, ipAddress: ip } },
        update: { count: 1, resetTime: new Date(now.getTime() + RATE_LIMIT_WINDOW) },
        create: { provider, ipAddress: ip, count: 1, resetTime: new Date(now.getTime() + RATE_LIMIT_WINDOW) }
      })
      return true
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
      return false
    }

    await prisma.systemApiRateLimit.update({
      where: { provider_ipAddress: { provider, ipAddress: ip } },
      data: { count: { increment: 1 } }
    })
    
    return true
  } catch (error) {
    console.error('Rate limit error:', error)
    return true
  }
}

export async function POST(req: Request) {
  try {
    const allowed = await checkRateLimit(req, 'forgot-password')
    if (!allowed) {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
