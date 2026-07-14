function stripQuotes(val) {
  if (typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '')
  }
  return val
}

module.exports = {
  apps: [
    {
      name: 'website-master-store',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: stripQuotes(process.env.DATABASE_URL),
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        CONTROL_PLANE_SECRET: process.env.CONTROL_PLANE_SECRET
      }
    }
  ]
}
