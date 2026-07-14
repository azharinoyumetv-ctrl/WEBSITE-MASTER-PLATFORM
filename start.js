process.env.DATABASE_URL = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '');
require('child_process').execSync('next start -p 4000', { stdio: 'inherit', env: process.env });
