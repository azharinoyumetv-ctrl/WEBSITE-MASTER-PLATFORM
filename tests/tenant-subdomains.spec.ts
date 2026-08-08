import { expect, test } from '@playwright/test'
import { isReservedTenantSubdomain } from '../lib/tenant-subdomains'

test('platform and infrastructure hostnames cannot be assigned to tenants', () => {
  expect(isReservedTenantSubdomain('wmp')).toBe(true)
  expect(isReservedTenantSubdomain('STORE')).toBe(true)
  expect(isReservedTenantSubdomain('www')).toBe(true)
})

test('ordinary tenant slugs remain available', () => {
  expect(isReservedTenantSubdomain('northwind')).toBe(false)
})
