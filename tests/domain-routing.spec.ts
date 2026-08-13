import { expect, test } from '@playwright/test'

const reservedNonWmpHosts = ['store.dagangos.com', 'shop.dagangos.com'] as const

for (const host of reservedNonWmpHosts) {
  test(`${host} does not redirect login into WMP`, async ({ request }) => {
    const response = await request.get('/id/auth/login?callbackUrl=%2Fid%2Fadmin%2Fdashboard', {
      headers: { host },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(404)
    expect(response.headers()['location']).toBeUndefined()
  })

  test(`${host} does not render or redirect WMP public pages`, async ({ request }) => {
    const response = await request.get('/id/project-setup?package=ecommerce', {
      headers: { host },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(404)
    expect(response.headers()['location']).toBeUndefined()
  })
}
