/**
 * orderService unit tests
 *
 * Prisma is mocked — tests never touch the database.
 * Mock return values represent the exact shape of rows as PostgreSQL/Prisma
 * would return them, including nested relations (items, address).
 *
 * Covered:
 *   createOrder          — creates an order with PENDING status; snapshots
 *                          product name and price from input so order history
 *                          is immutable even if products.ts changes later
 *   getOrdersByUser      — returns all orders for a user ordered newest-first;
 *                          returns empty array when the user has no orders
 *   getOrderById         — scopes lookup to the requesting user so one user
 *                          cannot read another user's order; returns null on miss
 *   getOrderByIdForStripeEvent — unscoped lookup by order ID for trusted Stripe
 *                          events; includes user email for event payloads
 *   getOrderByStripeSessionId — looks up an order by Stripe session ID for use
 *                          in the Stripe events handler; returns null on miss
 *   getRecentPendingOrdersByUser — returns newest pending checkout attempts so
 *                          create-session can reuse equivalent in-flight intents
 *   updateOrderStripeSessionId — replaces placeholder session id with real `cs_...`
 *                          after Checkout Session creation succeeds
 *   tryMarkOrderPaidAfterCheckout — atomic PENDING→PAID; returns whether this
 *                          call performed the transition (webhook / poll / sweeper)
 *   updateOrderStatus    — transitions an order to PAID, SHIPPED, DELIVERED,
 *                          CANCELLED, or REFUNDED
 *   shipOrder            — sets SHIPPED status, trackingNumber, and shippedAt
 *                          in one update
 *   markDelivered        — sets DELIVERED status and records deliveredAt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use string literals — @prisma/client enums are not available before the
// Prisma client is initialised in the test environment
const OrderStatus = {
  PENDING:   'PENDING',
  PAID:      'PAID',
  SHIPPED:   'SHIPPED',
  DELIVERED: 'DELIVERED',
  FAILED:    'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED:  'REFUNDED',
} as const

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock('../../../src/db/client', () => ({
  prisma: {
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../../src/db/client'
import {
  createOrder,
  dismissPendingOrder,
  getOrdersByUser,
  getPaidOrdersByUser,
  getOrderById,
  getOrderByIdForStripeEvent,
  getOrderByStripeSessionId,
  getRecentPendingOrdersByUser,
  getResumablePendingOrdersByUser,
  updateShippingAddressForPaidOrder,
  updateOrderStripeSessionId,
  tryMarkOrderPaidAfterCheckout,
  updateOrderStatus,
  shipOrder,
  markDelivered,
} from '../../../src/services/orderService'

const mockCreate   = vi.mocked(prisma.order.create)
const mockFindMany = vi.mocked(prisma.order.findMany)
const mockFindFirst = vi.mocked(prisma.order.findFirst)
const mockFindUnique = vi.mocked(prisma.order.findUnique)
const mockUpdate   = vi.mocked(prisma.order.update)
const mockUpdateMany = vi.mocked(prisma.order.updateMany)
const mockAddressFindFirst = vi.mocked(prisma.address.findFirst)
const mockAddressUpdate = vi.mocked(prisma.address.update)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID    = '550e8400-e29b-41d4-a716-446655440001'
const ADDRESS_ID = '550e8400-e29b-41d4-a716-446655440002'
const ORDER_ID   = '550e8400-e29b-41d4-a716-446655440003'
const SESSION_ID = 'cs_test_abc123'

const DB_ORDER_ITEM = {
  id: '550e8400-e29b-41d4-a716-446655440004',
  orderId: ORDER_ID,
  productId: 'softwing-butterfly',
  name: 'Softwing Butterfly',
  priceAtPurchase: 500,
  quantity: 1,
  imageUrl: 'https://example.com/image.jpg',
}

const DB_ADDRESS = {
  id: ADDRESS_ID,
  userId: USER_ID,
  line1: '969 Cox Rd',
  line2: null,
  city: 'Gastonia',
  state: 'NC',
  postal_code: '28054',
  country: 'US',
  isDefault: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const DB_ORDER = {
  id: ORDER_ID,
  userId: USER_ID,
  addressId: ADDRESS_ID,
  status: OrderStatus.PENDING,
  stripeSessionId: SESSION_ID,
  total: 500,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  items: [DB_ORDER_ITEM],
  address: DB_ADDRESS,
}

const CREATE_INPUT = {
  userId: USER_ID,
  addressId: ADDRESS_ID,
  stripeSessionId: SESSION_ID,
  total: 500,
  items: [
    {
      productId: 'softwing-butterfly',
      name: 'Softwing Butterfly',
      priceAtPurchase: 500,
      quantity: 1,
      imageUrl: 'https://example.com/image.jpg',
    },
  ],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// createOrder
//
// Creates a new order in PENDING status alongside its line items in a single
// Prisma nested write. The order starts as PENDING because payment has not yet
// been confirmed — the Stripe events handler transitions it to PAID later.
//
// Critically, product name and price are snapshotted from the caller's input
// at the moment of creation. This means order history remains accurate even if
// a product is renamed or repriced in products.ts after the order was placed.
// ─────────────────────────────────────────────────────────────────────────────

describe('createOrder', () => {
  it('creates an order with PENDING status and returns it with items', async () => {
    mockCreate.mockResolvedValue(DB_ORDER as any)

    const result = await createOrder(CREATE_INPUT)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          addressId: ADDRESS_ID,
          stripeSessionId: SESSION_ID,
          total: 500,
          status: OrderStatus.PENDING,
        }),
      }),
    )
    expect(result.status).toBe(OrderStatus.PENDING)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe('softwing-butterfly')
  })

  it('snapshots price and name from input, not from products.ts', async () => {
    mockCreate.mockResolvedValue(DB_ORDER as any)

    await createOrder(CREATE_INPUT)

    const call = mockCreate.mock.calls[0][0] as any
    const item = call.data.items.create[0]
    expect(item.priceAtPurchase).toBe(500)
    expect(item.name).toBe('Softwing Butterfly')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrdersByUser
//
// Returns all orders belonging to a user, newest first, each including its
// line items and shipping address. Used to render the order history page.
// Returns an empty array — not an error — when the user has no orders yet.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrdersByUser', () => {
  it('returns all orders for a user ordered by createdAt desc', async () => {
    mockFindMany.mockResolvedValue([DB_ORDER] as any)

    const result = await getOrdersByUser(USER_ID)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      }),
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(ORDER_ID)
  })

  it('returns empty array when user has no orders', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await getOrdersByUser(USER_ID)

    expect(result).toEqual([])
  })
})

describe('getPaidOrdersByUser', () => {
  it('excludes PENDING and CANCELLED orders from history', async () => {
    mockFindMany.mockResolvedValue([] as any)

    await getPaidOrdersByUser(USER_ID)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: { notIn: [OrderStatus.PENDING, OrderStatus.CANCELLED] } },
      }),
    )
  })
})

describe('getResumablePendingOrdersByUser', () => {
  it('scopes to recent PENDING orders for the user', async () => {
    mockFindMany.mockResolvedValue([] as any)

    await getResumablePendingOrdersByUser(USER_ID)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER_ID,
          status: OrderStatus.PENDING,
          createdAt: { gte: expect.any(Date) },
        },
      }),
    )
  })
})

describe('dismissPendingOrder', () => {
  it('returns true when a pending order was cancelled', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 } as any)

    const ok = await dismissPendingOrder(ORDER_ID, USER_ID)

    expect(ok).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, userId: USER_ID, status: OrderStatus.PENDING },
      data: { status: OrderStatus.CANCELLED },
    })
  })

  it('returns false when no row matched', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as any)

    const ok = await dismissPendingOrder(ORDER_ID, USER_ID)

    expect(ok).toBe(false)
  })
})

describe('updateShippingAddressForPaidOrder', () => {
  const shippingInput = {
    line1: '100 New St',
    line2: '',
    city: 'Gastonia',
    state: 'NC',
    postal_code: '28054',
    country: 'US',
  }

  it('updates the order shipping address when status is PAID', async () => {
    mockFindFirst.mockResolvedValueOnce({ addressId: ADDRESS_ID } as any)
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS as any)
    const updated = { ...DB_ADDRESS, line1: '100 New St' }
    mockAddressUpdate.mockResolvedValueOnce(updated as any)

    const result = await updateShippingAddressForPaidOrder(ORDER_ID, USER_ID, shippingInput)

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: ORDER_ID, userId: USER_ID, status: OrderStatus.PAID },
      select: { addressId: true },
    })
    expect(mockAddressFindFirst).toHaveBeenCalledWith({
      where: { id: ADDRESS_ID, userId: USER_ID },
    })
    expect(mockAddressUpdate).toHaveBeenCalledWith({
      where: { id: ADDRESS_ID },
      data: {
        line1: '100 New St',
        line2: null,
        city: 'Gastonia',
        state: 'NC',
        postal_code: '28054',
        country: 'US',
      },
    })
    expect(result.line1).toBe('100 New St')
  })

  it('throws NOT_FOUND when order is not PAID or missing', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    await expect(updateShippingAddressForPaidOrder(ORDER_ID, USER_ID, shippingInput)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })

  it('throws NOT_FOUND when address is not owned by user', async () => {
    mockFindFirst.mockResolvedValueOnce({ addressId: ADDRESS_ID } as any)
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await expect(updateShippingAddressForPaidOrder(ORDER_ID, USER_ID, shippingInput)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrderById
//
// Looks up a single order by its ID, but only if it belongs to the requesting
// user. The userId scope prevents one authenticated user from reading another
// user's order details by guessing an order ID. Returns null on miss so the
// route can respond with 404 without throwing.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrderById', () => {
  it('returns the order when it belongs to the user', async () => {
    mockFindFirst.mockResolvedValue(DB_ORDER as any)

    const result = await getOrderById(ORDER_ID, USER_ID)

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORDER_ID, userId: USER_ID },
      }),
    )
    expect(result?.id).toBe(ORDER_ID)
  })

  it('returns null when order does not belong to user', async () => {
    mockFindFirst.mockResolvedValue(null)

    const result = await getOrderById(ORDER_ID, 'other-user-id')

    expect(result).toBeNull()
  })
})

describe('getOrderByIdForStripeEvent', () => {
  it('returns the order by id without user scope', async () => {
    mockFindUnique.mockResolvedValue(DB_ORDER as any)

    const result = await getOrderByIdForStripeEvent(ORDER_ID)

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORDER_ID },
      }),
    )
    expect(result?.id).toBe(ORDER_ID)
  })

  it('returns null when order does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await getOrderByIdForStripeEvent('missing-order-id')

    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getOrderByStripeSessionId
//
// Looks up an order by its Stripe Checkout Session ID. Used exclusively by the
// Stripe events handler when a checkout.session.completed event arrives — Stripe
// identifies the payment by session ID, not our internal order ID. Returns
// null when the session ID is not found so the handler can respond gracefully.
// ─────────────────────────────────────────────────────────────────────────────

describe('getOrderByStripeSessionId', () => {
  it('returns the order for a given session ID', async () => {
    mockFindUnique.mockResolvedValue(DB_ORDER as any)

    const result = await getOrderByStripeSessionId(SESSION_ID)

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSessionId: SESSION_ID },
      }),
    )
    expect(result?.stripeSessionId).toBe(SESSION_ID)
  })

  it('returns null when session ID is not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await getOrderByStripeSessionId('nonexistent')

    expect(result).toBeNull()
  })
})

describe('getRecentPendingOrdersByUser', () => {
  it('returns latest pending orders for a user', async () => {
    mockFindMany.mockResolvedValue([DB_ORDER] as any)

    const result = await getRecentPendingOrdersByUser(USER_ID)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    )
    expect(result).toHaveLength(1)
  })

  it('supports a custom take limit', async () => {
    mockFindMany.mockResolvedValue([] as any)

    await getRecentPendingOrdersByUser(USER_ID, 5)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStripeSessionId
//
// After Stripe checkout.sessions.create returns, the order row must store the
// real session id so Stripe events lookup by session.id succeeds.
// ─────────────────────────────────────────────────────────────────────────────

describe('updateOrderStripeSessionId', () => {
  it('updates stripeSessionId for the order', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, stripeSessionId: 'cs_test_new' } as any)

    const result = await updateOrderStripeSessionId(ORDER_ID, 'cs_test_new')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { stripeSessionId: 'cs_test_new' },
    })
    expect(result.stripeSessionId).toBe('cs_test_new')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// tryMarkOrderPaidAfterCheckout
//
// Single conditional update PENDING→PAID so webhook and thank-you GET reconcile
// without double ORDER_PAID side effects.
// ─────────────────────────────────────────────────────────────────────────────

describe('tryMarkOrderPaidAfterCheckout', () => {
  it('returns true when one row transitioned from PENDING to PAID', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 } as any)

    const transitioned = await tryMarkOrderPaidAfterCheckout(ORDER_ID)

    expect(transitioned).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID },
    })
  })

  it('returns false when order was already PAID or not PENDING', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 } as any)

    const transitioned = await tryMarkOrderPaidAfterCheckout(ORDER_ID)

    expect(transitioned).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStatus
//
// Transitions an order to a new status. Used for REFUNDED and admin flows;
// PAID from Checkout uses tryMarkOrderPaidAfterCheckout for idempotency across
// webhook + browser. Applying the same status twice via updateOrderStatus has
// no semantic issue when callers guard appropriately.
// ─────────────────────────────────────────────────────────────────────────────

describe('updateOrderStatus', () => {
  it('updates order status to PAID', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, status: OrderStatus.PAID } as any)

    const result = await updateOrderStatus(ORDER_ID, OrderStatus.PAID)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: OrderStatus.PAID },
    })
    expect(result.status).toBe(OrderStatus.PAID)
  })

  it('updates order status to REFUNDED', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, status: OrderStatus.REFUNDED } as any)

    const result = await updateOrderStatus(ORDER_ID, OrderStatus.REFUNDED)

    expect(result.status).toBe(OrderStatus.REFUNDED)
  })

  it('updates order status to SHIPPED', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, status: OrderStatus.SHIPPED } as any)

    const result = await updateOrderStatus(ORDER_ID, OrderStatus.SHIPPED)

    expect(result.status).toBe(OrderStatus.SHIPPED)
  })

  it('updates order status to DELIVERED', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, status: OrderStatus.DELIVERED } as any)

    const result = await updateOrderStatus(ORDER_ID, OrderStatus.DELIVERED)

    expect(result.status).toBe(OrderStatus.DELIVERED)
  })

  it('updates order status to CANCELLED', async () => {
    mockUpdate.mockResolvedValue({ ...DB_ORDER, status: OrderStatus.CANCELLED } as any)

    const result = await updateOrderStatus(ORDER_ID, OrderStatus.CANCELLED)

    expect(result.status).toBe(OrderStatus.CANCELLED)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// shipOrder
//
// Transitions an order to SHIPPED in a single update, setting the tracking
// number and shippedAt timestamp at the same time. Called by the admin route
// when an order is handed to a carrier. The tracking number is stored so it
// can be included in the shipment notification email to the customer.
// ─────────────────────────────────────────────────────────────────────────────

describe('shipOrder', () => {
  it('sets status to SHIPPED, trackingNumber, and shippedAt in one update', async () => {
    const shippedOrder = {
      ...DB_ORDER,
      status: OrderStatus.SHIPPED,
      trackingNumber: '1Z999AA10123456784',
      shippedAt: new Date(),
    }
    mockUpdate.mockResolvedValue(shippedOrder as any)

    const result = await shipOrder(ORDER_ID, '1Z999AA10123456784')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: expect.objectContaining({
        status: OrderStatus.SHIPPED,
        trackingNumber: '1Z999AA10123456784',
        shippedAt: expect.any(Date),
      }),
    })
    expect(result.status).toBe(OrderStatus.SHIPPED)
    expect(result.trackingNumber).toBe('1Z999AA10123456784')
    expect(result.shippedAt).toBeInstanceOf(Date)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// markDelivered
//
// Transitions an order to DELIVERED and records the deliveredAt timestamp.
// Called by the admin route once delivery is confirmed. Allows customers to
// see that their order has arrived and enables post-delivery flows such as
// review requests.
// ─────────────────────────────────────────────────────────────────────────────

describe('markDelivered', () => {
  it('sets status to DELIVERED and records deliveredAt timestamp', async () => {
    const deliveredOrder = {
      ...DB_ORDER,
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    }
    mockUpdate.mockResolvedValue(deliveredOrder as any)

    const result = await markDelivered(ORDER_ID)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: expect.objectContaining({
        status: OrderStatus.DELIVERED,
        deliveredAt: expect.any(Date),
      }),
    })
    expect(result.status).toBe(OrderStatus.DELIVERED)
    expect(result.deliveredAt).toBeInstanceOf(Date)
  })
})
