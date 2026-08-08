import { expect, test } from '@playwright/test'
import { getTenantPublicUrl } from '../lib/tenant-url'

test('the default tenant uses the root storefront domain', () => {
  expect(getTenantPublicUrl({ subdomain: 'default' }, 'wmp.dagangos.com'))
    .toBe('https://wmp.dagangos.com')
})

test('tenant subdomains are generated below the configured WMP domain', () => {
  expect(getTenantPublicUrl({ subdomain: 'northwind' }, 'wmp.dagangos.com'))
    .toBe('https://northwind.wmp.dagangos.com')
})

test('custom tenant domains take precedence over tenant subdomains', () => {
  expect(getTenantPublicUrl({ subdomain: 'northwind', customDomain: 'shop.northwind.id' }, 'wmp.dagangos.com'))
    .toBe('https://shop.northwind.id')
})
