import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const loadDatabaseUrl = (): string => {
  const envPath = path.resolve(process.cwd(), '.env')
  const content = fs.readFileSync(envPath, 'utf-8')
  const match = content.match(/^DATABASE_URL=['"]?([^'"\n]+)['"]?/m)
  const value = match ? match[1] : null
  if (!value) {
    console.error(
      '[prisma] FATAL: DATABASE_URL is not set in environment variables.\n' +
      'Set DATABASE_URL in your .env file or PM2 ecosystem config and rebuild.'
    )
    throw new Error('DATABASE_URL is not set in environment variables.')
  }
  return value
}

const prismaClientSingleton = () => {
  const connectionString = loadDatabaseUrl()
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
