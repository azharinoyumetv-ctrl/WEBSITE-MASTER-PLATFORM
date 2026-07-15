<<<<<<< Updated upstream
function stripQuotes(val) {
  if (typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '')
  }
  return val
=======
// Strip leading/trailing literal quotes injected by secret managers.
// Some injectors wrap values as: DATABASE_URL="postgresql://..."
// The outer quotes become part of the string value, producing an invalid URL
// that Prisma can't parse -> corrupted hostname -> EAI_AGAIN at runtime.
function stripQuotes(val) {
  if (typeof val !== 'string') return val
  return val.replace(/^["']|["']$/g, '')
>>>>>>> Stashed changes
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
