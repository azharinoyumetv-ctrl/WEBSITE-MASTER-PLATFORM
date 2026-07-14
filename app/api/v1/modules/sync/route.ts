import { NextResponse } from 'next/server'
import { validateV1Request } from '@/lib/v1-auth'

export async function POST(req: Request) {
  const authError = await validateV1Request(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { modules, syncId } = body

    if (!modules || !syncId) {
      return NextResponse.json({ success: false, error: 'Missing sync modules or syncId' }, { status: 400 })
    }

    console.log(`[Instance Sync] Applied modules: ${modules.join(', ')} (Sync ID: ${syncId})`)

    return NextResponse.json({
      status: 'applied',
      syncId
    })
  } catch (error: any) {
    console.error('[v1/modules/sync] Internal error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
