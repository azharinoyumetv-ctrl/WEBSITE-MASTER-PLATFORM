import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to reconcile production defaults.')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const orderStatuses = ['pending_requirements', 'quoted', 'awaiting_payment', 'pending_fulfillment']
const featureFlags = [
  ['project_setup_intake', 'Allow public visitors to submit Project Setup requests from the DagangOS storefront.'],
  ['public_support_chat', 'Allow visitors to use the scoped DagangOS Website Master to Hermes support-chat relay.'],
]

try {
  for (const status of orderStatuses) {
    await pool.query(`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS '${status}'`)
  }

  await pool.query(`ALTER TABLE "tenant_orders" ALTER COLUMN "currency" SET DEFAULT 'IDR'`)
  await pool.query(`ALTER TABLE "tenant_payments" ALTER COLUMN "currency" SET DEFAULT 'IDR'`)

  for (const [flagKey, description] of featureFlags) {
    await pool.query(
      `INSERT INTO "system_feature_flags" ("flag_key", "description", "default_state", "environment")
       VALUES ($1, $2, TRUE, 'production')
       ON CONFLICT ("flag_key") DO NOTHING`,
      [flagKey, description],
    )
  }

  console.log('Production defaults reconciled: OrderStatus values, IDR defaults, and live feature flags.')
} finally {
  await pool.end()
}
