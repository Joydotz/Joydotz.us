import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
let prismaClient: PrismaClient | undefined

function getPrismaClient() {
  if (prismaClient) return prismaClient

  if (process.env.NODE_ENV === 'development' && globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma
    return prismaClient
  }

  prismaClient = createPrismaClient()

  if (process.env.NODE_ENV === 'development') {
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
