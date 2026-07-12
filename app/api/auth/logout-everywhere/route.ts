import { NextResponse } from 'next/server'
import { logoutEverywhere } from '@/lib/actions/auth'

export async function POST(req: Request) {
  try {
    const res = await logoutEverywhere()
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 401 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
