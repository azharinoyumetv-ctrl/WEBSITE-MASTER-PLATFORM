import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      '[prisma] FATAL: DATABASE_URL is not set in environment variables.\n' +
      'This will cause PrismaClientInitializationError on every DB call.\n' +
      'Set DATABASE_URL in your .env or PM2 ecosystem config and rebuild.'
    )
    throw new Error('DATABASE_URL is not set in environment variables.')
  }
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
