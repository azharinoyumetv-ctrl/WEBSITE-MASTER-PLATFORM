import { expect, test } from '@playwright/test'
import { getTenantPublicUrl } from '../lib/tenant-url'

test('the default tenant uses the root storefront domain', () => {
  expect(getTenantPublicUrl({ subdomain: 'default' }, 'store.dagangos.com'))
    .toBe('https://store.dagangos.com')
})

test('custom tenant domains take precedence over tenant subdomains', () => {
  expect(getTenantPublicUrl({ subdomain: 'northwind', customDomain: 'shop.northwind.id' }, 'store.dagangos.com'))
    .toBe('https://shop.northwind.id')
})
