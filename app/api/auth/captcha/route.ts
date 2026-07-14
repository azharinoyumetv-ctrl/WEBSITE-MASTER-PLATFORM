import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { encrypt, decrypt } from '@/lib/crypto'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // @ts-ignore
  const svgCaptcha = (await import('svg-captcha')).default || await import('svg-captcha')
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1i',
    noise: 2,
    color: true,
  })

  const answer = captcha.text.toLowerCase()
  const token = crypto.randomBytes(16).toString('hex')
  
  // Clean up old captchas
  await prisma.systemApiRateLimit.deleteMany({
    where: { provider: 'captcha', resetTime: { lt: new Date() } }
  })

  // We use ipAddress to store the token, and 'provider' as 'captcha'
  // But wait, ipAddress has max length 45. The token is 32 chars.
  // Actually, we can just use the provider="captcha" and ipAddress=token.
  // And we can store the answer in the `count` field by hashing it to an int, or just
  // use `resetTime` and another record? 
  // Better yet, since we have SystemApiRateLimit, we can just enforce rate limiting by IP.
  // For the answer, let's just do a simple hash on the frontend? No, that's insecure.
  // Let's store the answer as a signed JWT or encrypted string and return it to the client, 
  // then the client sends it back along with their guess.
  
  const payload = JSON.stringify({ answer, expires: Date.now() + 5 * 60 * 1000 })
  const encrypted = encrypt(payload)

  return NextResponse.json({
    svg: captcha.data,
    token: encrypted
  })
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'auth_captcha', 20, 60 * 1000)
    if (rl.limited) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { token, answer } = await req.json()
    if (!token || !answer) {
      return NextResponse.json({ success: false, error: 'Missing token or answer' }, { status: 400 })
    }

    const decrypted = decrypt(token)
    if (!decrypted) {
      return NextResponse.json({ success: false, error: 'Invalid CAPTCHA token' }, { status: 400 })
    }

    const payload = JSON.parse(decrypted)
    if (payload.expires < Date.now()) {
      return NextResponse.json({ success: false, error: 'CAPTCHA expired' }, { status: 400 })
    }

    if (payload.answer !== answer.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Incorrect answer' }, { status: 400 })
    }

    // CAPTCHA solved! Return a validation token
    const validationToken = encrypt(JSON.stringify({ 
      verified: true, 
      expires: Date.now() + 15 * 60 * 1000 
    }))

    return NextResponse.json({ success: true, validationToken })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
  }
}
