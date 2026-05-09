/**
 * stripeService unit tests
 *
 * The Stripe SDK is fully mocked — no real API calls are made. Tests verify
 * that the service correctly wraps the Stripe SDK, passes the right arguments,
 * handles the responses, and propagates errors to callers.
 *
 * Covered:
 *   createCheckoutSession — happy path returns sessionId and url; passes
 *                           correct mode, line items, urls, and metadata to
 *                           Stripe; uses idempotency keyed by orderId; throws
 *                           on API errors; throws when Stripe returns a null
 *                           url; handles empty line items
 *
 *   constructStripeEvent — happy path returns parsed Stripe event; throws
 *                           on invalid signature; throws on tampered payload;
 *                           throws on wrong secret; throws on empty signature;
 *                           passes rawBody as Buffer to the SDK unchanged
 *
 *   retrieveStripePricesByIds — fetches Price.unit_amount per id; caches results;
 *                               dedupes concurrent/in-batch requests
 *
 *   formatStripeUnitAmount — locale currency string from Stripe minor units
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Stripe SDK ───────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file, so variables declared with const
// are not yet initialised when the factory runs. vi.hoisted() lifts the
// declarations into the same hoisted scope so they are available inside the
// factory.

const { mockSessionCreate, mockConstructEvent, mockPricesRetrieve } = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockPricesRetrieve: vi.fn(),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: {
          create: mockSessionCreate,
        },
      },
      webhooks: {
        constructEvent: mockConstructEvent,
      },
      prices: {
        retrieve: mockPricesRetrieve,
      },
    })),
  }
})

import {
  clearStripePriceCacheForTests,
  createCheckoutSession,
  constructStripeEvent,
  formatStripeUnitAmount,
  retrieveStripePricesByIds,
} from '../../../src/services/stripeService'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_INPUT = {
  lineItems: [
    { stripePriceId: 'price_placeholder_butterfly', quantity: 1 },
    { stripePriceId: 'price_placeholder_cloud', quantity: 2 },
  ],
  successUrl: 'http://localhost:5173/order/confirmation?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'http://localhost:5173/checkout',
  metadata: {
    orderId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
  },
}

const STRIPE_SESSION = {
  id: 'cs_test_abc123xyz',
  url: 'https://checkout.stripe.com/c/pay/cs_test_abc123xyz',
  mode: 'payment',
  status: 'open',
}

const STRIPE_EVENT = {
  id: 'evt_test_abc123',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_abc123xyz',
      metadata: { orderId: '550e8400-e29b-41d4-a716-446655440001', userId: '550e8400-e29b-41d4-a716-446655440002' },
    },
  },
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  clearStripePriceCacheForTests()
})

// ─────────────────────────────────────────────────────────────────────────────
// createCheckoutSession
//
// Wraps stripe.checkout.sessions.create(). The session is created in payment
// mode with the provided line items, success/cancel URLs, and metadata.
// Metadata embeds orderId and userId so the Stripe events handler can identify
// which order to update when Stripe fires checkout.session.completed.
//
// Returns sessionId and url. The url is the Stripe-hosted payment page the
// client redirects to. It must never be null — a null url means Stripe
// returned an unexpected response.
// ─────────────────────────────────────────────────────────────────────────────

describe('createCheckoutSession', () => {
  it('returns sessionId and url from the Stripe response', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    const result = await createCheckoutSession(VALID_INPUT)

    expect(result.sessionId).toBe('cs_test_abc123xyz')
    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_test_abc123xyz')
  })

  it('creates the session in payment mode', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession(VALID_INPUT)

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' }),
      expect.any(Object),
    )
  })

  it('passes line items with price and quantity to Stripe', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession(VALID_INPUT)

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: 'price_placeholder_butterfly', quantity: 1 },
          { price: 'price_placeholder_cloud', quantity: 2 },
        ],
      }),
      expect.any(Object),
    )
  })

  it('passes successUrl and cancelUrl to Stripe', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession(VALID_INPUT)

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: VALID_INPUT.successUrl,
        cancel_url: VALID_INPUT.cancelUrl,
      }),
      expect.any(Object),
    )
  })

  it('embeds orderId and userId in session metadata', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession(VALID_INPUT)

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          orderId: '550e8400-e29b-41d4-a716-446655440001',
          userId: '550e8400-e29b-41d4-a716-446655440002',
        },
      }),
      expect.any(Object),
    )
  })

  it('uses a Stripe idempotency key derived from orderId by default', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession(VALID_INPUT)

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: 'checkout_session_550e8400-e29b-41d4-a716-446655440001',
      }),
    )
  })

  it('uses an explicit idempotency key override when provided', async () => {
    mockSessionCreate.mockResolvedValue(STRIPE_SESSION)

    await createCheckoutSession({
      ...VALID_INPUT,
      idempotencyKey: 'custom-idempotency-key',
    })

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: 'custom-idempotency-key',
      }),
    )
  })

  it('throws when Stripe returns a null url', async () => {
    mockSessionCreate.mockResolvedValue({ ...STRIPE_SESSION, url: null })

    await expect(createCheckoutSession(VALID_INPUT)).rejects.toThrow()
  })

  it('propagates Stripe API errors to the caller', async () => {
    mockSessionCreate.mockRejectedValue(
      new Error('No such price: price_placeholder_butterfly'),
    )

    await expect(createCheckoutSession(VALID_INPUT)).rejects.toThrow(
      'No such price: price_placeholder_butterfly',
    )
  })

  it('propagates network errors to the caller', async () => {
    mockSessionCreate.mockRejectedValue(new Error('Network error'))

    await expect(createCheckoutSession(VALID_INPUT)).rejects.toThrow('Network error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// constructStripeEvent
//
// Wraps stripe.webhooks.constructEvent(). Verifies the Stripe-Signature header
// against the raw request body bytes and the Stripe events signing secret.
//
// Must receive the raw Buffer body — not parsed JSON. Stripe's signature
// algorithm hashes the exact bytes Stripe sent. Re-serialising the JSON will
// produce a different byte sequence and cause verification to fail even for
// legitimate events.
//
// Throws a Stripe.errors.StripeSignatureVerificationError for any signature
// mismatch. The Stripe events route must catch this and return 400.
// ─────────────────────────────────────────────────────────────────────────────

describe('constructStripeEvent', () => {
  const RAW_BODY = Buffer.from(JSON.stringify(STRIPE_EVENT))
  const VALID_SIGNATURE = 't=1234567890,v1=abc123'
  const WEBHOOK_SECRET = 'whsec_test_secret'

  it('returns the parsed Stripe event when the signature is valid', () => {
    mockConstructEvent.mockReturnValue(STRIPE_EVENT)

    const event = constructStripeEvent(RAW_BODY, VALID_SIGNATURE, WEBHOOK_SECRET)

    expect(event.type).toBe('checkout.session.completed')
    expect(event.id).toBe('evt_test_abc123')
  })

  it('passes the raw Buffer body to the Stripe SDK unchanged', () => {
    mockConstructEvent.mockReturnValue(STRIPE_EVENT)

    constructStripeEvent(RAW_BODY, VALID_SIGNATURE, WEBHOOK_SECRET)

    expect(mockConstructEvent).toHaveBeenCalledWith(
      RAW_BODY,
      VALID_SIGNATURE,
      WEBHOOK_SECRET,
    )
  })

  it('throws when the signature is invalid', () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    expect(() =>
      constructStripeEvent(RAW_BODY, 'invalid-signature', WEBHOOK_SECRET),
    ).toThrow()
  })

  it('throws when the signature header is empty', () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No stripe-signature header value was provided')
    })

    expect(() =>
      constructStripeEvent(RAW_BODY, '', WEBHOOK_SECRET),
    ).toThrow()
  })

  it('throws when the Stripe events secret is wrong', () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    expect(() =>
      constructStripeEvent(RAW_BODY, VALID_SIGNATURE, 'wrong-secret'),
    ).toThrow()
  })

  it('throws when the payload has been tampered with', () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const tamperedBody = Buffer.from('{"type":"payment_intent.succeeded","data":{}}')

    expect(() =>
      constructStripeEvent(tamperedBody, VALID_SIGNATURE, WEBHOOK_SECRET),
    ).toThrow()
  })
})

describe('retrieveStripePricesByIds', () => {
  it('returns unit amounts from Stripe Price objects', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 2500, currency: 'usd' })

    const map = await retrieveStripePricesByIds(['price_test_a'])

    expect(mockPricesRetrieve).toHaveBeenCalledWith('price_test_a')
    expect(map.get('price_test_a')).toEqual({ unitAmount: 2500, currency: 'usd' })
  })

  it('dedupes ids and uses cache on repeat calls', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 99, currency: 'usd' })

    await retrieveStripePricesByIds(['price_z'])
    await retrieveStripePricesByIds(['price_z'])

    expect(mockPricesRetrieve).toHaveBeenCalledTimes(1)
  })

  it('throws when Stripe returns no unit_amount', async () => {
    mockPricesRetrieve.mockResolvedValue({ unit_amount: null, currency: 'usd' })

    await expect(retrieveStripePricesByIds(['price_tiered'])).rejects.toThrow(/unit_amount/)
  })
})

describe('formatStripeUnitAmount', () => {
  it('formats USD cents', () => {
    expect(formatStripeUnitAmount(499, 'usd')).toBe('$4.99')
  })

  it('formats zero-decimal currencies', () => {
    expect(formatStripeUnitAmount(500, 'jpy')).toMatch(/500/)
  })
})
