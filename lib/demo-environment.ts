// Demo access is available only with its dedicated, local database and origin.
// Setting a flag alone on the production application cannot enable it.
export function isDemoEnvironment() {
  try {
    const database = new URL(process.env.DATABASE_URL || '')
    return process.env.DEMO_MODE === 'true'
      && ['postgres:', 'postgresql:'].includes(database.protocol)
      && database.hostname === '127.0.0.1'
      && database.port === '5432'
      && database.pathname === '/wmp_product_demo'
      && database.username === 'wmp_demo'
      && new URL(process.env.NEXTAUTH_URL || '').origin === 'https://demo.dagangos.com'
  } catch { return false }
}

export function isDemoHost(host: string) {
  return isDemoEnvironment() && host.split(':')[0].toLowerCase() === 'demo.dagangos.com'
}
