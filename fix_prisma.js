const fs = require('fs')
const path = require('path')
const glob = require('glob')

const files = glob.sync('D:/Fullstack Apps/website-master-platform/**/*.ts*', {
  ignore: ['**/node_modules/**', '**/.next/**']
})

for (const file of files) {
  if (file.includes('lib/prisma.ts')) continue;
  
  let content = fs.readFileSync(file, 'utf-8')
  
  if (content.includes('new PrismaClient()')) {
    content = content.replace(/import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"]/g, 'import prisma from "@/lib/prisma"')
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\)/g, '')
    
    fs.writeFileSync(file, content)
    console.log('Fixed', file)
  }
}
