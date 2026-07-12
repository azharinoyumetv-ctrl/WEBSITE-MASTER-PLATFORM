const fs = require('fs');
const files = [
  'lib/actions/website.ts',
  'lib/actions/payments.ts'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const session = await getServerSession\(authOptions\)\s+if \(!session\?\.user\) throw new Error\(['"]Unauthorized['"]\)\s+await requirePermission\(\(session\.user as any\)\.id, ([^,]+), '([^']+)', '([^']+)'\)/g, 
  "const user = await getAuthenticatedUser()\n    await requirePermission(user.id, $1, '$2', '$3')");
  fs.writeFileSync(file, content);
}
