import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

export async function authenticateApiRequest(req: Request, requiredScope?: string) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 }) }
  }

  const token = authHeader.split(' ')[1]
  const keyHash = crypto.createHash('sha256').update(token).digest('hex')

  const apiKey = await prisma.tenantApiKey.findUnique({
    where: { keyHash },
    include: { tenant: true }
  })

  if (!apiKey || !apiKey.isActive) {
    return { error: NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 }) }
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { error: NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 }) }
  }

  const scopes = (apiKey.scopes as string[]) || []
  if (requiredScope && !scopes.includes(requiredScope)) {
    return { error: NextResponse.json({ error: 'Forbidden: Insufficient scope' }, { status: 403 }) }
  }

  // Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = await prisma.systemApiRateLimit.upsert({
    where: { provider_ipAddress: { provider: `api_${apiKey.tenantId}`, ipAddress: ip } },
    update: { count: { increment: 1 } },
    create: { provider: `api_${apiKey.tenantId}`, ipAddress: ip, resetTime: new Date(Date.now() + 60 * 1000) } // 1 minute window
  })

  if (rl.resetTime < new Date()) {
    await prisma.systemApiRateLimit.update({
      where: { id: rl.id },
      data: { count: 1, resetTime: new Date(Date.now() + 60 * 1000) }
    })
    rl.count = 1
  }

  if (rl.count > apiKey.rateLimitRpm) {
    return { error: NextResponse.json({ error: 'Too Many Requests' }, { status: 429 }) }
  }

  // Log usage asynchronously
  prisma.$transaction([
    prisma.tenantApiKey.update({
      where: { id: apiKey.id },
      data: { 
        lastUsedAt: new Date(),
        requestCount: { increment: 1 }
      }
    }),
    prisma.systemAuditLog.create({
      data: {
        tenantId: apiKey.tenantId,
        actionType: 'api_key_usage',
        status: 'success',
        ipAddress: ip,
        payload: {
          apiKeyId: apiKey.id,
          keyName: apiKey.keyName,
          endpoint: req.url,
          method: req.method
        }
      }
    })
  ]).catch(console.error)

  return { apiKey, tenant: apiKey.tenant }
}
