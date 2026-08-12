import { expect, test } from '@playwright/test'
import { getTenantPublicUrl } from '../lib/tenant-url'
import {
  DEFAULT_WMP_DOMAIN,
  getCanonicalWmpUrl,
  isLegacyWmpHostname,
} from '../lib/wmp-domain'

test('the default tenant uses the canonical WMP domain', () => {
  expect(getTenantPublicUrl({ subdomain: 'default' }, DEFAULT_WMP_DOMAIN))
    .toBe('https://wmp.dagangos.com')
})

test('custom tenant domains take precedence over tenant subdomains', () => {
  expect(getTenantPublicUrl({ subdomain: 'northwind', customDomain: 'shop.northwind.id' }, DEFAULT_WMP_DOMAIN))
    .toBe('https://shop.northwind.id')
})

test('legacy DagangOS WMP hostnames are recognized for canonical redirects', () => {
  expect(isLegacyWmpHostname('store.dagangos.com')).toBe(true)
  expect(isLegacyWmpHostname('shop.dagangos.com')).toBe(true)
  expect(isLegacyWmpHostname('wmp.dagangos.com')).toBe(false)
})

test('canonical WMP redirects preserve the requested path and query', () => {
  expect(getCanonicalWmpUrl('/id/auth/login', '?callbackUrl=%2Fid%2Fadmin%2Fdashboard').toString())
    .toBe('https://wmp.dagangos.com/id/auth/login?callbackUrl=%2Fid%2Fadmin%2Fdashboard')
})
