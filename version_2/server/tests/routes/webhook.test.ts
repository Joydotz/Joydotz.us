/**
 * POST /api/webhooks/stripe route tests
 *
 * Strategy:
 *   - stripeService.constructWebhookEvent is mocked to control signature
 *     verification without real Stripe keys
 *   - orderService is mocked — no DB calls
 *   - MockEventBus is passed into buildApp to assert Kafka event publishing
 *   - The route must receive raw body bytes — tests send a Buffer payload
 *     with content-type application/json
 *   - This route is intentionally exempt from CSRF and authentication —
 *     security relies entirely on Stripe signature verification
 *
 * Covered:
 *   Signature verification  — 400 when stripe-signature header is missing;
 *                             400 when signature is invalid or tampered
 *   checkout.session.completed — order updated to PAID; ORDER_PAID event
 *                             published to Kafka; returns 200
 *   Idempotency             — already-PAID order is not processed again;
 *                             returns 200 immediately
 *   charge.refunded         — order updated to REFUNDED; ORDER_REFUNDED
 *                             event published; returns 200
 *   Unknown event types     — silently ignored, returns 200
 *   Order not found         — returns 200 (no-op) to prevent Stripe retries
 *                             for genuinely missing orders
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app'
import { MockEventBus } from '../../src/events/MockEventBus'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../src/services/stripeService', () => ({
  createCheckoutSession: vi.fn(),
  constructWebhookEvent: vi.fn(),
}))

vi.mock('../../src/services/orderService', () => ({
  createOrder: vi.fn(),
  getRecentPendingOrdersByUser: vi.fn(),
  getOrdersByUser: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByIdForWebhook: vi.fn(),
  getOrderByStripeSessionId: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateOrderStripeSessionId: vi.fn(),
  shipOrder: vi.fn(),
  markDelivered: vi.fn(),
}))

vi.mock('../../src/services/authService', () => ({
  signupUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
}))

vi.mock('../../src/services/accountService', () => ({
  setNewsletterOptIn: vi.fn(),
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
  getOrders: vi.fn(),
}))

import { constructWebhookEvent } from '../../src/services/stripeService'
import { getOrderByIdForWebhook, getOrderByStripeSessionId, updateOrderStatus } from '../../src/services/orderService'

const mockConstructEvent = vi.mocked(constructWebhookEvent)
const mockGetOrderBySession = vi.mocked(getOrderByStripeSessionId)
const mockGetOrderByIdForWebhook = vi.mocked(getOrderByIdForWebhook)
const mockUpdateOrderStatus = vi.mocked(updateOrderStatus)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_ID = 'cs_test_abc123'
const ORDER_ID = 'order-001'
const USER_ID = 'user-abc-123'

const MOCK_ORDER_PENDING = {
  id: ORDER_ID,
  userId: USER_ID,
  addressId: 'addr-001',
  status: 'PENDING',
  stripeSessionId: SESSION_ID,
  total: 2200,
  createdAt: new Date('2026-01-01'),
  items: [],
  address: { line1: '969 Cox Rd', city: 'Gastonia', state: 'NC', postal_code: '28054', country: 'US' },
  user: { email: 'test@example.com' },
}

const MOCK_ORDER_PAID = { ...MOCK_ORDER_PENDING, status: 'PAID' }

const SESSION_COMPLETED_EVENT = {
  id: 'evt_test_001',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: SESSION_ID,
      metadata: { orderId: ORDER_ID, userId: USER_ID },
    },
  },
}

const CHARGE_REFUNDED_EVENT = {
  id: 'evt_test_002',
  type: 'charge.refunded',
  data: {
    object: {
      payment_intent: 'pi_test_abc123',
      metadata: { orderId: ORDER_ID },
    },
  },
}

const RAW_BODY = Buffer.from(JSON.stringify(SESSION_COMPLETED_EVENT))
const VALID_SIGNATURE = 't=1234567890,v1=abc123'

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance
let eventBus: MockEventBus

beforeAll(async () => {
  eventBus = new MockEventBus()
  app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: true, eventBus })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  eventBus.clear()
})

// ─────────────────────────────────────────────────────────────────────────────
// Signature verification
//
// The stripe-signature header must be present and valid on every request.
// Stripe uses it to prove the event originated from Stripe and was not
// forged or tampered with. Any failure here must return 400 so Stripe
// does not retry — a bad signature means the request is not from Stripe.
// ─────────────────────────────────────────────────────────────────────────────

describe('signature verification', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload: RAW_BODY,
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when the signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'invalid-signature' },
      payload: RAW_BODY,
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when the payload has been tampered with', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const tamperedBody = Buffer.from('{"type":"payment_intent.succeeded","data":{}}')

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: tamperedBody,
    })

    expect(res.statusCode).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// checkout.session.completed
//
// Fired by Stripe when a customer successfully completes payment. The handler
// must update the order to PAID and publish an ORDER_PAID event to Kafka so
// the worker sends the confirmation email asynchronously. Stripe must receive
// a 200 promptly — email sending must not block the response.
// ─────────────────────────────────────────────────────────────────────────────

describe('checkout.session.completed', () => {
  it('returns 200 and updates order to PAID', async () => {
    mockConstructEvent.mockReturnValue(SESSION_COMPLETED_EVENT as any)
    mockGetOrderBySession.mockResolvedValueOnce(MOCK_ORDER_PENDING as any)
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...MOCK_ORDER_PENDING, status: 'PAID' } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: RAW_BODY,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'PAID')
  })

  it('publishes ORDER_PAID event to Kafka via EventBus', async () => {
    mockConstructEvent.mockReturnValue(SESSION_COMPLETED_EVENT as any)
    mockGetOrderBySession.mockResolvedValueOnce(MOCK_ORDER_PENDING as any)
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...MOCK_ORDER_PENDING, status: 'PAID' } as any)

    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: RAW_BODY,
    })

    const events = eventBus.eventsOf('ORDER_PAID')
    expect(events).toHaveLength(1)
    expect(events[0].orderId).toBe(ORDER_ID)
    expect(events[0].userId).toBe(USER_ID)
  })

  it('returns 200 immediately when order is already PAID (idempotency)', async () => {
    mockConstructEvent.mockReturnValue(SESSION_COMPLETED_EVENT as any)
    mockGetOrderBySession.mockResolvedValueOnce(MOCK_ORDER_PAID as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: RAW_BODY,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(eventBus.eventsOf('ORDER_PAID')).toHaveLength(0)
  })

  it('returns 200 when order is not found — no-op', async () => {
    mockConstructEvent.mockReturnValue(SESSION_COMPLETED_EVENT as any)
    mockGetOrderBySession.mockResolvedValueOnce(null)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: RAW_BODY,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// charge.refunded
//
// Fired when a payment is refunded via the Stripe dashboard or API. The
// handler must update the order to REFUNDED and publish an ORDER_REFUNDED
// event so the worker sends a refund notification email to the customer.
// ─────────────────────────────────────────────────────────────────────────────

describe('charge.refunded', () => {
  const REFUND_RAW_BODY = Buffer.from(JSON.stringify(CHARGE_REFUNDED_EVENT))

  it('returns 200 and updates order to REFUNDED', async () => {
    mockConstructEvent.mockReturnValue(CHARGE_REFUNDED_EVENT as any)
    mockGetOrderByIdForWebhook.mockResolvedValueOnce(MOCK_ORDER_PAID as any)
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...MOCK_ORDER_PAID, status: 'REFUNDED' } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: REFUND_RAW_BODY,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'REFUNDED')
  })

  it('publishes ORDER_REFUNDED event to Kafka via EventBus', async () => {
    mockConstructEvent.mockReturnValue(CHARGE_REFUNDED_EVENT as any)
    mockGetOrderByIdForWebhook.mockResolvedValueOnce(MOCK_ORDER_PAID as any)
    mockUpdateOrderStatus.mockResolvedValueOnce({ ...MOCK_ORDER_PAID, status: 'REFUNDED' } as any)

    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: REFUND_RAW_BODY,
    })

    const events = eventBus.eventsOf('ORDER_REFUNDED')
    expect(events).toHaveLength(1)
    expect(events[0].orderId).toBe(ORDER_ID)
  })

  it('returns 200 immediately when order is already REFUNDED (idempotency)', async () => {
    mockConstructEvent.mockReturnValue(CHARGE_REFUNDED_EVENT as any)
    mockGetOrderByIdForWebhook.mockResolvedValueOnce({ ...MOCK_ORDER_PAID, status: 'REFUNDED' } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: REFUND_RAW_BODY,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(eventBus.eventsOf('ORDER_REFUNDED')).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Unknown event types
//
// Stripe sends many event types beyond the ones we handle. Unrecognised events
// must be silently ignored and return 200 — otherwise Stripe would retry them
// indefinitely thinking the server failed.
// ─────────────────────────────────────────────────────────────────────────────

describe('unknown event types', () => {
  it('returns 200 without processing for an unhandled event type', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_test_003',
      type: 'customer.created',
      data: { object: {} },
    } as any)

    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': VALID_SIGNATURE },
      payload: Buffer.from('{}'),
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
    expect(eventBus.published).toHaveLength(0)
  })
})
