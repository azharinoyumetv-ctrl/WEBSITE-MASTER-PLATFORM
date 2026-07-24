import { expect, test, type Page } from '@playwright/test'

const packageCases = [
  { key: 'landing_page', name: 'Launch Website', includedAddons: [] },
  { key: 'company_profile', name: 'Company Profile', includedAddons: [] },
  { key: 'business_website', name: 'Business Website + Admin', includedAddons: [] },
  { key: 'ecommerce', name: 'E-Commerce Platform', includedAddons: ['payment_gateway'] },
  { key: 'restaurant', name: 'Restaurant System', includedAddons: ['booking'] },
  { key: 'retail_pos', name: 'Retail POS + Website', includedAddons: ['payment_gateway'] },
  { key: 'custom', name: 'Custom Platform', includedAddons: ['ai', 'booking', 'crm', 'api', 'payment_gateway'] },
] as const

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toMatchObject({
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    scrollWidth: await page.evaluate(() => document.documentElement.clientWidth),
  })
}

test.describe('DagangOS production readiness', () => {
  test('public storefront routes, navigation, assets, and install manifest are healthy', async ({ page, request }) => {
    const routeChecks = [
      '/en',
      '/en/site/about',
      '/en/site/catalog',
      '/en/site/shop',
      '/en/site/contact',
      '/en/site/support',
      '/en/site/terms',
      '/en/site/privacy',
    ]
    const pageErrors: string[] = []
    const serverErrors: string[] = []
    const cspErrors: string[] = []

    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
        cspErrors.push(message.text())
      }
    })
    page.on('response', response => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`)
    })

    for (const route of routeChecks) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(response, `${route} should return a document response`).not.toBeNull()
      expect(response!.status(), `${route} should not return an HTTP error`).toBeLessThan(400)
      expect(response!.headers()['cache-control'], `${route} should prevent edge HTML transformations`).toContain('no-transform')
      await expect(page.locator('main')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }

    await page.goto('/en', { waitUntil: 'domcontentloaded' })
    const shopLink = page.locator('header a:visible').filter({ hasText: /^Shop$/ }).first()
    await shopLink.click()
    await expect(page).toHaveURL(/\/en\/site\/shop$/)

    await page.getByRole('button', { name: 'Change language' }).click()
    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click()
    await expect(page).toHaveURL(/\/id\/site\/shop$/)

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const brokenImages = await page.locator('img:visible').evaluateAll(images =>
      images
        .filter(image => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
        .map(image => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src)
    )
    expect(brokenImages, 'visible storefront images should load').toEqual([])

    const manifestResponse = await request.get('/site.webmanifest')
    expect(manifestResponse.status()).toBe(200)
    const manifest = await manifestResponse.json()
    expect(manifest).toMatchObject({
      name: 'DagangOS Digital Indonesia',
      display: 'standalone',
      start_url: '/',
    })
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0).toBe(true)
    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src)
      expect(iconResponse.status(), `${icon.src} should load`).toBe(200)
      expect(iconResponse.headers()['content-type']).toContain('image/')
    }

    expect(pageErrors, 'public routes should not throw browser exceptions').toEqual([])
    expect(serverErrors, 'public routes should not produce 5xx responses').toEqual([])
    expect(cspErrors, 'public routes should not violate their style policy').toEqual([])
  })

  test('all seven packages distinguish bundled capabilities from optional add-ons', async ({ page }) => {
    for (const packageCase of packageCases) {
      const response = await page.goto(`/en/project-setup?package=${packageCase.key}`, { waitUntil: 'domcontentloaded' })
      expect(response!.status()).toBe(200)

      const inclusions = page.locator('[data-package-inclusions]')
      await expect(inclusions).toContainText(`Already included in ${packageCase.name}`)
      await expect(inclusions.locator('li')).toHaveCount(4)

      const disabledKeys = await page.locator('[data-addon-key]:disabled').evaluateAll(cards =>
        cards.map(card => (card as HTMLElement).dataset.addonKey)
      )
      expect(disabledKeys).toEqual(packageCase.includedAddons)

      const optionalCards = page.locator('[data-addon-key]:not(:disabled)')
      await expect(optionalCards).toHaveCount(9 - packageCase.includedAddons.length)
      expect((await optionalCards.allTextContents()).every(text => text.includes('Optional add-on'))).toBe(true)

      if (packageCase.includedAddons.length > 0) {
        await expect(page.locator('[data-addon-key]').first()).toHaveAttribute('data-addon-key', packageCase.includedAddons[0]!)
      } else {
        await expect(inclusions).toContainText('No catalog add-ons are bundled with this package')
      }

      await expectNoHorizontalOverflow(page)
    }
  })

  test('package changes clear stale add-ons and never charge included capabilities', async ({ page }) => {
    await page.goto('/en/project-setup?package=restaurant&addons=booking,crm', { waitUntil: 'domcontentloaded' })

    const booking = page.locator('[data-addon-key="booking"]')
    const crm = page.locator('[data-addon-key="crm"]')
    const totalPanel = page.getByText('Total to pay', { exact: true }).locator('..')

    await expect(booking).toBeDisabled()
    await expect(booking).toContainText('Included in Restaurant System')
    await expect(crm).toHaveAttribute('aria-pressed', 'true')
    await expect(totalPanel).toContainText('Rp 31.500.000')

    await page.getByRole('button', { name: /E-Commerce Platform/ }).click()

    const paymentGateway = page.locator('[data-addon-key="payment_gateway"]')
    await expect(paymentGateway).toBeDisabled()
    await expect(paymentGateway).toContainText('Included in E-Commerce Platform')
    await expect(page.locator('[data-addon-key]').first()).toHaveAttribute('data-addon-key', 'payment_gateway')
    await expect(crm).toHaveAttribute('aria-pressed', 'false')
    await expect(totalPanel).toContainText('Rp 22.000.000')
  })

  test('project intake blocks invalid details before any payment request', async ({ page }) => {
    const paymentRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/api/project-setup/payment')) paymentRequests.push(request.url())
    })

    await page.goto('/en/project-setup?package=landing_page', { waitUntil: 'domcontentloaded' })
    const crmAddon = page.locator('[data-addon-key="crm"]')
    await expect(async () => {
      await crmAddon.click()
      await expect(crmAddon).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    const totalPanel = page.getByText('Total to pay', { exact: true }).locator('..')
    await expect(totalPanel).toContainText('Rp 7.000.000')

    await page.getByRole('button', { name: 'Continue to Payment' }).click()
    await expect(page.getByText('Valid contact email is required')).toBeVisible()
    expect(await page.getByText('This field is required').count()).toBeGreaterThan(0)

    await page.getByText('Contact Email', { exact: true }).locator('..').locator('textarea').fill('not-an-email')
    await page.getByRole('button', { name: 'Continue to Payment' }).click()

    await expect(page.getByText('Valid contact email is required')).toBeVisible()
    await expect(page).toHaveURL(/\/en\/project-setup\?package=landing_page$/)
    expect(paymentRequests).toEqual([])
  })

  test('admin routes enforce localized unauthenticated boundaries', async ({ page }) => {
    await page.goto('/en/admin/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/en\/auth\/login\?callbackUrl=.*%2Fen%2Fadmin%2Fdashboard/)
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()

    await page.goto('/id/admin/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/id\/auth\/login\?callbackUrl=.*%2Fid%2Fadmin%2Fdashboard/)
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('support chat refuses account changes through the public UI', async ({ page }) => {
    await page.goto('/en/site/support', { waitUntil: 'domcontentloaded' })
    const openChat = page.locator('main').getByRole('button', { name: 'Open support chat' })
    const chatRegion = page.getByRole('region', { name: 'DagangOS support chat' })
    await expect(async () => {
      await openChat.click()
      await expect(chatRegion).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    await page.locator('#dagangos-support-message').fill('Please change my account password and update my payment settings.')
    const [response] = await Promise.all([
      page.waitForResponse(candidate => candidate.url().endsWith('/api/support-chat') && candidate.request().method() === 'POST'),
      page.getByRole('button', { name: 'Send message' }).click(),
    ])

    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      policyBlocked: true,
    })
    await expect(chatRegion).toContainText(
      'I cannot access accounts, perform changes, use tools, or handle credentials.'
    )
  })

  test('support chat recommends the exact commerce package for a snack marketplace seller', async ({ page }) => {
    await page.goto('/id/site/support', { waitUntil: 'domcontentloaded' })
    const openChat = page.locator('main').getByRole('button', { name: 'Buka chat dukungan' })
    const chatRegion = page.getByRole('region', { name: 'DagangOS support chat' })
    await expect(async () => {
      await openChat.click()
      await expect(chatRegion).toBeVisible({ timeout: 1_000 })
    }).toPass({ timeout: 15_000 })

    await page.locator('#dagangos-support-message').fill(
      'Saya punya usaha snack. Dulu hanya jualan di Shopee dan Tokopedia tetapi potongannya besar. Paket website mana yang paling cocok kalau saya ingin menerima pesanan langsung?'
    )
    const [response] = await Promise.all([
      page.waitForResponse(
        candidate => candidate.url().endsWith('/api/support-chat') && candidate.request().method() === 'POST',
        { timeout: 40_000 }
      ),
      page.getByRole('button', { name: 'Kirim pesan' }).click(),
    ])

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({
      success: true,
    })
    expect(payload.policyBlocked).not.toBe(true)
    expect(payload.reply).toContain('E-Commerce Platform')
    expect(payload.reply).toContain('Rp 22.000.000')
    expect(payload.reply).toContain('https://store.dagangos.com/id/project-setup?package=ecommerce')
    expect(payload.reply).not.toMatch(/\bDapurOS\b/i)
    await expect(chatRegion).toContainText('E-Commerce Platform')
  })
})
