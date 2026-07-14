process.env.DATABASE_URL = (process.env.DATABASE_URL || '').replace(/^['"]|['"]$/g, '');
const port = process.env.PORT || 4000;
require('child_process').execSync(`next start -p ${port}`, { stdio: 'inherit', env: process.env });
