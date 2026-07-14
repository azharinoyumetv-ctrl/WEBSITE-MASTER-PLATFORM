import { NextResponse } from 'next/server'
import crypto from 'crypto'

const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Validates HMAC-SHA256 signature for /api/v1 control-plane requests.
 *
 * Required headers:
 *   x-license-key       — the tenant's raw license key (used as context)
 *   x-request-timestamp — Unix timestamp in ms (string)
 *   x-signature         — HMAC-SHA256(timestamp + ":" + rawBody, CONTROL_PLANE_SECRET)
 *
 * Returns NextResponse 401 on failure, null on success.
 */
export async function validateV1Request(req: Request): Promise<NextResponse | null> {
  const secret = process.env.CONTROL_PLANE_SECRET
  if (!secret) {
    // If not configured, allow through but log loudly
    console.warn('[v1-auth] CONTROL_PLANE_SECRET is not set — /api/v1 routes are unprotected!')
    return null
  }

  const timestamp = req.headers.get('x-request-timestamp')
  const signature = req.headers.get('x-signature')

  if (!timestamp || !signature) {
    return NextResponse.json(
      { success: false, error: 'Missing authentication headers' },
      { status: 401 }
    )
  }

  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
    return NextResponse.json(
      { success: false, error: 'Request timestamp expired or invalid' },
      { status: 401 }
    )
  }

  // Clone the request to read the body without consuming it
  const rawBody = await req.clone().text()
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${rawBody}`)
    .digest('hex')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json(
      { success: false, error: 'Invalid request signature' },
      { status: 401 }
    )
  }

  return null
}
