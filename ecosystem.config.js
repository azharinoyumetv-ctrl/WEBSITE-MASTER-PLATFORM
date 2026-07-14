module.exports = {
  apps: [
    {
      name: 'website-master-store',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
      }
    }
  ]
}
