/**
 * Integration test helpers
 *
 * Uses a real Prisma client connected to the test database on port 5434.
 * The DATABASE_URL is set to TEST_DATABASE_URL in tests/setup.ts
 * before any modules are imported, so this client automatically targets the
 * test database.
 *
 * cleanDb() deletes all rows from every table before each test, ensuring
 * a known empty state. Tables are cleared in dependency order (children
 * before parents) to satisfy foreign key constraints.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { execSync } from 'node:child_process'
import { Client } from 'pg'

function withDatabase(connectionString: string, database: string): string {
  const url = new URL(connectionString)
  url.pathname = `/${database}`
  return url.toString()
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString)
  // Keep Prisma schema param and also enforce PG search_path for adapter clients.
  url.searchParams.set('schema', schema)
  url.searchParams.set('options', `--search_path=${schema}`)
  return url.toString()
}

export function configureIntegrationEnv(schema?: string, database?: string) {
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
  process.env.STRIPE_SECRET_KEY ||= 'sk_test_placeholder'
  process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_test_placeholder'
  process.env.FRONTEND_ORIGIN ||= 'http://localhost:5173'
  process.env.PORT ||= '3001'

  const baseTestDbUrl = process.env.TEST_DATABASE_URL
  if (!baseTestDbUrl) {
    throw new Error('TEST_DATABASE_URL is required for integration tests')
  }

  let dbUrl = baseTestDbUrl
  if (database) {
    dbUrl = withDatabase(dbUrl, database)
  }
  process.env.DATABASE_URL = schema ? withSchema(dbUrl, schema) : dbUrl
}

export async function migrateCurrentSchema(schema?: string, database?: string) {
  const baseTestDbUrl = process.env.TEST_DATABASE_URL
  if (!baseTestDbUrl) {
    throw new Error('TEST_DATABASE_URL is required for integration tests')
  }

  if (database) {
    const adminUrl = new URL(baseTestDbUrl)
    adminUrl.pathname = '/postgres'
    const adminClient = new Client({ connectionString: adminUrl.toString() })
    await adminClient.connect()
    const check = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (check.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${database}"`)
    }
    await adminClient.end()
  }

  if (schema) {
    const schemaClient = new Client({ connectionString: process.env.DATABASE_URL })
    await schemaClient.connect()
    await schemaClient.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
    await schemaClient.end()
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env },
    stdio: 'pipe',
  })
}

function createTestPrismaClient() {
  // DATABASE_URL is set to TEST_DATABASE_URL in tests/setup.ts before any
  // module is imported, so this adapter automatically targets the test database
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

let prismaClient: PrismaClient | undefined

function getTestPrismaClient() {
  if (!prismaClient) {
    prismaClient = createTestPrismaClient()
  }
  return prismaClient
}

export const testPrisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getTestPrismaClient() as unknown as Record<string | symbol, unknown>
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
}) as PrismaClient

export async function cleanDb(): Promise<void> {
  // Delete in child-first order to avoid FK violations
  await testPrisma.orderItem.deleteMany()
  await testPrisma.order.deleteMany()
  await testPrisma.address.deleteMany()
  await testPrisma.emailSubscriber.deleteMany()
  await testPrisma.user.deleteMany()
}
