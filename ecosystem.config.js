module.exports = {
  apps: [
    {
      name: 'website-master-store',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        ENCRYPTION_KEY: 'default-32-character-encrypt-key',
        NEXTAUTH_SECRET: 'your-super-secret-key-change-in-production'
      }
    }
  ]
}
