require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const defaultTenant = await prisma.systemTenant.findFirst({
    where: { subdomain: 'default' }
  })

  if (defaultTenant) {
    console.log('Default tenant already exists.')
    return
  }

  const dagangos = await prisma.systemTenant.findFirst({
    where: { subdomain: 'dagangos' },
    include: { website: true }
  })

  if (!dagangos) {
    console.log('No dagangos tenant found to duplicate.')
    return
  }

  // Create default tenant
  const tenant = await prisma.systemTenant.create({
    data: {
      companyName: 'Master Platform Default',
      subdomain: 'default',
      status: 'active',
      plan: 'enterprise'
    }
  })

  if (dagangos.website) {
    await prisma.tenantWebsite.create({
      data: {
        tenantId: tenant.id,
        siteTitle: 'Website Master Platform',
        themeConfig: dagangos.website.themeConfig,
        globalSeoMetadata: dagangos.website.globalSeoMetadata,
        isActive: true
      }
    })
  }

  // Duplicate pages
  const pages = await prisma.tenantPage.findMany({
    where: { tenantId: dagangos.id }
  })

  for (const p of pages) {
    await prisma.tenantPage.create({
      data: {
        tenantId: tenant.id,
        title: p.title,
        slug: p.slug,
        layoutBlocks: p.layoutBlocks,
        seoMetadata: p.seoMetadata,
        isPublished: true
      }
    })
  }

  // Also duplicate catalog
  const catalog = await prisma.tenantCategory.findMany({
    where: { tenantId: dagangos.id }
  })

  for (const c of catalog) {
    await prisma.tenantCategory.create({
      data: {
        tenantId: tenant.id,
        name: c.name,
        slug: c.slug
      }
    })
  }

  console.log('Successfully seeded default tenant!')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
