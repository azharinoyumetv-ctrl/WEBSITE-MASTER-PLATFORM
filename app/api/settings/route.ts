import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission } from '@/lib/rbac'
import { getAdminWebsiteConfig, saveAdminWebsiteConfig } from '@/lib/actions/website'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = req.headers.get('x-tenant-id') || (session.user as any).tenantId
    await requirePermission((session.user as any).id, tenantId, 'website', 'read')

    const res = await getAdminWebsiteConfig(tenantId)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json(res.website)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = req.headers.get('x-tenant-id') || (session.user as any).tenantId
    await requirePermission((session.user as any).id, tenantId, 'website', 'write')

    const data = await req.json()
    const res = await saveAdminWebsiteConfig(tenantId, data)
    if (!res.success) throw new Error(res.error)

    return NextResponse.json(res.website)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
}
