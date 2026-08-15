import { expect, test } from '@playwright/test'
import { isHostnameForTenant } from '../lib/wmp-domain'

const tenant = {
  id: 'tenant-uuid-123',
  subdomain: 'acme',
  customDomain: 'portal.acme.example',
}

test.describe('tenant hostname authorization', () => {
  test('accepts the tenant WMP subdomain', () => {
    expect(isHostnameForTenant('acme.wmp.dagangos.com', tenant)).toBe(true)
  })

  test('accepts the tenant custom domain', () => {
    expect(isHostnameForTenant('PORTAL.ACME.EXAMPLE:443', tenant)).toBe(true)
  })

  test('accepts local and legacy UUID tenant hosts', () => {
    expect(isHostnameForTenant('acme.localhost:3000', tenant)).toBe(true)
    expect(isHostnameForTenant('tenant-uuid-123.wmp.dagangos.com', tenant)).toBe(true)
  })

  test('keeps the requested locale when canonical checkout routes to project setup', async ({ page }) => {
    await page.goto('/id/checkout')
    await expect(page).toHaveURL(/\/id\/project-setup$/)
    await expect(page.getByRole('heading', { name: 'Start Your Project' })).toBeVisible()
  })

  test('rejects another tenant hostname and reserved product hosts', () => {
    expect(isHostnameForTenant('other.wmp.dagangos.com', tenant)).toBe(false)
    expect(isHostnameForTenant('store.dagangos.com', tenant)).toBe(false)
    expect(isHostnameForTenant('shop.dagangos.com', tenant)).toBe(false)
  })
})
