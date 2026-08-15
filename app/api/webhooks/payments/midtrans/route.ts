import { NextRequest } from 'next/server'
import { POST as handleProviderWebhook } from '../../../webhook/[provider]/route'

/**
 * Backward-compatible alias for integrations still using the historical
 * /api/webhooks/payments/midtrans endpoint. All authentication, rate limiting,
 * idempotency, and settlement behavior lives in the canonical provider route.
 */
export async function POST(req: NextRequest) {
  return handleProviderWebhook(req, { params: Promise.resolve({ provider: 'midtrans' }) })
}
