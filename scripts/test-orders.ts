import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  console.log("Checking orders...");
  const orders = await prisma.tenantOrder.findMany({
    include: { tenant: true },
  });
  console.log(`Found ${orders.length} orders`);
  for (const o of orders) {
    console.log(`Order ${o.id} - Amount: ${o.totalAmount} - Tenant: ${o.tenantId} (${o.tenant?.subdomain})`);
  }

  const users = await prisma.user.findMany({
    where: { email: 'admin@dagangos.com' },
    include: { tenant: true },
  });
  console.log(`Found ${users.length} admin users`);
  for (const u of users) {
    console.log(`User ${u.email} - Tenant: ${u.tenantId} (${u.tenant?.subdomain})`);
  }
}

checkOrders().catch(console.error).finally(() => prisma.$disconnect());
