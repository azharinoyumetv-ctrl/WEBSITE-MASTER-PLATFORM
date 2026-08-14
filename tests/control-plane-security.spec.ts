import { createHmac } from 'crypto'
import { expect, test } from '@playwright/test'

const secret = process.env.E2E_CONTROL_PLANE_SECRET || 'e2e-control-plane-secret'

function signedHeaders(body: string, licenseKey: string, timestamp = Date.now().toString()) {
  return {
    'content-type': 'application/json',
    'x-license-key': licenseKey,
    'x-request-timestamp': timestamp,
    'x-signature': createHmac('sha256', secret)
      .update(`${timestamp}:${body}`)
      .digest('hex'),
  }
}

test.describe('control-plane authentication', () => {
  test('requires a license identity in addition to the HMAC', async ({ request }) => {
    const body = JSON.stringify({})
    const timestamp = Date.now().toString()
    const response = await request.post('/api/v1/instances/register', {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-request-timestamp': timestamp,
        'x-signature': createHmac('sha256', secret)
          .update(`${timestamp}:${body}`)
          .digest('hex'),
      },
    })

    expect(response.status()).toBe(401)
  })

  test('rejects invalid and expired signatures', async ({ request }) => {
    const body = JSON.stringify({})
    const invalid = await request.post('/api/v1/instances/register', {
      data: body,
      headers: {
        ...signedHeaders(body, 'license-a'),
        'x-signature': '0'.repeat(64),
      },
    })
    expect(invalid.status()).toBe(401)

    const expiredTimestamp = (Date.now() - 10 * 60 * 1000).toString()
    const expired = await request.post('/api/v1/instances/register', {
      data: body,
      headers: signedHeaders(body, 'license-a', expiredTimestamp),
    })
    expect(expired.status()).toBe(401)
  })

  test('rejects a registration body for a different license', async ({ request }) => {
    const body = JSON.stringify({
      instanceId: 'ed0f1855-750d-4ac1-ac9c-46aa56783da8',
      tenantId: '6b235425-5f26-4ca7-8c30-095cab013607',
      instanceUrl: 'https://tenant.example.test',
      licenseKey: 'license-in-body',
    })
    const response = await request.post('/api/v1/instances/register', {
      data: body,
      headers: signedHeaders(body, 'different-license'),
    })

    expect(response.status()).toBe(401)
    expect(await response.json()).toMatchObject({
      error: 'License identity mismatch',
    })
  })
})
