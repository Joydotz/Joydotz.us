/**
 * Order route tests — account order endpoints under `/api/account/orders`.
 *
 * Strategy:
 *   - orderService (+ stripe retrieve for resume) mocked — no DB or Stripe HTTP
 *   - A real JWT cookie is obtained via POST /api/auth/login (loginUser mocked)
 *   - skipCsrf: true — CSRF behaviour is tested separately in csrf.test.ts
 *
 * Covered:
 *   GET /api/account/orders              — paid/history list (excludes PENDING, CANCELLED)
 *   GET /api/account/orders/incomplete — recent PENDING within resume window
 *   POST …/resume-checkout / dismiss-incomplete / shipping-address
 *   GET /api/account/orders/:id
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'
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
}))

vi.mock('../../../src/services/orderService', async () => {
  const { buildOrderServiceMock: buildMock } = await import('../../shared/mocks/orderService')
  return buildMock()
})

vi.mock('../../../src/services/stripeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/stripeService')>()
  return {
    ...actual,
    retrieveCheckoutSession: vi.fn(),
  }
})

import { loginUser } from '../../../src/services/authService'
import {
  dismissPendingOrder,
  getPaidOrdersByUser,
  getOrderById,
  getResumablePendingOrdersByUser,
  updateShippingAddressForPaidOrder,
} from '../../../src/services/orderService'
import { retrieveCheckoutSession } from '../../../src/services/stripeService'

const mockLogin = vi.mocked(loginUser)
const mockGetPaidOrdersByUser = vi.mocked(getPaidOrdersByUser)
const mockGetResumablePendingOrdersByUser = vi.mocked(getResumablePendingOrdersByUser)
const mockGetOrderById = vi.mocked(getOrderById)
const mockDismissPendingOrder = vi.mocked(dismissPendingOrder)
const mockUpdateShippingAddressForPaidOrder = vi.mocked(updateShippingAddressForPaidOrder)
const mockRetrieveCheckoutSession = vi.mocked(retrieveCheckoutSession)

const VALID_SHIPPING_PAYLOAD = {
  line1: '969 Cox Rd',
  line2: '',
  city: 'Gastonia',
  state: 'NC',
  postal_code: '28054',
  country: 'US',
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = createMockUser()
const MOCK_ADDRESS = createMockAddress(MOCK_USER.id)

const MOCK_ORDER = {
  id: 'order-001',
  userId: MOCK_USER.id,
  addressId: MOCK_ADDRESS.id,
  status: 'PAID',
  stripeSessionId: 'cs_test_abc123',
  total: 500,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  createdAt: new Date('2026-01-01'),
  address: MOCK_ADDRESS,
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

const MOCK_PENDING_ORDER = {
  ...MOCK_ORDER,
  id: 'order-pending',
  status: 'PENDING' as const,
  createdAt: new Date(),
  items: MOCK_ORDER.items.map((it, i) => ({ ...it, id: `item-p-${i}`, orderId: 'order-pending' })),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance
let sessionCookie: string

beforeAll(async () => {
  app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: true })
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
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/orders — paid / shipped history (no PENDING / CANCELLED)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/orders', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders',
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with empty array when user has no orders', async () => {
    mockGetPaidOrdersByUser.mockResolvedValueOnce([])

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orders).toEqual([])
  })

  it('returns 200 with order list including items and address', async () => {
    mockGetPaidOrdersByUser.mockResolvedValueOnce([MOCK_ORDER] as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    const { orders } = res.json()
    expect(orders).toHaveLength(1)
    expect(orders[0].id).toBe('order-001')
    expect(orders[0].status).toBe('PAID')
    expect(orders[0].items).toHaveLength(1)
    expect(orders[0].address.line1).toBe('969 Cox Rd')
  })

  it('scopes the list query to the authenticated user', async () => {
    mockGetPaidOrdersByUser.mockResolvedValueOnce([MOCK_ORDER] as any)

    await app.inject({
      method: 'GET',
      url: '/api/account/orders',
      headers: { cookie: sessionCookie },
    })

    expect(mockGetPaidOrdersByUser).toHaveBeenCalledWith(MOCK_USER.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/orders/incomplete
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/orders/incomplete', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/account/orders/incomplete' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with incomplete orders from the service', async () => {
    mockGetResumablePendingOrdersByUser.mockResolvedValueOnce([MOCK_PENDING_ORDER] as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders/incomplete',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orders).toHaveLength(1)
    expect(res.json().orders[0].status).toBe('PENDING')
    expect(mockGetResumablePendingOrdersByUser).toHaveBeenCalledWith(MOCK_USER.id, 60 * 60 * 1000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/orders/:id/resume-checkout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/orders/:id/resume-checkout', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/resume-checkout',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with Stripe Checkout URL when session is still open', async () => {
    mockGetOrderById.mockResolvedValueOnce(MOCK_PENDING_ORDER as any)
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      status: 'open',
      url: 'https://checkout.stripe.test/c/pay_cs',
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/resume-checkout',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ url: 'https://checkout.stripe.test/c/pay_cs' })
    expect(mockRetrieveCheckoutSession).toHaveBeenCalledWith('cs_test_abc123')
  })

  it('returns 410 when the resume window has passed', async () => {
    const old = { ...MOCK_PENDING_ORDER, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    mockGetOrderById.mockResolvedValueOnce(old as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/resume-checkout',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(410)
  })

  it('returns 410 when stripeSessionId is still a placeholder', async () => {
    mockGetOrderById.mockResolvedValueOnce({
      ...MOCK_PENDING_ORDER,
      stripeSessionId: 'pending_user_123',
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/resume-checkout',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(410)
    expect(mockRetrieveCheckoutSession).not.toHaveBeenCalled()
  })

  it('returns 410 when Stripe session is no longer open', async () => {
    mockGetOrderById.mockResolvedValueOnce(MOCK_PENDING_ORDER as any)
    mockRetrieveCheckoutSession.mockResolvedValueOnce({
      status: 'complete',
      url: null,
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/resume-checkout',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(410)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/orders/:id/dismiss-incomplete
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/orders/:id/dismiss-incomplete', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/dismiss-incomplete',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 when dismiss succeeds', async () => {
    mockDismissPendingOrder.mockResolvedValueOnce(true)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/dismiss-incomplete',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    expect(mockDismissPendingOrder).toHaveBeenCalledWith('order-pending', MOCK_USER.id)
  })

  it('returns 404 when no pending row matched', async () => {
    mockDismissPendingOrder.mockResolvedValueOnce(false)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-pending/dismiss-incomplete',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/orders/:id/shipping-address — PAID orders only
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/orders/:id/shipping-address', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-001/shipping-address',
      payload: VALID_SHIPPING_PAYLOAD,
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when body is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-001/shipping-address',
      headers: { cookie: sessionCookie },
      payload: { line1: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 200 with updated address when order is PAID', async () => {
    const updated = { ...MOCK_ADDRESS, line1: '100 Ship Way' }
    mockUpdateShippingAddressForPaidOrder.mockResolvedValueOnce(updated as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-001/shipping-address',
      headers: { cookie: sessionCookie },
      payload: { ...VALID_SHIPPING_PAYLOAD, line1: '100 Ship Way' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().address.line1).toBe('100 Ship Way')
    expect(mockUpdateShippingAddressForPaidOrder).toHaveBeenCalledWith(
      'order-001',
      MOCK_USER.id,
      expect.objectContaining({ line1: '100 Ship Way' }),
    )
  })

  it('returns 404 when order is not PAID or not found', async () => {
    mockUpdateShippingAddressForPaidOrder.mockRejectedValueOnce(
      Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' }),
    )

    const res = await app.inject({
      method: 'POST',
      url: '/api/account/orders/order-001/shipping-address',
      headers: { cookie: sessionCookie },
      payload: VALID_SHIPPING_PAYLOAD,
    })

    expect(res.statusCode).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/orders/:id
//
// Returns a single order scoped to the authenticated user. The userId scope
// in the query prevents a user from accessing another user's order by guessing
// an order ID. Returns 404 for both missing orders and orders belonging to
// other users — the caller cannot distinguish between the two cases.
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/orders/:id', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders/order-001',
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with full order including items and address', async () => {
    mockGetOrderById.mockResolvedValueOnce(MOCK_ORDER as any)

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders/order-001',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    const { order } = res.json()
    expect(order.id).toBe('order-001')
    expect(order.status).toBe('PAID')
    expect(order.items).toHaveLength(1)
    expect(order.address.line1).toBe('969 Cox Rd')
  })

  it('returns 404 when order does not exist', async () => {
    mockGetOrderById.mockResolvedValueOnce(null)

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders/nonexistent-order',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 when order belongs to another user', async () => {
    // getOrderById scopes by userId — returns null for another user's order
    mockGetOrderById.mockResolvedValueOnce(null)

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders/order-001',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(404)
  })

  it('scopes the query to the authenticated user', async () => {
    mockGetOrderById.mockResolvedValueOnce(MOCK_ORDER as any)

    await app.inject({
      method: 'GET',
      url: '/api/account/orders/order-001',
      headers: { cookie: sessionCookie },
    })

    expect(mockGetOrderById).toHaveBeenCalledWith('order-001', MOCK_USER.id)
  })
})
