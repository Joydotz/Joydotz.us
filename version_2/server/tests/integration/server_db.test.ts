/**
 * This file specifically tests the server - database flow.
 *
 * Runs against the real test database (joydotz_test on port 5434).
 * Every test starts with a clean database — all tables are wiped in
 * beforeEach so tests are fully isolated from one another.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { cleanDb, testPrisma } from './helpers'
import {
  createOrder,
  getOrdersByUser,
  getOrderById,
  getOrderByStripeSessionId,
  updateOrderStatus,
  shipOrder,
  markDelivered,
  updateShippingAddressForPaidOrder,
} from '../../src/services/orderService'

// ── Fixtures ──────────────────────────────────────────────────────────────────

async function seedUserAndAddress() {
  const user = await testPrisma.user.create({
    data: {
      email: 'integration@example.com',
      passwordHash: '$2b$12$hashedpassword',
      newsletterOptIn: false,
    },
  })

  const address = await testPrisma.address.create({
    data: {
      userId: user.id,
      line1: '969 Cox Rd',
      city: 'Gastonia',
      state: 'NC',
      postal_code: '28054',
      country: 'US',
      isDefault: true,
    },
  })

  return { user, address }
}

const ORDER_ITEMS = [
  {
    productId: 'softwing-butterfly',
    name: 'Softwing Butterfly',
    priceAtPurchase: 500,
    quantity: 1,
    imageUrl: 'https://example.com/image.jpg',
  },
  {
    productId: 'velvet-bloom',
    name: 'Velvet Bloom',
    priceAtPurchase: 1800,
    quantity: 2,
    imageUrl: 'https://example.com/bloom.jpg',
  },
]

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(async () => {
  await cleanDb()
})

afterAll(async () => {
  await testPrisma.$disconnect()
})

// ─────────────────────────────────────────────────────────────────────────────
// createOrder
//
// Inserts an order row and all its OrderItem rows in a single Prisma nested
// write. The order starts as PENDING. Product name and price are stored
// directly on each item row — they are not looked up from products.ts at
// read time — so order history is immutable.
// ─────────────────────────────────────────────────────────────────────────────

describe('createOrder', () => {
  it('persists the order and items in the database', async () => {
    const { user, address } = await seedUserAndAddress()

    const order = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_integration_001',
      total: 4100,
      items: ORDER_ITEMS,
    })

    const persisted = await testPrisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    })

    expect(persisted).not.toBeNull()
    expect(persisted!.status).toBe('PENDING')
    expect(persisted!.total).toBe(4100)
    expect(persisted!.items).toHaveLength(2)
  })

  it('starts with PENDING status', async () => {
    const { user, address } = await seedUserAndAddress()

    const order = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_integration_002',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    expect(order.status).toBe('PENDING')
  })

  it('snapshots product name and price on the item row', async () => {
    const { user, address } = await seedUserAndAddress()

    const order = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_integration_003',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const item = order.items[0]
    expect(item.name).toBe('Softwing Butterfly')
    expect(item.priceAtPurchase).toBe(500)
    expect(item.productId).toBe('softwing-butterfly')
  })

  it('enforces unique stripeSessionId — rejects duplicate sessions', async () => {
    const { user, address } = await seedUserAndAddress()

    await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_duplicate',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    await expect(
      createOrder({
        userId: user.id,
        addressId: address.id,
        stripeSessionId: 'cs_test_duplicate',
        total: 500,
        items: [ORDER_ITEMS[0]],
      }),
    ).rejects.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrdersByUser
//
// Returns all orders for the requesting user, newest first, with items and
// address included. Orders belonging to other users are never returned.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrdersByUser', () => {
  it('returns all orders for a user with items and address', async () => {
    const { user, address } = await seedUserAndAddress()

    await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_list_001',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_list_002',
      total: 1800,
      items: [ORDER_ITEMS[1]],
    })

    const orders = await getOrdersByUser(user.id)

    expect(orders).toHaveLength(2)
    expect(orders[0].items).toBeDefined()
    expect(orders[0].address).toBeDefined()
    expect(orders[0].address.line1).toBe('969 Cox Rd')
  })

  it('returns orders newest-first', async () => {
    const { user, address } = await seedUserAndAddress()

    const first = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_order_001',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const second = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_order_002',
      total: 1800,
      items: [ORDER_ITEMS[1]],
    })

    const orders = await getOrdersByUser(user.id)

    expect(orders[0].id).toBe(second.id)
    expect(orders[1].id).toBe(first.id)
  })

  it('does not return orders belonging to another user', async () => {
    const { user, address } = await seedUserAndAddress()

    const otherUser = await testPrisma.user.create({
      data: {
        email: 'other@example.com',
        passwordHash: '$2b$12$hashedpassword',
        newsletterOptIn: false,
      },
    })

    await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_other_user',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const orders = await getOrdersByUser(otherUser.id)

    expect(orders).toHaveLength(0)
  })

  it('returns empty array when user has no orders', async () => {
    const { user } = await seedUserAndAddress()

    const orders = await getOrdersByUser(user.id)

    expect(orders).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrderById
//
// Fetches a single order scoped to the requesting user. A user can only
// retrieve their own orders — passing another user's ID returns null even
// if the order ID is valid.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrderById', () => {
  it('returns the order with items and address when userId matches', async () => {
    const { user, address } = await seedUserAndAddress()

    const created = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_byid_001',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const order = await getOrderById(created.id, user.id)

    expect(order).not.toBeNull()
    expect(order!.id).toBe(created.id)
    expect(order!.items).toHaveLength(1)
    expect(order!.address.line1).toBe('969 Cox Rd')
  })

  it('returns null when the order belongs to a different user', async () => {
    const { user, address } = await seedUserAndAddress()

    const created = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_byid_002',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const order = await getOrderById(created.id, 'different-user-id')

    expect(order).toBeNull()
  })

  it('returns null for a non-existent order ID', async () => {
    const { user } = await seedUserAndAddress()

    const order = await getOrderById('non-existent-id', user.id)

    expect(order).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByStripeSessionId
//
// Used by the Stripe events handler to look up an order when Stripe fires a
// checkout.session.completed event. The session ID is the only identifier
// Stripe provides in the event payload.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrderByStripeSessionId', () => {
  it('returns the order matching the session ID', async () => {
    const { user, address } = await seedUserAndAddress()

    await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_session_001',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })

    const order = await getOrderByStripeSessionId('cs_test_session_001')

    expect(order).not.toBeNull()
    expect(order!.stripeSessionId).toBe('cs_test_session_001')
    expect(order!.items).toHaveLength(1)
  })

  it('returns null for an unknown session ID', async () => {
    const order = await getOrderByStripeSessionId('cs_test_unknown')

    expect(order).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStatus
//
// Transitions an order to any valid status. The Stripe events handler uses this to
// mark orders PAID. The admin uses it for CANCELLED and REFUNDED.
// Applying the same status twice (idempotency) does not throw.
// ─────────────────────────────────────────────────────────────────────────────

describe('updateOrderStatus', () => {
  it('transitions PENDING → PAID', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_status_001', total: 500, items: [ORDER_ITEMS[0]],
    })

    await updateOrderStatus(order.id, 'PAID')

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(updated!.status).toBe('PAID')
  })

  it('transitions PAID → CANCELLED', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_status_002', total: 500, items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')

    await updateOrderStatus(order.id, 'CANCELLED')

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(updated!.status).toBe('CANCELLED')
  })

  it('transitions PAID → REFUNDED', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_status_003', total: 500, items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')

    await updateOrderStatus(order.id, 'REFUNDED')

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(updated!.status).toBe('REFUNDED')
  })

  it('applying the same status twice does not throw (idempotent)', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_status_004', total: 500, items: [ORDER_ITEMS[0]],
    })

    await updateOrderStatus(order.id, 'PAID')

    await expect(updateOrderStatus(order.id, 'PAID')).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// shipOrder
//
// Atomically sets status to SHIPPED, records the carrier tracking number,
// and stamps shippedAt — all in one database update. Called by the admin
// when handing an order to a carrier.
// ─────────────────────────────────────────────────────────────────────────────

describe('shipOrder', () => {
  it('sets SHIPPED status, trackingNumber, and shippedAt', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_ship_001', total: 500, items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')

    await shipOrder(order.id, '1Z999AA10123456784')

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(updated!.status).toBe('SHIPPED')
    expect(updated!.trackingNumber).toBe('1Z999AA10123456784')
    expect(updated!.shippedAt).toBeInstanceOf(Date)
    expect(updated!.deliveredAt).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// markDelivered
//
// Sets status to DELIVERED and stamps deliveredAt. Called by the admin once
// delivery is confirmed. shippedAt remains unchanged.
// ─────────────────────────────────────────────────────────────────────────────

describe('markDelivered', () => {
  it('sets DELIVERED status and deliveredAt, preserves shippedAt', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_deliver_001', total: 500, items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')
    await shipOrder(order.id, '1Z999AA10123456784')

    await markDelivered(order.id)

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(updated!.status).toBe('DELIVERED')
    expect(updated!.deliveredAt).toBeInstanceOf(Date)
    expect(updated!.shippedAt).toBeInstanceOf(Date) // preserved from shipOrder
    expect(updated!.trackingNumber).toBe('1Z999AA10123456784') // preserved
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateShippingAddressForPaidOrder — PAID only (not after fulfillment)
// ─────────────────────────────────────────────────────────────────────────────

const NEW_SHIP_TO = {
  line1: '200 Warehouse Row',
  line2: '',
  city: 'Gastonia',
  state: 'NC',
  postal_code: '28054',
  country: 'US',
}

describe('updateShippingAddressForPaidOrder', () => {
  it('rejects when the order is already SHIPPED', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_shipaddr_block_001',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')
    await shipOrder(order.id, '1Z999AA10123456784')

    const row = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(row!.status).toBe('SHIPPED')

    await expect(updateShippingAddressForPaidOrder(order.id, user.id, NEW_SHIP_TO)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('rejects when the order is already DELIVERED', async () => {
    const { user, address } = await seedUserAndAddress()
    const order = await createOrder({
      userId: user.id,
      addressId: address.id,
      stripeSessionId: 'cs_test_shipaddr_block_002',
      total: 500,
      items: [ORDER_ITEMS[0]],
    })
    await updateOrderStatus(order.id, 'PAID')
    await shipOrder(order.id, '1Z999AA10123456784')
    await markDelivered(order.id)

    const row = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(row!.status).toBe('DELIVERED')

    await expect(updateShippingAddressForPaidOrder(order.id, user.id, NEW_SHIP_TO)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate stripeSessionId
// ─────────────────────────────────────────────────────────────────────────────

describe('duplicate stripeSessionId', () => {
  it('rejects a second order with the same stripeSessionId', async () => {
    const { user, address } = await seedUserAndAddress()

    await createOrder({
      userId: user.id, addressId: address.id,
      stripeSessionId: 'cs_test_duplicate_001', total: 500, items: [ORDER_ITEMS[0]],
    })

    await expect(
      createOrder({
        userId: user.id, addressId: address.id,
        stripeSessionId: 'cs_test_duplicate_001', total: 500, items: [ORDER_ITEMS[0]],
      }),
    ).rejects.toThrow()
  })

  it('only one order exists after two concurrent requests with the same session ID', async () => {
    const { user, address } = await seedUserAndAddress()

    const results = await Promise.allSettled([
      createOrder({ userId: user.id, addressId: address.id, stripeSessionId: 'cs_test_concurrent_001', total: 500, items: [ORDER_ITEMS[0]] }),
      createOrder({ userId: user.id, addressId: address.id, stripeSessionId: 'cs_test_concurrent_001', total: 500, items: [ORDER_ITEMS[0]] }),
    ])

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)

    const orders = await testPrisma.order.findMany({ where: { stripeSessionId: 'cs_test_concurrent_001' } })
    expect(orders).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Foreign key violations
// ─────────────────────────────────────────────────────────────────────────────

describe('foreign key violations', () => {
  it('throws when addressId does not exist', async () => {
    const { user } = await seedUserAndAddress()

    await expect(
      createOrder({ userId: user.id, addressId: 'non-existent-address-id', stripeSessionId: 'cs_test_fk_001', total: 500, items: [ORDER_ITEMS[0]] }),
    ).rejects.toThrow()
  })

  it('throws when userId does not exist', async () => {
    const { address } = await seedUserAndAddress()

    await expect(
      createOrder({ userId: 'non-existent-user-id', addressId: address.id, stripeSessionId: 'cs_test_fk_002', total: 500, items: [ORDER_ITEMS[0]] }),
    ).rejects.toThrow()
  })

  it('does not create partial data when FK violation occurs', async () => {
    const { user } = await seedUserAndAddress()

    await expect(
      createOrder({ userId: user.id, addressId: 'non-existent-address-id', stripeSessionId: 'cs_test_fk_003', total: 500, items: [ORDER_ITEMS[0]] }),
    ).rejects.toThrow()

    const order = await testPrisma.order.findUnique({ where: { stripeSessionId: 'cs_test_fk_003' } })
    expect(order).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// onDelete: Restrict — address cannot be deleted while orders reference it
// ─────────────────────────────────────────────────────────────────────────────

describe('onDelete: Restrict on Address', () => {
  it('prevents deleting an address that has orders', async () => {
    const { user, address } = await seedUserAndAddress()

    await createOrder({ userId: user.id, addressId: address.id, stripeSessionId: 'cs_test_restrict_001', total: 500, items: [ORDER_ITEMS[0]] })

    await expect(
      testPrisma.address.delete({ where: { id: address.id } }),
    ).rejects.toThrow()
  })

  it('allows deleting an address that has no orders', async () => {
    const { address } = await seedUserAndAddress()

    await expect(
      testPrisma.address.delete({ where: { id: address.id } }),
    ).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Concurrent status updates
// ─────────────────────────────────────────────────────────────────────────────

describe('concurrent status updates', () => {
  it('both updates resolve and the final status is valid', async () => {
    const { user, address } = await seedUserAndAddress()

    const order = await createOrder({ userId: user.id, addressId: address.id, stripeSessionId: 'cs_test_concurrent_status_001', total: 500, items: [ORDER_ITEMS[0]] })

    const results = await Promise.allSettled([
      updateOrderStatus(order.id, 'PAID'),
      updateOrderStatus(order.id, 'PAID'),
    ])

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)

    const updated = await testPrisma.order.findUnique({ where: { id: order.id } })
    expect(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED']).toContain(updated!.status)
  })
})
