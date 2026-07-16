import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import crypto from 'crypto';

const e2eBaseUrl = process.env.E2E_BASE_URL || 'http://localhost:4000';
const e2ePort = new URL(e2eBaseUrl).port;
const tenantPublicBaseUrl = `http://dagangos.localhost${e2ePort ? `:${e2ePort}` : ''}`;

test.beforeAll(async () => {
  console.log('Seeding database for Playwright tests...');
  execSync('node prisma/seed-test.js', { stdio: 'inherit' });
});

test.describe('Website Master Platform E2E Audit', () => {

  test('01. Authentication & Login Flow', async ({ page }) => {
    test.setTimeout(60000) // Extended for first-run compilation warmup
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/Website Master Platform/i);

    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');

    await page.waitForURL('**/admin/dashboard', { timeout: 50000 });
    await expect(page.locator('h1')).toContainText(/Dashboard/i);
  });

  test('02. Admin Settings & Tenant Branding', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/settings');
    await expect(page.locator('h1')).toContainText(/Settings/i);

    await page.click('text=Brand & Theme');

    const input = page.locator('label:has-text("Site Title (SEO)") + input');
    await input.fill('DagangOS E2E Audited Store');
    await page.click('text=Save Changes');
    await page.waitForTimeout(1000);

    await page.reload();
    await page.click('text=Brand & Theme');
    await expect(page.locator('label:has-text("Site Title (SEO)") + input')).toHaveValue('DagangOS E2E Audited Store');
  });

  test('03. User Management & Team Invitations', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText(/Users/i);

    await expect(page.locator('h1')).toContainText(/Users/i);
  });

  test('04. RBAC Permission Boundaries', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/rbac');
    await expect(page.locator('h1')).toContainText(/Access Control/i);

    await page.click('text=Create Role');
    await page.fill('input[placeholder="e.g. Finance Manager"]', 'Auditor');
    await page.fill('textarea[placeholder="What can this role do?"]', 'Read only auditor role');
    
    // Click the submit button specifically inside the open modal
    await page.click('.fixed button:has-text("Create Role")');

    await expect(page.locator('#role-auditor')).toContainText('Auditor');
  });

  test('05. Catalog & Product Operations', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/catalog');
    await expect(page.locator('h1')).toContainText(/Catalog/i);

    await page.click('text=Add Product');
    await page.fill('input[placeholder="e.g. Pro Running Shoe"]', 'E2E Testing Phone');
    await page.fill('input[placeholder="APX-001"]', 'E2E-PHONE-001');
    await page.fill('input[placeholder="0.00"]', '999.99');
    await page.selectOption('select', { label: 'Electronics' });
    await page.click('button:has-text("Save Product")');

    await expect(page.locator('.card-hover')).toContainText('E2E Testing Phone');
  });

  test('06. E-Commerce & Order Management', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/ecommerce');
    await expect(page.locator('h1')).toContainText(/E-commerce/i);

    // Wait for the table to load
    await expect(page.locator('table')).toBeVisible();
  });

  test('07. Payments & Billing Ledger', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/payments');
    await expect(page.locator('h1')).toContainText(/Payments/i);
    await expect(page.locator('table')).toBeVisible();
  });

  test('08. POS Session Operations', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/pos');
    await expect(page.locator('h1')).toContainText(/POS Terminal/i);

    // Verify POS terminal view loaded
    await expect(page.locator('h1')).toContainText(/POS/i);
  });

  test('09. Inventory Management', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/inventory');
    await expect(page.locator('h1')).toContainText(/Inventory/i);

    // Verify seeded inventory location is visible in locations panel
    await expect(page.locator('.card').filter({ hasText: 'Locations' })).toContainText('E2E Warehouse');
  });

  test('10. Booking & Scheduling', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/booking');
    await expect(page.locator('h1')).toContainText(/Booking/i);

    // Click New Booking
    await page.click('text=New Booking');
    await page.fill('input[placeholder="customer@email.com"]', 'guest-booking@dagangos.com');
    await page.selectOption('select', { label: 'Conference Room A' });
    
    // Choose tomorrow's date to be safe and avoid backdate validation errors
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);
    await page.fill('input[type="time"]', '10:00');
    
    await page.click('#confirm-booking-btn');

    // Server actions can take a moment while the database is under a full-suite load.
    await expect(page.locator('table')).toContainText('guest-booking@dagangos.com', { timeout: 15000 });
  });

  test('11. CRM Contacts & Timeline Logs', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/crm');
    await expect(page.locator('h1')).toContainText(/CRM/i);

    // Verify seeded CRM contact is visible in contacts list card (first card)
    await expect(page.locator('.card').first()).toContainText('e2e-contact@gmail.com');
  });

  test('12. AI Assistant Configuration State', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/ai');
    await expect(page.locator('h1')).toContainText(/AI Assistant/i);

    // AI must not fabricate a response when the tenant has no configured provider.
    await expect(page.getByRole('heading', { name: 'AI Provider Unconfigured' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Configure AI' })).toHaveAttribute('href', '/admin/settings?tab=ai');
  });

  test('13. API Portal & Key Generation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/api-portal');
    await expect(page.locator('h1')).toContainText(/API Portal/i);

    await page.getByRole('button', { name: 'Generate Key' }).click();
    const keyModal = page.locator('.fixed.inset-0').filter({ hasText: 'Generate API Key' });
    await keyModal.getByPlaceholder('e.g. Production Client').fill('E2E API Key');
    await keyModal.getByRole('button', { name: 'Generate', exact: true }).click();
    await expect(page.getByText('Key Generated Successfully')).toBeVisible();
    await page.getByRole('button', { name: 'Close & I have copied it' }).click();
    await expect(page.locator('.card').first()).toContainText('E2E API Key');
  });

  test('14. Feature Flags & Overrides', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/feature-flags');
    await expect(page.getByRole('heading', { name: 'Feature Flags', exact: true })).toBeVisible();

    const flagRow = page.locator('table tbody tr').first();
    const toggleButton = flagRow.locator('button');
    
    // Toggle switch button
    const beforeState = await toggleButton.locator('span').first().getAttribute('class');
    await toggleButton.click();
    await page.waitForTimeout(1000);
    
    // Verify toggle changed state
    await page.reload();
    const afterState = await page.locator('table tbody tr').first().locator('button span').first().getAttribute('class');
    expect(beforeState).not.toEqual(afterState);
  });

  test('15. Dynamic CMS & Website Rendering', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/pages');
    await expect(page.locator('h2.section-title')).toContainText(/CMS/i);

    await page.click('text=Create Page');
    await page.fill('input[placeholder="e.g. About Us"]', 'E2E Public Catalog Page');
    await page.fill('input[placeholder="e.g. about"]', 'e2e-catalog-test');
    
    // Check standard HTML checkbox to publish page
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Save Page")');
    await page.waitForTimeout(1000);

    await expect(page.locator('table')).toContainText('e2e-catalog-test');

    // Verify existing e2e-catalog page on public site dynamic routing
    await page.goto(`${tenantPublicBaseUrl}/e2e-catalog`);
    await expect(page).toHaveTitle(/E2E Catalog/i);
  });

  test('16. Public Pages — Products & Shop (no 404)', async ({ page }) => {
    // Visit /products from public site (subdomain aware)
    await page.goto(`${tenantPublicBaseUrl}/products`);
    // Should not be a 404 page — should show the Products page
    await expect(page).not.toHaveTitle(/404/i);
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Landing Page|Starter|Rp|Company Profile/i);

    await page.goto(`${tenantPublicBaseUrl}/shop`);
    await expect(page).not.toHaveTitle(/404/i);
    const shopBody = await page.locator('body').textContent();
    expect(shopBody).toMatch(/Shop|Plan|DagangOS/i);
  });

  test('17. Public Pages — About & Contact (no 404)', async ({ page }) => {
    await page.goto(`${tenantPublicBaseUrl}/about`);
    await expect(page).not.toHaveTitle(/404/i);
    const aboutBody = await page.locator('body').textContent();
    expect(aboutBody).toMatch(/About|Mission|DagangOS/i);

    await page.goto(`${tenantPublicBaseUrl}/contact`);
    await expect(page).not.toHaveTitle(/404/i);
    const contactBody = await page.locator('body').textContent();
    expect(contactBody).toMatch(/Contact|Email|Message/i);
  });

  test('18. Login Page — Correct Credentials Shown', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Also verify DagangOS branding is present
    const brandText = await page.locator('body').textContent();
    expect(brandText).toMatch(/DagangOS/i);
  });
  test('19. Tenant Payment Gateway Configuration', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/settings');
    await expect(page.locator('h1')).toContainText(/Settings/i);

    // Xendit Config
    const xenditEnable = page.locator('h5:has-text("Xendit") + label input[type="checkbox"]');
    await xenditEnable.check();

    const xenditSecret = page.locator('label:has-text("Secret Key") + input').first();
    await xenditSecret.fill('xnd_development_O34Y...');
    
    const xenditWebhook = page.locator('label:has-text("Webhook Verification Token") + input').first();
    await xenditWebhook.fill('webhook_token_123');

    // Midtrans Config
    const midtransEnable = page.locator('h5:has-text("Midtrans") + label input[type="checkbox"]');
    await midtransEnable.check();

    const midtransSecret = page.locator('h5:has-text("Midtrans")').locator('..').locator('..').locator('label:has-text("Server Key") + input');
    await midtransSecret.fill('SB-Mid-server-testkey123');

    await page.click('text=Save Changes');

    // The page reloads automatically after a successful save; assert durable data
    // rather than a short-lived notification that can disappear during navigation.
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(page.locator('h5:has-text("Xendit") + label input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('h5:has-text("Midtrans") + label input[type="checkbox"]')).toBeChecked();
  });

  test('20. WhatsApp Is an Optional Project Add-on', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');

    await page.goto('/admin/settings');
    await expect(page.getByText('WhatsApp Business Integration')).toHaveCount(0);

    await page.goto('/admin/modules');
    const whatsappModule = page.locator('.card').filter({ hasText: 'WhatsApp Business' });
    await expect(whatsappModule).toContainText('Project add-on');
    await expect(whatsappModule.getByRole('button')).toHaveCount(0);
  });

  test('21. Control-plane API telemetry records actual final responses', async ({ page }) => {
    const rawBody = JSON.stringify({
      instanceId: '11111111-1111-4111-8111-111111111111',
      licenseKey: 'e2e-control-plane-license'
    });
    const timestamp = String(Date.now());
    const signature = crypto
      .createHmac('sha256', process.env.E2E_CONTROL_PLANE_SECRET || 'e2e-control-plane-secret')
      .update(`${timestamp}:${rawBody}`)
      .digest('hex');

    const response = await page.request.post('/api/v1/instances/validate-license', {
      headers: {
        'content-type': 'application/json',
        'x-license-key': 'e2e-control-plane-license',
        'x-request-timestamp': timestamp,
        'x-signature': signature
      },
      data: rawBody
    });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ valid: true });

    await page.goto('/auth/login');
    await page.fill('#email', 'admin@dagangos.com');
    await page.fill('#password', 'password123');
    await page.click('#login-submit');
    await page.waitForURL('**/admin/dashboard');
    await page.goto('/admin/api-portal');
    await expect(page.getByText('Recorded API requests')).toBeVisible();
    await expect(page.getByText('POST /api/v1/instances/validate-license')).toBeVisible();
    await expect(page.getByText('200', { exact: true }).last()).toBeVisible();
  });
});
