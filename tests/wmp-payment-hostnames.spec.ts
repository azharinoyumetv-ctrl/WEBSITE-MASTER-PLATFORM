import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  GET as handleDokuResultGet,
  POST as handleDokuResultPost,
} from '../app/api/webhook/doku/result/route'

test.describe('WMP payment callback hostnames', () => {
  test('DOKU result callbacks fall back to the canonical WMP hostname', async () => {
    const getResponse = await handleDokuResultGet(
      new Request('https://callback.invalid/api/webhook/doku/result?invoice_number=wmp-host-regression', {
        headers: { 'x-forwarded-proto': 'https' },
      }),
    )
    expect(getResponse.status).toBe(307)
    expect(getResponse.headers.get('location')).toBe(
      'https://wmp.dagangos.com/en/project-setup/confirmation?orderId=wmp-host-regression',
    )

    const postResponse = await handleDokuResultPost(
      new Request('https://callback.invalid/api/webhook/doku/result', {
        method: 'POST',
        headers: { 'x-forwarded-proto': 'https' },
      }),
    )
    expect(postResponse.status).toBe(307)
    expect(postResponse.headers.get('location')).toBe(
      'https://wmp.dagangos.com/en/project-setup/confirmation',
    )
  })

  test('DOKU result handler does not reference reserved product hostnames', async () => {
    const source = await readFile('app/api/webhook/doku/result/route.ts', 'utf8')
    expect(source).not.toMatch(/\b(?:store|shop)\.dagangos\.com\b/)
  })
})
