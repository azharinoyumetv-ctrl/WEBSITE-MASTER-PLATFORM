import prisma from './lib/prisma';
async function test() {
  await prisma.tenantAnalyticsDailySummary.upsert({
    where: { tenantId_summaryDate_metricKey: { tenantId: '1', summaryDate: new Date(), metricKey: 'pageViews' } },
    update: { metricValue: 10 },
    create: { tenantId: '1', summaryDate: new Date(), metricKey: 'pageViews', metricValue: 10 }
  });
}
