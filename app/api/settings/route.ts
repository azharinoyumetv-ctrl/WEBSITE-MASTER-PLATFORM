import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import { getAdminWebsiteConfig, saveAdminWebsiteConfig } from '@/lib/actions/website'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'settings_get', 20, 60 * 1000)
    if (rl.limited) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const tenantId = req.headers.get('x-tenant-id') || (session.user as any).tenantId
    await requirePermission((session.user as any).id, tenantId, 'website', 'read')

    const res = await getAdminWebsiteConfig(tenantId)
    if (!res.success) return NextResponse.json({ error: 'Failed to load settings' }, { status: 400 })

    return NextResponse.json(res.website)
  } catch (error: any) {
    console.error('[settings GET] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = await checkRateLimit(ip, 'settings_post', 10, 60 * 1000)
    if (rl.limited) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const tenantId = req.headers.get('x-tenant-id') || (session.user as any).tenantId
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')

    const data = await req.json()
    const res = await saveAdminWebsiteConfig(tenantId, data)
    if (!res.success) return NextResponse.json({ error: 'Failed to save settings' }, { status: 400 })

    return NextResponse.json(res.website)
  } catch (error: any) {
    console.error('[settings POST] Internal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
