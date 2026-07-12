import { NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/actions/auth'

export async function POST(req: Request) {
  try {
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
