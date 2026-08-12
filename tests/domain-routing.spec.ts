import { expect, test } from '@playwright/test'

const legacyHosts = ['store.dagangos.com', 'shop.dagangos.com'] as const

for (const legacyHost of legacyHosts) {
  test(`${legacyHost} redirects login to the canonical WMP host`, async ({ request }) => {
    const response = await request.get('/id/auth/login?callbackUrl=%2Fid%2Fadmin%2Fdashboard', {
      headers: { host: legacyHost },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(
      'https://wmp.dagangos.com/id/auth/login?callbackUrl=%2Fid%2Fadmin%2Fdashboard',
    )
  })

  test(`${legacyHost} redirects public WMP pages without changing the path`, async ({ request }) => {
    const response = await request.get('/id/project-setup?package=ecommerce', {
      headers: { host: legacyHost },
      maxRedirects: 0,
    })

    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(
      'https://wmp.dagangos.com/id/project-setup?package=ecommerce',
    )
  })
}
