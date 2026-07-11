import prisma from '@/lib/prisma'

/**
 * Enforces rate limiting per IP and action (provider).
 * Returns { limited: boolean, count: number }
 */
export async function checkRateLimit(ip: string, action: string, limit: number = 5, windowMs: number = 15 * 60 * 1000) {
  const rl = await prisma.systemApiRateLimit.upsert({
    where: { provider_ipAddress: { provider: action, ipAddress: ip } },
    update: { count: { increment: 1 } },
    create: { provider: action, ipAddress: ip, resetTime: new Date(Date.now() + windowMs) }
  })

  if (rl.resetTime < new Date()) {
    await prisma.systemApiRateLimit.update({
      where: { id: rl.id },
      data: { count: 1, resetTime: new Date(Date.now() + windowMs) }
    })
    return { limited: false, count: 1, id: rl.id }
  }

  if (rl.count > limit) {
    return { limited: true, count: rl.count, id: rl.id }
  }

  return { limited: false, count: rl.count, id: rl.id }
}
