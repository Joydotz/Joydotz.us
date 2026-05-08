/**
 * stripeService integration tests
 *
 * These tests hit real Stripe test-mode behavior (no SDK mocks).
 * They are opt-in and only run when:
 *   RUN_STRIPE_INTEGRATION=1
 *   STRIPE_SECRET_KEY is a non-placeholder key
 *   STRIPE_WEBHOOK_SECRET is a non-placeholder secret
 *   PRODUCTS contains at least one valid Stripe price_... id
 */

import { describe, it, expect } from 'vitest'
import Stripe from 'stripe'
import { constructWebhookEvent, createCheckoutSession } from '../../src/services/stripeService'
import { PRODUCTS } from '../../src/data/products'

const runStripeIntegration = process.env.RUN_STRIPE_INTEGRATION === '1'
const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

const firstStripePriceId =
  PRODUCTS.find((product) => product.stripePriceId.startsWith('price_'))?.stripePriceId ?? ''

const hasRealStripeKey =
  stripeSecretKey.startsWith('sk_test_') && stripeSecretKey !== 'sk_test_placeholder'
const hasRealWebhookSecret =
  stripeWebhookSecret.startsWith('whsec_') && stripeWebhookSecret !== 'whsec_test_placeholder'
const hasCatalogStripePrice = firstStripePriceId.startsWith('price_')

const shouldRun =
  runStripeIntegration && hasRealStripeKey && hasRealWebhookSecret && hasCatalogStripePrice

describe.runIf(shouldRun)('stripeService integration (real Stripe)', () => {
  it('creates a real Checkout Session in Stripe test mode', async () => {
    const now = Date.now()

    const result = await createCheckoutSession({
      lineItems: [{ stripePriceId: firstStripePriceId, quantity: 1 }],
      successUrl: `${frontendOrigin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendOrigin}/cart`,
      metadata: {
        orderId: `integration-order-${now}`,
        userId: `integration-user-${now}`,
      },
    })

    expect(result.sessionId).toMatch(/^cs_/)
    expect(result.url).toContain('checkout.stripe.com')
  })

  it('propagates Stripe API errors when request data is invalid', async () => {
    const now = Date.now()

    await expect(
      createCheckoutSession({
        // Force a real Stripe-side validation failure.
        lineItems: [{ stripePriceId: 'price_does_not_exist_for_integration_test', quantity: 1 }],
        successUrl: `${frontendOrigin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendOrigin}/cart`,
        metadata: {
          orderId: `integration-order-fail-${now}`,
          userId: `integration-user-fail-${now}`,
        },
      }),
    ).rejects.toThrow()
  })

  it('returns an error when line items are empty', async () => {
    const now = Date.now()

    await expect(
      createCheckoutSession({
        lineItems: [],
        successUrl: `${frontendOrigin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${frontendOrigin}/cart`,
        metadata: {
          orderId: `integration-order-empty-${now}`,
          userId: `integration-user-empty-${now}`,
        },
      }),
    ).rejects.toThrow()
  })

  it('reuses the same session for duplicate retries of the same order', async () => {
    const now = Date.now()
    const baseInput = {
      lineItems: [{ stripePriceId: firstStripePriceId, quantity: 1 }],
      successUrl: `${frontendOrigin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendOrigin}/cart`,
    }

    const [first, second] = await Promise.all([
      createCheckoutSession({
        ...baseInput,
        metadata: {
          orderId: `integration-order-duplicate-${now}`,
          userId: `integration-user-duplicate-${now}`,
        },
      }),
      createCheckoutSession({
        ...baseInput,
        metadata: {
          orderId: `integration-order-duplicate-${now}`,
          userId: `integration-user-duplicate-${now}`,
        },
      }),
    ])

    expect(first.sessionId).toMatch(/^cs_/)
    expect(second.sessionId).toMatch(/^cs_/)
    expect(first.sessionId).toBe(second.sessionId)
  })

  it('creates a new session for a genuinely new checkout intent', async () => {
    const now = Date.now()
    const baseInput = {
      lineItems: [{ stripePriceId: firstStripePriceId, quantity: 1 }],
      successUrl: `${frontendOrigin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendOrigin}/cart`,
    }

    const first = await createCheckoutSession({
      ...baseInput,
      metadata: {
        orderId: `integration-order-intent-${now}-1`,
        userId: `integration-user-intent-${now}`,
      },
    })

    // Simulate a genuinely new checkout intent (different order/cart attempt).
    const second = await createCheckoutSession({
      ...baseInput,
      metadata: {
        orderId: `integration-order-intent-${now}-2`,
        userId: `integration-user-intent-${now}`,
      },
    })

    expect(first.sessionId).toMatch(/^cs_/)
    expect(second.sessionId).toMatch(/^cs_/)
    expect(first.sessionId).not.toBe(second.sessionId)
  })

  it('verifies a valid Stripe webhook signature and rejects invalid signatures', () => {
    const payload = {
      id: 'evt_integration_001',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_integration_001', metadata: { orderId: 'order-001', userId: 'user-001' } } },
    }
    const rawBody = Buffer.from(JSON.stringify(payload))

    const validSignature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody.toString(),
      secret: stripeWebhookSecret,
    })

    const event = constructWebhookEvent(rawBody, validSignature, stripeWebhookSecret)
    expect(event.id).toBe('evt_integration_001')
    expect(event.type).toBe('checkout.session.completed')

    const invalidSignature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody.toString(),
      secret: 'whsec_wrong_secret',
    })

    expect(() =>
      constructWebhookEvent(rawBody, invalidSignature, stripeWebhookSecret),
    ).toThrow()
  })

  it('rejects replayed signatures that are outside Stripe tolerance window', () => {
    const payload = {
      id: 'evt_integration_old_001',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_integration_old_001', metadata: { orderId: 'order-old-001', userId: 'user-old-001' } } },
    }
    const rawBody = Buffer.from(JSON.stringify(payload))

    // Stripe default tolerance is 300 seconds. Use a much older timestamp.
    const oldTimestamp = Math.floor(Date.now() / 1000) - 3600
    const oldSignature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody.toString(),
      secret: stripeWebhookSecret,
      timestamp: oldTimestamp,
    })

    expect(() =>
      constructWebhookEvent(rawBody, oldSignature, stripeWebhookSecret),
    ).toThrow()
  })

  it('rejects a payload that is modified after signature generation', () => {
    const originalPayload = {
      id: 'evt_integration_tamper_001',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_integration_tamper_001', metadata: { orderId: 'order-tamper-001', userId: 'user-tamper-001' } } },
    }
    const originalRawBody = Buffer.from(JSON.stringify(originalPayload))

    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: originalRawBody.toString(),
      secret: stripeWebhookSecret,
    })

    const tamperedPayload = {
      ...originalPayload,
      id: 'evt_integration_tamper_002',
    }
    const tamperedRawBody = Buffer.from(JSON.stringify(tamperedPayload))

    expect(() =>
      constructWebhookEvent(tamperedRawBody, signature, stripeWebhookSecret),
    ).toThrow()
  })
})
