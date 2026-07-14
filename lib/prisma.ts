import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const stripQuotes = (value: string | undefined): string | undefined => {
  if (!value) return value
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

const loadDatabaseUrl = (): string => {
  const connectionString = stripQuotes(process.env.DATABASE_URL)
  if (!connectionString) {
    console.error(
      '[prisma] FATAL: DATABASE_URL is not set in environment variables.\n' +
        'Set DATABASE_URL via environment variables, PM2 ecosystem config, or container secrets and rebuild.'
    )
    throw new Error('DATABASE_URL is not set in environment variables.')
  }
  return connectionString
}

const prismaClientSingleton = () => {
  const connectionString = loadDatabaseUrl()
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
