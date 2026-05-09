/**
 * POST /api/checkout/create-session route tests
 *
 * Strategy:
 *   - orderService and stripeService are mocked — no DB or Stripe API calls
 *   - accountService is mocked for address ownership verification
 *   - A real JWT cookie is obtained via POST /api/auth/login (loginUser mocked)
 *   - MockEventBus is passed into buildApp so tests can assert event publishing
 *   - skipCsrf: true — CSRF behaviour is tested separately in csrf.test.ts
 *
 * Covered:
 *   Authentication    — 401 when no cookie present
 *   Input validation  — 400 for missing/empty addressId, missing/empty items
 *                       array, unknown productId, quantity < 1
 *   Address ownership — 404 when address does not exist or belongs to
 *                       another user
 *   Price integrity   — server looks up amounts from Stripe Prices via
 *                       stripePriceId; any client-sent price is ignored
 *   Happy path        — 200 with { url, orderId }; createOrder called with
 *                       correct server-side prices; createCheckoutSession
 *                       called with correct line items and metadata
 *   Stripe errors     — 500 when Stripe API call fails
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'
import { MockEventBus } from '../../../src/events/MockEventBus'
import { PRODUCTS } from '../../../src/data/products'
import { createMockAddress, createMockUser } from '../../shared/fixtures'
import { wireRetrieveStripePricesByIdsMock } from '../../shared/stripePriceMocks'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../src/services/authService', () => ({
  signupUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('../../../src/services/accountService', () => ({
  setNewsletterOptIn: vi.fn(),
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
  getOrders: vi.fn(),
}))

vi.mock('../../../src/services/orderService', async () => {
  const { buildOrderServiceMock: buildMock } = await import('../../shared/mocks/orderService')
  return buildMock()
})

vi.mock('../../../src/services/stripeService', () => ({
  createCheckoutSession: vi.fn(),
  constructStripeEvent: vi.fn(),
  retrieveCheckoutSession: vi.fn(),
  retrieveStripePricesByIds: vi.fn(),
}))

import { loginUser } from '../../../src/services/authService'
import { getAddresses } from '../../../src/services/accountService'
import {
  createOrder,
  getOrderByStripeSessionId,
  getRecentPendingOrdersByUser,
  tryMarkOrderPaidAfterCheckout,
  updateOrderStripeSessionId,
} from '../../../src/services/orderService'
import {
  createCheckoutSession,
  retrieveCheckoutSession,
  retrieveStripePricesByIds,
} from '../../../src/services/stripeService'

const mockLogin = vi.mocked(loginUser)
const mockGetAddresses = vi.mocked(getAddresses)
const mockCreateOrder = vi.mocked(createOrder)
const mockGetRecentPendingOrdersByUser = vi.mocked(getRecentPendingOrdersByUser)
const mockCreateCheckoutSession = vi.mocked(createCheckoutSession)
const mockRetrieveCheckoutSession = vi.mocked(retrieveCheckoutSession)
const mockRetrieveStripePricesByIds = vi.mocked(retrieveStripePricesByIds)
const mockUpdateOrderStripeSessionId = vi.mocked(updateOrderStripeSessionId)
const mockGetOrderByStripeSessionId = vi.mocked(getOrderByStripeSessionId)
const mockTryMarkOrderPaidAfterCheckout = vi.mocked(tryMarkOrderPaidAfterCheckout)

const MOCK_USER = createMockUser()
const MOCK_ADDRESS = createMockAddress(MOCK_USER.id)

const MOCK_ORDER = {
  id: 'order-001',
  userId: MOCK_USER.id,
  addressId: MOCK_ADDRESS.id,
  status: 'PENDING',
  stripeSessionId: 'cs_test_abc123',
  total: 500,
  createdAt: new Date('2026-01-01'),
  items: [
    {
      id: 'item-001',
      orderId: 'order-001',
      productId: 'softwing-butterfly',
      name: 'Softwing Butterfly',
      priceAtPurchase: 500,
      quantity: 1,
      imageUrl: null,
    },
  ],
}

const MOCK_ORDER_WITH_RELATIONS = {
  ...MOCK_ORDER,
  address: MOCK_ADDRESS,
  user: { email: MOCK_USER.email },
}

const MOCK_ORDER_PAID_WITH_RELATIONS = {
  ...MOCK_ORDER_WITH_RELATIONS,
  status: 'PAID' as const,
}

// Mirrors exactly what the frontend sends at checkout
const VALID_PAYLOAD = {
  addressId: MOCK_ADDRESS.id,
  items: [{ productId: 'softwing-butterfly', quantity: 1 }],
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance
let eventBus: MockEventBus
let sessionCookie: string

beforeAll(async () => {
  eventBus = new MockEventBus()
  app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: true, eventBus })
  await app.ready()

  mockLogin.mockResolvedValueOnce(MOCK_USER)
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'test@example.com', password: 'password123' },
  })
  const raw = loginRes.headers['set-cookie']
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw as string)
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRecentPendingOrdersByUser.mockResolvedValue([])
  eventBus.clear()
  wireRetrieveStripePricesByIdsMock(mockRetrieveStripePricesByIds)
})

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
//
// The route is behind the authenticate middleware. Any request without a valid
// JWT cookie must be rejected with 401 before any business logic runs.
// ─────────────────────────────────────────────────────────────────────────────

describe('authentication', () => {
  it('returns 401 when no auth cookie is present', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
//
// The route validates the request body before touching the database or Stripe.
// Invalid requests must be rejected with 400.
// ─────────────────────────────────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when addressId is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { items: [{ productId: 'softwing-butterfly', quantity: 1 }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when addressId is empty string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: '', items: [{ productId: 'softwing-butterfly', quantity: 1 }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when items is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when items is an empty array', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id, items: [] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when a productId is unknown', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id, items: [{ productId: 'unknown-product', quantity: 1 }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id, items: [{ productId: 'softwing-butterfly', quantity: 0 }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is negative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id, items: [{ productId: 'softwing-butterfly', quantity: -1 }] },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when quantity is not a number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: { addressId: MOCK_ADDRESS.id, items: [{ productId: 'softwing-butterfly', quantity: 'one' }] },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Address ownership
//
// The address must exist and belong to the authenticated user. A user must
// not be able to charge delivery to another user's address by guessing
// an address ID.
// ─────────────────────────────────────────────────────────────────────────────

describe('address ownership', () => {
  it('returns 404 when the address does not belong to the user', async () => {
    mockGetAddresses.mockResolvedValueOnce([]) // user has no addresses

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when the addressId matches no address for this user', async () => {
    // User has an address, but with a different id
    mockGetAddresses.mockResolvedValueOnce([{ ...MOCK_ADDRESS, id: 'addr-different' }] as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Price integrity
//
// Product amounts come from Stripe Prices (stripePriceId). Any price field sent
// by the client must be ignored so totals cannot be manipulated.
// ─────────────────────────────────────────────────────────────────────────────

describe('price integrity', () => {
  it('uses server-side price from products.ts, ignores any client price', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      // Client tries to inject a price of 1 cent — must be ignored
      payload: {
        addressId: MOCK_ADDRESS.id,
        items: [{ productId: 'softwing-butterfly', quantity: 1, price: 1 }],
      },
    })

    const orderCall = mockCreateOrder.mock.calls[0][0]
    expect(orderCall.items[0].priceAtPurchase).toBe(500) // from mocked Stripe Price unit_amount
  })

  it('calculates total server-side from product prices and quantities', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      // softwing-butterfly: 500 × 2 = 1000
      payload: {
        addressId: MOCK_ADDRESS.id,
        items: [{ productId: 'softwing-butterfly', quantity: 2 }],
      },
    })

    const orderCall = mockCreateOrder.mock.calls[0][0]
    expect(orderCall.total).toBe(1000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Happy path
//
// Valid request from an authenticated user with a valid address and known
// products returns 200 with the Stripe session URL and the newly created
// order ID. The order is created as PENDING before the Stripe session so the
// orderId can be embedded in the session metadata.
// ─────────────────────────────────────────────────────────────────────────────

describe('happy path', () => {
  it('returns 200 with url and orderId', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().url).toBe('https://checkout.stripe.com/c/pay/cs_test_abc123')
    expect(res.json().orderId).toBe('order-001')
    expect(mockUpdateOrderStripeSessionId).toHaveBeenCalledWith('order-001', 'cs_test_abc123')
  })

  it('creates a PENDING order before creating the Stripe session', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    // createOrder must be called before createCheckoutSession
    const orderCallOrder = mockCreateOrder.mock.invocationCallOrder[0]
    const stripeCallOrder = mockCreateCheckoutSession.mock.invocationCallOrder[0]
    expect(orderCallOrder).toBeLessThan(stripeCallOrder)
  })

  it('embeds orderId in Stripe session metadata', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    const stripeCall = mockCreateCheckoutSession.mock.calls[0][0]
    expect(stripeCall.metadata.orderId).toBe('order-001')
    expect(stripeCall.metadata.userId).toBe(MOCK_USER.id)
  })

  it('passes correct stripePriceId and quantity to Stripe', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc123',
    })

    await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    const stripeCall = mockCreateCheckoutSession.mock.calls[0][0]
    const butterflyPriceId = PRODUCTS.find((p) => p.id === 'softwing-butterfly')!.stripePriceId
    expect(stripeCall.lineItems).toEqual([
      { stripePriceId: butterflyPriceId, quantity: 1 },
    ])
  })
})

describe('duplicate checkout guard', () => {
  it('reuses an equivalent pending order instead of creating a new one', async () => {
    const existingPendingOrder = {
      ...MOCK_ORDER,
      id: 'order-existing-001',
      addressId: MOCK_ADDRESS.id,
      status: 'PENDING',
      total: 500,
      items: [{ productId: 'softwing-butterfly', quantity: 1 }],
    }

    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockGetRecentPendingOrdersByUser.mockResolvedValueOnce([existingPendingOrder] as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_reused_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_reused_123',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(200)
    expect(mockCreateOrder).not.toHaveBeenCalled()
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ orderId: 'order-existing-001' }),
      }),
    )
    expect(res.json().orderId).toBe('order-existing-001')
  })

  it('creates a new order when cart differs from existing pending order', async () => {
    const existingPendingOrder = {
      ...MOCK_ORDER,
      id: 'order-existing-002',
      addressId: MOCK_ADDRESS.id,
      status: 'PENDING',
      total: 500,
      items: [{ productId: 'softwing-butterfly', quantity: 1 }],
    }

    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockGetRecentPendingOrdersByUser.mockResolvedValueOnce([existingPendingOrder] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockResolvedValueOnce({
      sessionId: 'cs_test_new_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_new_123',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: {
        addressId: MOCK_ADDRESS.id,
        items: [{ productId: 'softwing-butterfly', quantity: 2 }],
      },
    })

    expect(res.statusCode).toBe(200)
    expect(mockCreateOrder).toHaveBeenCalledTimes(1)
    expect(res.json().orderId).toBe('order-001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Stripe errors
//
// If the Stripe API call fails the route must return 500. The PENDING order
// has already been created in the database at this point — Stripe's own
// PaymentIntent expiry (24 hours) and our retry flow handle cleanup.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/checkout/order-by-session — thank-you page after hosted Checkout
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/checkout/order-by-session', () => {
  it('returns 400 when session_id is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/checkout/order-by-session' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when session_id has invalid shape', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=not_a_session',
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when Stripe retrieve fails', async () => {
    mockRetrieveCheckoutSession.mockRejectedValueOnce(new Error('no such session'))

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_xyz',
    })

    expect(res.statusCode).toBe(404)
    expect(mockGetOrderByStripeSessionId).not.toHaveBeenCalled()
  })

  it('returns 404 when payment is not completed yet', async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_xyz',
      payment_status: 'unpaid',
      metadata: { orderId: 'order-001' },
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_xyz',
    })

    expect(res.statusCode).toBe(404)
    expect(mockGetOrderByStripeSessionId).not.toHaveBeenCalled()
  })

  it('returns 404 when metadata orderId is missing', async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_xyz',
      payment_status: 'paid',
      metadata: {},
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_xyz',
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when DB order id does not match Stripe metadata', async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_xyz',
      payment_status: 'paid',
      metadata: { orderId: 'order-999' },
    } as any)
    mockGetOrderByStripeSessionId.mockResolvedValueOnce({
      ...MOCK_ORDER_WITH_RELATIONS,
      id: 'order-001',
    } as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_xyz',
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 200 with order when Stripe paid and DB matches metadata', async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_abc123',
      payment_status: 'paid',
      metadata: { orderId: 'order-001', userId: MOCK_USER.id },
    } as any)
    mockGetOrderByStripeSessionId
      .mockResolvedValueOnce(MOCK_ORDER_WITH_RELATIONS as any)
      .mockResolvedValueOnce(MOCK_ORDER_PAID_WITH_RELATIONS as any)
    mockTryMarkOrderPaidAfterCheckout.mockResolvedValueOnce(true)

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_abc123',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().order.id).toBe('order-001')
    expect(res.json().order.status).toBe('PAID')
    expect(mockTryMarkOrderPaidAfterCheckout).toHaveBeenCalledWith('order-001')
    expect(mockGetOrderByStripeSessionId).toHaveBeenCalledWith('cs_test_abc123')
    expect(eventBus.eventsOf('ORDER_PAID')).toHaveLength(1)
  })

  it('does not call tryMark or publish when order is already PAID', async () => {
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_abc123',
      payment_status: 'paid',
      metadata: { orderId: 'order-001', userId: MOCK_USER.id },
    } as any)
    mockGetOrderByStripeSessionId.mockResolvedValueOnce(MOCK_ORDER_PAID_WITH_RELATIONS as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/checkout/order-by-session?session_id=cs_test_abc123',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().order.status).toBe('PAID')
    expect(mockTryMarkOrderPaidAfterCheckout).not.toHaveBeenCalled()
    expect(eventBus.eventsOf('ORDER_PAID')).toHaveLength(0)
  })
})

describe('Stripe errors', () => {
  it('returns 500 when Stripe API call fails', async () => {
    mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS] as any)
    mockCreateOrder.mockResolvedValueOnce(MOCK_ORDER as any)
    mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Stripe API error'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie: sessionCookie },
      payload: VALID_PAYLOAD,
    })

    expect(res.statusCode).toBe(500)
    expect(mockUpdateOrderStripeSessionId).not.toHaveBeenCalled()
  })
})
