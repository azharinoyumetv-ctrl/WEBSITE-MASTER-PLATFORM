import prisma from '../lib/prisma'

async function main() {
  // 1. Find the master tenant (assumed to be the first one, or specific subdomain)
  const masterTenant = await prisma.systemTenant.findFirst({
    orderBy: { createdAt: 'asc' }
  })

  if (!masterTenant) {
    console.error('No tenants found.')
    process.exit(1)
  }

  console.log(`Using Master Tenant: ${masterTenant.companyName} (${masterTenant.id})`)

  // 2. Upsert the platform_owner role
  const role = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: masterTenant.id,
        name: 'platform_owner'
      }
    },
    update: {},
    create: {
      tenantId: masterTenant.id,
      name: 'platform_owner',
      description: 'Super Administrator for the entire SaaS platform'
    }
  })

  console.log(`Ensured platform_owner role exists (ID: ${role.id})`)

  // 3. Find the first user in the master tenant (assumed to be the platform owner)
  const adminUser = await prisma.user.findFirst({
    where: { tenantId: masterTenant.id },
    orderBy: { createdAt: 'asc' }
  })

  if (!adminUser) {
    console.error('No users found in master tenant.')
    process.exit(1)
  }

  console.log(`Found Admin User: ${adminUser.email} (${adminUser.id})`)

  // 4. Assign the role to the user
  await prisma.tenantUserRole.upsert({
    where: {
      tenantId_userId_roleId: {
        tenantId: masterTenant.id,
        userId: adminUser.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      tenantId: masterTenant.id,
      userId: adminUser.id,
      roleId: role.id
    }
  })

  console.log(`Successfully assigned platform_owner role to ${adminUser.email}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
