import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from '../config.js'

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: config.database.url })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
let prismaClient: PrismaClient | undefined

function getPrismaClient() {
  if (prismaClient) return prismaClient

  if (config.nodeEnv === 'development' && globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma
    return prismaClient
  }

  prismaClient = createPrismaClient()

  if (config.nodeEnv === 'development') {
    globalForPrisma.prisma = prismaClient
  }

  return prismaClient
}

// Lazily resolve Prisma so test setup can configure DATABASE_URL first.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient() as unknown as Record<string | symbol, unknown>
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
}) as PrismaClient
