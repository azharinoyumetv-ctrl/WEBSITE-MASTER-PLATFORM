require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set in environment variables.')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding test database...')

  const testSubdomain = 'dagangos'
  
  const existingTenant = await prisma.systemTenant.findFirst({
    where: { subdomain: testSubdomain }
  })

  if (existingTenant) {
    await prisma.systemTenant.delete({
      where: { id: existingTenant.id }
    })
    console.log('Cleaned up previous test tenant.')
  }

  // 1. Create System Tenant — DagangOS Digital Indonesia
  const tenant = await prisma.systemTenant.create({
    data: {
      companyName: 'DagangOS Digital Indonesia',
      subdomain: testSubdomain,
      status: 'active',
      plan: 'enterprise'
    }
  })

  // 2. Create Password Hash
  const passwordHash = await bcrypt.hash('password123', 10)

  // 3. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@dagangos.com',
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'DagangOS',
      status: 'active'
    }
  })

  // 4. Create Auth Credential (secondary auth path)
  await prisma.tenantAuthCredential.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      passwordHash: passwordHash
    }
  })

  // 5. Create Admin Role
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Super Administrator',
      permissions: {
        system: ['read', 'write'],
        catalog: ['read', 'write', 'delete'],
        website: ['read', 'write'],
        settings: ['read', 'write'],
        orders: ['read', 'write'],
        payments: ['read', 'write'],
        inventory: ['read', 'write'],
        pos: ['read', 'write'],
        crm: ['read', 'write'],
        booking: ['read', 'write']
      }
    }
  })

  // 6. Map User to Role
  await prisma.tenantUserRole.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      roleId: adminRole.id
    }
  })

  // 7. Create Website Config
  await prisma.tenantWebsite.create({
    data: {
      tenantId: tenant.id,
      siteTitle: 'DagangOS Digital Indonesia',
      themeConfig: {
        colors: {
          primary: '#4f46e5',
          secondary: '#10b981',
          background: '#ffffff',
          text: '#111827'
        },
        typography: {
          base_font: 'Inter',
          headings: 'Geist'
        }
      },
      globalSeoMetadata: {
        description: 'Empowering Indonesian businesses with enterprise-grade digital commerce solutions.',
        keywords: ['digital commerce', 'e-commerce', 'Indonesia', 'DagangOS', 'platform']
      },
      isActive: true
    }
  })

  // 7.5 Create CMS Pages for standard public routes
  const cmsPages = [
    {
      slug: 'about',
      title: 'About DagangOS Digital Indonesia',
      layoutBlocks: [
        {
          type: 'hero',
          data: {
            heading: 'About DagangOS Digital Indonesia',
            subheading: 'Empowering Indonesian businesses to thrive in the digital economy.',
          }
        },
        {
          type: 'features',
          data: {
            items: [
              { title: 'Our Mission', description: 'We build world-class digital tools for Indonesian businesses.' },
              { title: 'Our Vision', description: 'To lead Indonesia\'s digital transformation and commerce ecosystem.' },
              { title: 'Our Values', description: 'Integrity, innovation, and impact for every business we serve.' },
            ]
          }
        }
      ],
      seoMetadata: {
        description: 'Learn about DagangOS Digital Indonesia — our mission, vision, and team.',
        keywords: ['about', 'DagangOS', 'team', 'mission']
      }
    },
    {
      slug: 'contact',
      title: 'Contact Us',
      layoutBlocks: [
        {
          type: 'hero',
          data: {
            heading: 'Contact Us',
            subheading: 'Have questions? Our team is here to help. Reach out to us anytime.',
          }
        }
      ],
      seoMetadata: {
        description: 'Contact DagangOS Digital Indonesia — we\'d love to hear from you.',
        keywords: ['contact', 'support', 'DagangOS']
      }
    },
    {
      slug: 'products',
      title: 'Our Products',
      layoutBlocks: [
        {
          type: 'hero',
          data: {
            heading: 'Our Products',
            subheading: 'Discover our complete suite of digital business tools for Indonesian enterprises.',
            cta: 'Get Started Today'
          }
        },
        {
          type: 'features',
          data: {
            items: [
              { title: 'E-Commerce Platform', description: 'Full-featured online store with cart, checkout, and payment processing.' },
              { title: 'POS System', description: 'Point of sale system for retail and restaurant businesses.' },
              { title: 'CRM Module', description: 'Customer relationship management and analytics dashboard.' },
            ]
          }
        }
      ],
      seoMetadata: {
        description: 'Explore DagangOS Digital Indonesia products and modules.',
        keywords: ['products', 'e-commerce', 'POS', 'CRM', 'DagangOS']
      }
    },
    {
      slug: 'shop',
      title: 'Shop Now',
      layoutBlocks: [
        {
          type: 'hero',
          data: {
            heading: 'Shop Now',
            subheading: 'Browse our plans and modules to find the perfect solution for your business.',
            cta: 'View All Plans'
          }
        }
      ],
      seoMetadata: {
        description: 'Shop DagangOS Digital Indonesia plans and modules.',
        keywords: ['shop', 'plans', 'pricing', 'DagangOS']
      }
    }
  ]

  for (const pageData of cmsPages) {
    await prisma.tenantPage.create({
      data: {
        tenantId: tenant.id,
        title: pageData.title,
        slug: pageData.slug,
        layoutBlocks: pageData.layoutBlocks,
        seoMetadata: pageData.seoMetadata,
        isPublished: true
      }
    })
  }

  // 7.6 Create e2e-catalog page for playwright test
  await prisma.tenantPage.create({
    data: {
      tenantId: tenant.id,
      title: 'E2E Catalog Test Page',
      slug: 'e2e-catalog',
      layoutBlocks: [
        {
          type: 'hero',
          data: {
            heading: 'E2E Catalog',
            subheading: 'This page is used for automated end-to-end testing.'
          }
        }
      ],
      seoMetadata: { description: 'E2E test page' },
      isPublished: true
    }
  })

  // 7.7 Create System Feature Flags
  await prisma.systemFeatureFlag.upsert({
    where: { flagKey: 'beta-checkout' },
    update: {},
    create: {
      flagKey: 'beta-checkout',
      description: 'Enable new beta checkout experience',
      defaultState: false
    }
  })

  await prisma.systemFeatureFlag.upsert({
    where: { flagKey: 'ai-search' },
    update: {},
    create: {
      flagKey: 'ai-search',
      description: 'Enable AI-powered semantic search',
      defaultState: true
    }
  })

  // 8. Enable core modules in tenant_modules
  const modulesToEnable = [
    'ecommerce_module',
    'pos_module',
    'booking_module',
    'crm_module',
    'analytics_module',
    'api_module',
    'feature_flags_module'
  ]

  for (const modKey of modulesToEnable) {
    await prisma.tenantModule.create({
      data: {
        tenantId: tenant.id,
        moduleKey: modKey,
        isEnabled: true,
        activatedAt: new Date()
      }
    })
  }

  // 9. Seed Catalog Category & Products
  const category = await prisma.tenantCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Electronics',
      slug: 'electronics'
    }
  })

  // 10. Seed CRM Contact
  await prisma.tenantCrmContact.create({
    data: {
      tenantId: tenant.id,
      email: 'e2e-contact@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      tags: ['VIP']
    }
  })

  // 11. Seed Inventory Location
  await prisma.tenantInventoryLocation.create({
    data: {
      tenantId: tenant.id,
      locationName: 'E2E Warehouse',
      isActive: true
    }
  })

  // 12. Seed Booking Resource
  await prisma.tenantBookingResource.create({
    data: {
      tenantId: tenant.id,
      resourceName: 'Conference Room A',
      capacityPerSlot: 10,
      isActive: true
    }
  })

  // 13. Seed Order (for Ecommerce orders table test)
  await prisma.tenantOrder.create({
    data: {
      tenantId: tenant.id,
      guestEmail: 'customer@gmail.com',
      totalAmount: 150.00,
      orderStatus: 'pending'
    }
  })

  console.log('Seeding completed successfully!')
  console.log(`Test Tenant ID: ${tenant.id}`)
  console.log(`Test Admin: admin@dagangos.com / password123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
