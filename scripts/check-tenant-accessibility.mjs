import pg from 'pg'

const { Client } = pg
const tenantBaseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN || 'dagangos.com'
const platformTenantSubdomain = process.env.PLATFORM_TENANT_SUBDOMAIN || 'dagangos'
const challenge = /Just a moment|cf-chl-|403 Forbidden/i
const jsOnlyShell = /You need to enable JavaScript to run this app/i
const agents = [
  ['browser', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127 Safari/537.36'],
  ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['Facebook', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'],
]

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

const database = new Client({ connectionString: process.env.DATABASE_URL })
await database.connect()
const result = await database.query(
  `select t.company_name, t.subdomain, t.custom_domain
     from system_tenants t
     join tenant_websites w on w.tenant_id = t.id
    where t.status = 'active'
      and w.is_active = true
      and t.subdomain <> $1
    order by t.created_at`,
  [platformTenantSubdomain],
)
await database.end()

if (result.rows.length === 0) {
  console.log('SKIP no non-platform tenant websites are currently active')
  process.exit(0)
}

for (const tenant of result.rows) {
  const hostname = tenant.custom_domain || `${tenant.subdomain}.${tenantBaseDomain}`
  const origin = `https://${hostname}`

  for (const [agentName, userAgent] of agents) {
    const response = await fetch(`${origin}/`, {
      redirect: 'manual',
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(30_000),
    })
    const body = await response.text()
    if (response.status !== 200 || response.headers.has('location')) {
      throw new Error(`${origin}/ returned ${response.status} with Location ${response.headers.get('location')} to ${agentName}`)
    }
    if (body.length < 500 || challenge.test(body) || jsOnlyShell.test(body) || !body.includes(tenant.company_name)) {
      throw new Error(`${origin}/ did not return usable server-rendered ${tenant.company_name} content to ${agentName}`)
    }
    console.log(`PASS tenant HTML ${origin}/ [${agentName}]`)
  }

  const robots = await fetch(`${origin}/robots.txt`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
  const robotsBody = await robots.text()
  if (robots.status !== 200 || !robotsBody.includes(`Sitemap: ${origin}/sitemap.xml`) || /Disallow:\s*\/\s*$/m.test(robotsBody)) {
    throw new Error(`${origin}/robots.txt is not tenant-specific and crawler-friendly`)
  }
  console.log(`PASS tenant robots ${origin}/robots.txt`)

  const sitemap = await fetch(`${origin}/sitemap.xml`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
  const sitemapBody = await sitemap.text()
  if (sitemap.status !== 200 || !sitemapBody.includes(`${origin}/en`) || !sitemapBody.includes(`${origin}/id`)) {
    throw new Error(`${origin}/sitemap.xml is missing tenant-localized homepage URLs`)
  }
  console.log(`PASS tenant sitemap ${origin}/sitemap.xml`)

  const missing = await fetch(`${origin}/crawler-visibility-route-must-not-exist`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  })
  if (missing.status !== 404) throw new Error(`${origin} unknown route returned ${missing.status}; expected 404`)
  console.log(`PASS tenant unknown route 404 ${origin}`)
}
