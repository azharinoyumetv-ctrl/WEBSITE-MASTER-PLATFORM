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

const readPoolSetting = (name: string, fallback: number, minimum: number, maximum: number): number => {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`)
  }
  return parsed
}

const prismaClientSingleton = () => {
  const connectionString = loadDatabaseUrl()
  const pool = new Pool({
    connectionString,
    max: readPoolSetting('DATABASE_POOL_MAX', 20, 1, 100),
    idleTimeoutMillis: readPoolSetting('DATABASE_POOL_IDLE_TIMEOUT_MS', 30000, 1000, 300000),
    connectionTimeoutMillis: readPoolSetting('DATABASE_POOL_CONNECT_TIMEOUT_MS', 10000, 1000, 60000)
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
