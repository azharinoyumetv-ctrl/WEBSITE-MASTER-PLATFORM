import 'dotenv/config';
import prisma from './lib/prisma';

async function run() {
  const catalog = await prisma.tenantCatalogItem.findMany();
  const pages = await prisma.tenantPage.findMany();
  console.log("CATALOG ITEMS:");
  console.log(JSON.stringify(catalog, null, 2));
  console.log("PAGES:");
  console.log(JSON.stringify(pages, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
