import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_API_KEY
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') || request.headers.get('x-api-key') || ''
      if (authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized webhook' }, { status: 401 })
      }
    }

    const body = await request.json()
    console.log('=== WEBSITE MASTER PLATFORM WEBHOOK RECEIVED ===')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Payload:', JSON.stringify(body, null, 2))
    console.log('================================================')
    
    return NextResponse.json({
      success: true,
      message: 'Webhook received successfully',
      receivedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Invalid JSON payload' },
      { status: 400 }
    )
  }
}
