/*
 * Idempotently provisions the one public DagangOS storefront. This is not a
 * demo seed: it creates no sample users, products, orders, or credentials.
 *
 * Run only with the production DATABASE_URL loaded:
 *   node scripts/bootstrap-company-storefront.js
 */
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL must be set before bootstrapping the storefront.')
}

const pool = new Pool({ connectionString })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const moduleKeys = [
  'website_module', 'admin_module', 'user_management', 'rbac_module',
  'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module',
  'inventory_module', 'crm_module', 'booking_module', 'ai_module',
  'notification_module', 'analytics_module', 'api_module',
]

async function main() {
  const defaultDomain = 'store.dagangos.com'
  let tenant = await prisma.systemTenant.findFirst({
    where: { OR: [{ subdomain: 'default' }, { customDomain: defaultDomain }] },
  })

  if (!tenant) {
    tenant = await prisma.systemTenant.create({
      data: {
        companyName: 'DagangOS Digital Indonesia',
        subdomain: 'default',
        customDomain: defaultDomain,
        status: 'active',
        plan: 'enterprise',
      },
    })
    console.log('Created the DagangOS company tenant.')
  } else {
    tenant = await prisma.systemTenant.update({
      where: { id: tenant.id },
      data: {
        companyName: 'DagangOS Digital Indonesia',
        customDomain: defaultDomain,
        status: 'active',
      },
    })
    console.log('Reused the existing DagangOS company tenant.')
  }

  await prisma.tenantWebsite.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      siteTitle: 'DagangOS Digital Indonesia',
      isActive: true,
      themeConfig: {
        colors: { primary: '#0F172A', secondary: '#22C55E', background: '#FFFFFF', text: '#0F172A', accent: '#38BDF8' },
        typography: { headings: 'Inter', base_font: 'Inter' },
      },
      globalSeoMetadata: {
        title: 'DagangOS Digital Indonesia',
        description: 'Digital commerce, websites, and operational platforms for Indonesian businesses.',
        keywords: ['DagangOS', 'digital commerce', 'website platform', 'Indonesia'],
      },
    },
    update: {
      siteTitle: 'DagangOS Digital Indonesia',
      isActive: true,
      // Preserve an operator-customised theme and SEO configuration.
    },
  })

  await prisma.tenantModule.createMany({
    data: moduleKeys.map(moduleKey => ({ tenantId: tenant.id, moduleKey, isEnabled: true, configuredProperties: {} })),
    skipDuplicates: true,
  })

  console.log(`Storefront ready for ${tenant.companyName} (${tenant.id}).`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
