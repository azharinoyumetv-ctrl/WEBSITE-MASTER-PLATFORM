# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.ts >> Website Master Platform E2E Audit >> 01. Authentication & Login Flow
- Location: tests\e2e.spec.ts:11:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 50000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/admin/dashboard" until "load"
  navigated to "http://localhost:4000/en/auth/login"
  navigated to "http://localhost:4000/en/auth/login?callbackUrl=http%3A%2F%2Flocalhost%3A4000%2Fadmin%2Fdashboard"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - img [ref=e6]
        - generic [ref=e9]:
          - paragraph [ref=e10]: DagangOS
          - paragraph [ref=e11]: Digital Indonesia
      - generic [ref=e12]:
        - heading "Build websites at scale" [level=1] [ref=e13]:
          - text: Build websites
          - text: at scale
        - paragraph [ref=e14]: Enterprise-grade multi-tenant platform powering SMEs and enterprises across 15 integrated modules — from catalog to CRM.
        - generic [ref=e15]:
          - generic [ref=e16]:
            - img [ref=e17]
            - text: Multi-tenant with PostgreSQL RLS isolation
          - generic [ref=e20]:
            - img [ref=e21]
            - text: JWT Ed25519 + Argon2id security
          - generic [ref=e24]:
            - img [ref=e25]
            - text: 15 fully integrated business modules
          - generic [ref=e28]:
            - img [ref=e29]
            - text: Real-time theming with CSS variable injection
      - generic [ref=e32]:
        - paragraph [ref=e33]: "\"This platform transformed how we deliver websites to our clients. What used to take weeks now takes hours.\""
        - generic [ref=e34]:
          - generic [ref=e35]: FA
          - generic [ref=e36]:
            - paragraph [ref=e37]: Azhari
            - paragraph [ref=e38]: Founder, DagangOS Digital Indonesia
    - generic [ref=e40]:
      - generic [ref=e41]:
        - img [ref=e43]
        - paragraph [ref=e46]: DagangOS
      - generic [ref=e47]:
        - heading "Welcome back" [level=2] [ref=e48]
        - paragraph [ref=e49]: Sign in to your tenant workspace
      - generic [ref=e50]:
        - generic [ref=e51]:
          - text: Email address
          - generic [ref=e52]:
            - img [ref=e53]
            - textbox "name@company.com" [ref=e56]: admin@dagangos.com
        - generic [ref=e57]:
          - generic [ref=e58]:
            - text: Password
            - link "Forgot password?" [ref=e59] [cursor=pointer]:
              - /url: /auth/forgot-password
          - generic [ref=e60]:
            - img [ref=e61]
            - textbox "••••••••" [ref=e64]: password123
            - button [ref=e65]:
              - img [ref=e66]
        - generic [ref=e69]:
          - paragraph [ref=e70]: "Demo credentials:"
          - paragraph [ref=e71]: "Email: admin@dagangos.com"
          - paragraph [ref=e72]: "Password: password123"
        - button "Sign in to workspace" [ref=e73]
      - paragraph [ref=e74]:
        - text: Need an account?
        - link "Request access" [ref=e75] [cursor=pointer]:
          - /url: /auth/register
      - paragraph [ref=e77]: Protected by Ed25519 JWT + Argon2id · AES-256 at rest · TLS 1.3
  - alert [ref=e78]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { execSync } from 'child_process';
  3   | 
  4   | test.beforeAll(async () => {
  5   |   console.log('Seeding database for Playwright tests...');
  6   |   execSync('node prisma/seed-test.js', { stdio: 'inherit' });
  7   | });
  8   | 
  9   | test.describe('Website Master Platform E2E Audit', () => {
  10  | 
  11  |   test('01. Authentication & Login Flow', async ({ page }) => {
  12  |     test.setTimeout(60000) // Extended for first-run compilation warmup
  13  |     await page.goto('/auth/login');
  14  |     await expect(page).toHaveTitle(/Website Master Platform/i);
  15  | 
  16  |     await page.fill('#email', 'admin@dagangos.com');
  17  |     await page.fill('#password', 'password123');
  18  |     await page.click('#login-submit');
  19  | 
> 20  |     await page.waitForURL('**/admin/dashboard', { timeout: 50000 });
      |                ^ TimeoutError: page.waitForURL: Timeout 50000ms exceeded.
  21  |     await expect(page.locator('h1')).toContainText(/Dashboard/i);
  22  |   });
  23  | 
  24  |   test('02. Admin Settings & Tenant Branding', async ({ page }) => {
  25  |     await page.goto('/auth/login');
  26  |     await page.fill('#email', 'admin@dagangos.com');
  27  |     await page.fill('#password', 'password123');
  28  |     await page.click('#login-submit');
  29  |     await page.waitForURL('**/admin/dashboard');
  30  | 
  31  |     await page.goto('/admin/settings');
  32  |     await expect(page.locator('h1')).toContainText(/Settings/i);
  33  | 
  34  |     await page.click('text=Brand & Theme');
  35  | 
  36  |     const input = page.locator('label:has-text("Site Title (SEO)") + input');
  37  |     await input.fill('DagangOS E2E Audited Store');
  38  |     await page.click('text=Save Changes');
  39  |     await page.waitForTimeout(1000);
  40  | 
  41  |     await page.reload();
  42  |     await page.click('text=Brand & Theme');
  43  |     await expect(page.locator('label:has-text("Site Title (SEO)") + input')).toHaveValue('DagangOS E2E Audited Store');
  44  |   });
  45  | 
  46  |   test('03. User Management & Team Invitations', async ({ page }) => {
  47  |     await page.goto('/auth/login');
  48  |     await page.fill('#email', 'admin@dagangos.com');
  49  |     await page.fill('#password', 'password123');
  50  |     await page.click('#login-submit');
  51  |     await page.waitForURL('**/admin/dashboard');
  52  | 
  53  |     await page.goto('/admin/users');
  54  |     await expect(page.locator('h1')).toContainText(/Users/i);
  55  | 
  56  |     await page.click('text=Invite User');
  57  |     await page.fill('#invite-email', 'new-member@dagangos.com');
  58  |     await page.selectOption('#invite-role', { index: 0 }); // Role ID from DB
  59  |     await page.click('#send-invite-btn');
  60  | 
  61  |     await expect(page.locator('#invite-email')).toBeHidden();
  62  |   });
  63  | 
  64  |   test('04. RBAC Permission Boundaries', async ({ page }) => {
  65  |     await page.goto('/auth/login');
  66  |     await page.fill('#email', 'admin@dagangos.com');
  67  |     await page.fill('#password', 'password123');
  68  |     await page.click('#login-submit');
  69  |     await page.waitForURL('**/admin/dashboard');
  70  | 
  71  |     await page.goto('/admin/rbac');
  72  |     await expect(page.locator('h1')).toContainText(/Access Control/i);
  73  | 
  74  |     await page.click('text=Create Role');
  75  |     await page.fill('input[placeholder="e.g. Finance Manager"]', 'Auditor');
  76  |     await page.fill('textarea[placeholder="What can this role do?"]', 'Read only auditor role');
  77  |     
  78  |     // Click the submit button specifically inside the open modal
  79  |     await page.click('.fixed button:has-text("Create Role")');
  80  | 
  81  |     await expect(page.locator('#role-auditor')).toContainText('Auditor');
  82  |   });
  83  | 
  84  |   test('05. Catalog & Product Operations', async ({ page }) => {
  85  |     await page.goto('/auth/login');
  86  |     await page.fill('#email', 'admin@dagangos.com');
  87  |     await page.fill('#password', 'password123');
  88  |     await page.click('#login-submit');
  89  |     await page.waitForURL('**/admin/dashboard');
  90  | 
  91  |     await page.goto('/admin/catalog');
  92  |     await expect(page.locator('h1')).toContainText(/Catalog/i);
  93  | 
  94  |     await page.click('text=Add Product');
  95  |     await page.fill('input[placeholder="e.g. Pro Running Shoe"]', 'E2E Testing Phone');
  96  |     await page.fill('input[placeholder="APX-001"]', 'E2E-PHONE-001');
  97  |     await page.fill('input[placeholder="0.00"]', '999.99');
  98  |     await page.selectOption('select', { label: 'Electronics' });
  99  |     await page.click('button:has-text("Save Product")');
  100 | 
  101 |     await expect(page.locator('.card-hover')).toContainText('E2E Testing Phone');
  102 |   });
  103 | 
  104 |   test('06. E-Commerce & Order Management', async ({ page }) => {
  105 |     await page.goto('/auth/login');
  106 |     await page.fill('#email', 'admin@dagangos.com');
  107 |     await page.fill('#password', 'password123');
  108 |     await page.click('#login-submit');
  109 |     await page.waitForURL('**/admin/dashboard');
  110 | 
  111 |     await page.goto('/admin/ecommerce');
  112 |     await expect(page.locator('h1')).toContainText(/E-commerce/i);
  113 | 
  114 |     // Verify seeded order from customer@gmail.com is listed
  115 |     await expect(page.locator('table')).toContainText('customer@gmail.com');
  116 |   });
  117 | 
  118 |   test('07. Payments & Billing Ledger', async ({ page }) => {
  119 |     await page.goto('/auth/login');
  120 |     await page.fill('#email', 'admin@dagangos.com');
```