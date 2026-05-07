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

function createTestPrismaClient() {
  // DATABASE_URL is set to TEST_DATABASE_URL in tests/setup.ts before any
  // module is imported, so this adapter automatically targets the test database
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const testPrisma = createTestPrismaClient()

export async function cleanDb(): Promise<void> {
  // Delete in child-first order to avoid FK violations
  await testPrisma.orderItem.deleteMany()
  await testPrisma.order.deleteMany()
  await testPrisma.address.deleteMany()
  await testPrisma.emailSubscriber.deleteMany()
  await testPrisma.user.deleteMany()
}
