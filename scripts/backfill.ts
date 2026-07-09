import { backfillAnalyticsSummaries } from '../lib/actions/analytics'

async function run() {
  console.log('Starting backfill...')
  const tenantId = 'fc3842a0-09ce-44ca-a8c9-4466ce85e348'
  const res = await backfillAnalyticsSummaries(tenantId, 7)
  console.log('Result:', res)
}

run()
