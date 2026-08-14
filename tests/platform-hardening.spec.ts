import { expect, test } from '@playwright/test'

test.describe('platform hardening', () => {
  test('liveness and readiness endpoints are non-cacheable', async ({ request }) => {
    const health = await request.get('/api/health')
    expect(health.status()).toBe(200)
    expect(health.headers()['cache-control']).toContain('no-store')
    expect(await health.json()).toMatchObject({
      status: 'ok',
      service: 'website-master-wmp',
    })

    const ready = await request.get('/api/ready')
    expect(ready.status()).toBe(200)
    expect(ready.headers()['cache-control']).toContain('no-store')
    expect(await ready.json()).toMatchObject({
      status: 'ready',
      service: 'website-master-wmp',
    })
  })

  test('locale negotiation honors quality values', async ({ request }) => {
    const response = await request.get('/', {
      headers: {
        'accept-language': 'en;q=0.2, id-ID;q=0.9',
      },
      maxRedirects: 0,
    })

    expect(response.status()).toBeGreaterThanOrEqual(300)
    expect(response.status()).toBeLessThan(400)
    expect(response.headers().location).toContain('/id')
  })

  test('DOKU webhook rejects unsupported content types before protocol handling', async ({ request }) => {
    const response = await request.post('/api/webhook/doku', {
      headers: {
        'content-type': 'text/plain',
      },
      data: 'not-json',
    })

    expect(response.status()).toBe(415)
    expect(await response.json()).toEqual({
      error: 'Unsupported media type',
    })
  })
})
