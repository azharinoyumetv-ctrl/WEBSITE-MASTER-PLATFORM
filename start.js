process.env.DATABASE_URL = (process.env.DATABASE_URL || '').replace(/^['"]|['"]$/g, '');
const port = process.env.PORT || 4000;
const nextBin = require.resolve('next/dist/bin/next');
require('child_process').execFileSync(process.execPath, [nextBin, 'start', '-p', String(port)], { stdio: 'inherit', env: process.env });
