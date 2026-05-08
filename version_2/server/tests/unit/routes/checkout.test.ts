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
 *   Price integrity   — server always looks up price from products.ts;
 *                       any price field sent by the client is ignored
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
}))

import { loginUser } from '../../../src/services/authService'
import { getAddresses } from '../../../src/services/accountService'
import { createOrder, getRecentPendingOrdersByUser, updateOrderStripeSessionId } from '../../../src/services/orderService'
import { createCheckoutSession } from '../../../src/services/stripeService'

const mockLogin = vi.mocked(loginUser)
const mockGetAddresses = vi.mocked(getAddresses)
const mockCreateOrder = vi.mocked(createOrder)
const mockGetRecentPendingOrdersByUser = vi.mocked(getRecentPendingOrdersByUser)
const mockCreateCheckoutSession = vi.mocked(createCheckoutSession)
const mockUpdateOrderStripeSessionId = vi.mocked(updateOrderStripeSessionId)

const MOCK_USER = createMockUser()
const MOCK_ADDRESS = createMockAddress(MOCK_USER.id)

const MOCK_ORDER = {
  id: 'order-001',
  userId: MOCK_USER.id,
  addressId: MOCK_ADDRESS.id,
  status: 'PENDING',
  stripeSessionId: 'cs_test_abc123',
  total: 2200,
  createdAt: new Date('2026-01-01'),
  items: [
    {
      id: 'item-001',
      orderId: 'order-001',
      productId: 'softwing-butterfly',
      name: 'Softwing Butterfly',
      priceAtPurchase: 2200,
      quantity: 1,
      imageUrl: null,
    },
  ],
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
// Product prices are always looked up server-side from products.ts. Any price
// field sent by the client must be ignored. This prevents a client from
// manipulating the total by sending a lower price.
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
    expect(orderCall.items[0].priceAtPurchase).toBe(2200) // real price from products.ts
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
      // softwing-butterfly: 2200 × 2 = 4400
      payload: {
        addressId: MOCK_ADDRESS.id,
        items: [{ productId: 'softwing-butterfly', quantity: 2 }],
      },
    })

    const orderCall = mockCreateOrder.mock.calls[0][0]
    expect(orderCall.total).toBe(4400)
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
      total: 2200,
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
      total: 2200,
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
