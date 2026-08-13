import { expect, test } from '@playwright/test'
import { getTenantPublicUrl } from '../lib/tenant-url'
import {
  DEFAULT_WMP_DOMAIN,
  isReservedNonWmpHostname,
} from '../lib/wmp-domain'

test('the default tenant uses the canonical WMP domain', () => {
  expect(getTenantPublicUrl({ subdomain: 'default' }, DEFAULT_WMP_DOMAIN))
    .toBe('https://wmp.dagangos.com')
})

test('custom tenant domains take precedence over tenant subdomains', () => {
  expect(getTenantPublicUrl({ subdomain: 'northwind', customDomain: 'shop.northwind.id' }, DEFAULT_WMP_DOMAIN))
    .toBe('https://shop.northwind.id')
})

test('store and shop DagangOS hostnames are reserved outside WMP', () => {
  expect(isReservedNonWmpHostname('store.dagangos.com')).toBe(true)
  expect(isReservedNonWmpHostname('shop.dagangos.com')).toBe(true)
  expect(isReservedNonWmpHostname('wmp.dagangos.com')).toBe(false)
})
