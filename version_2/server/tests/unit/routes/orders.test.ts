/**
 * Order route tests — GET /api/account/orders, GET /api/account/orders/:id
 *
 * Strategy:
 *   - orderService is mocked — no DB calls
 *   - A real JWT cookie is obtained via POST /api/auth/login (loginUser mocked)
 *   - skipCsrf: true — CSRF behaviour is tested separately in csrf.test.ts
 *
 * Covered:
 *   GET /api/account/orders     — 401 when unauthenticated; 200 with empty
 *                                 array when no orders; 200 with full order
 *                                 list including items and address
 *   GET /api/account/orders/:id — 401 when unauthenticated; 404 when order
 *                                 does not exist; 404 when order belongs to
 *                                 another user; 200 with full order including
 *                                 items and address
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
  getOrders: vi.fn(),
}))

vi.mock('../../../src/services/orderService', async () => {
  const { buildOrderServiceMock: buildMock } = await import('../../shared/mocks/orderService')
  return buildMock()
})

import { loginUser } from '../../../src/services/authService'
import { getOrdersByUser, getOrderById } from '../../../src/services/orderService'

const mockLogin = vi.mocked(loginUser)
const mockGetOrdersByUser = vi.mocked(getOrdersByUser)
const mockGetOrderById = vi.mocked(getOrderById)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = createMockUser()
const MOCK_ADDRESS = createMockAddress(MOCK_USER.id)

const MOCK_ORDER = {
  id: 'order-001',
  userId: MOCK_USER.id,
  addressId: MOCK_ADDRESS.id,
  status: 'PAID',
  stripeSessionId: 'cs_test_abc123',
  total: 2200,
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
      priceAtPurchase: 2200,
      quantity: 1,
      imageUrl: null,
    },
  ],
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
// GET /api/account/orders
//
// Returns the authenticated user's full order history, newest first. Each
// order includes its line items and shipping address. Returns an empty array
// when the user has placed no orders — never a 404.
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
    mockGetOrdersByUser.mockResolvedValueOnce([])

    const res = await app.inject({
      method: 'GET',
      url: '/api/account/orders',
      headers: { cookie: sessionCookie },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orders).toEqual([])
  })

  it('returns 200 with order list including items and address', async () => {
    mockGetOrdersByUser.mockResolvedValueOnce([MOCK_ORDER] as any)

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

  it('only returns orders for the authenticated user', async () => {
    mockGetOrdersByUser.mockResolvedValueOnce([MOCK_ORDER] as any)

    await app.inject({
      method: 'GET',
      url: '/api/account/orders',
      headers: { cookie: sessionCookie },
    })

    expect(mockGetOrdersByUser).toHaveBeenCalledWith(MOCK_USER.id)
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
