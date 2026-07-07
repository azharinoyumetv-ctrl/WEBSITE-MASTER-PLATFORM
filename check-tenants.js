const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.systemTenant.findMany({ select: { subdomain: true, customDomain: true, companyName: true } });
  console.log(JSON.stringify(tenants, null, 2));
}
main().finally(() => prisma.$disconnect());
