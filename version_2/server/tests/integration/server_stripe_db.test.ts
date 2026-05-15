/**
 * This file tests the complete checkout flow through three components: server, database and Stripe.
 *
 * Tests only run when Stripe env is valid:
 *   STRIPE_SECRET_KEY is a non-placeholder key
 *   STRIPE_WEBHOOK_SECRET is a non-placeholder secret
 *   PRODUCTS contains at least one valid Stripe price_... id
 *
 * Exercises the real stack path:
 *   POST /api/checkout/create-session (session + DB + Stripe sessions.create)
 *   POST /api/stripe-events (raw body + signature verification → PAID + ORDER_PAID)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { buildApp } from '../../src/app'
import { MockEventBus } from '../../src/events/MockEventBus'
import { PRODUCTS } from '../../src/data/products'
import { cleanDb, testPrisma } from './helpers'
import { seedAuthUser } from './authSeed'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? ''
const stripeEventsSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

const catalogProduct = PRODUCTS.find((p) => p.stripePriceId.startsWith('price_'))
const firstStripePriceProductId = catalogProduct?.id ?? ''

const hasRealStripeKey =
  stripeSecretKey.startsWith('sk_test_') && stripeSecretKey !== 'sk_test_placeholder'
const hasRealStripeEventsSecret =
  stripeEventsSecret.startsWith('whsec_') && stripeEventsSecret !== 'whsec_test_placeholder'
const hasCatalogStripePrice = !!catalogProduct

const shouldRun = hasRealStripeKey && hasRealStripeEventsSecret && hasCatalogStripePrice

describe.runIf(shouldRun)('checkout Stripe flow integration', () => {
  let app: FastifyInstance
  let eventBus: MockEventBus

  beforeAll(async () => {
    eventBus = new MockEventBus()
    app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: true, eventBus })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await testPrisma.$disconnect()
  })

  beforeEach(async () => {
    await cleanDb()
    eventBus.clear()
  })

  it('persists cs_ session id on the order then stripe event marks PAID', async () => {
    const { userId, cookie } = await seedAuthUser({ email: 'checkout-flow@example.com' })

    const address = await testPrisma.address.create({
      data: {
        userId,
        line1: '969 Cox Rd',
        city: 'Gastonia',
        state: 'NC',
        postal_code: '28054',
        country: 'US',
        isDefault: true,
      },
    })

    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie },
      payload: {
        addressId: address.id,
        items: [{ productId: firstStripePriceProductId, quantity: 1 }],
      },
    })

    expect(sessionRes.statusCode).toBe(200)
    const { orderId } = sessionRes.json() as { orderId: string; url: string }

    const orderAfterStripe = await testPrisma.order.findUnique({ where: { id: orderId } })
    expect(orderAfterStripe).not.toBeNull()
    expect(orderAfterStripe!.stripeSessionId).toMatch(/^cs_/)
    expect(orderAfterStripe!.status).toBe('PENDING')

    const stripeSessionId = orderAfterStripe!.stripeSessionId

    const stripeEvent = {
      id: `evt_checkout_flow_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeSessionId,
          metadata: { orderId, userId },
        },
      },
    }

    const rawBody = Buffer.from(JSON.stringify(stripeEvent))
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody.toString(),
      secret: stripeEventsSecret,
    })

    const stripeEventsRes = await app.inject({
      method: 'POST',
      url: '/api/stripe-events',
      headers: { 'stripe-signature': signature },
      payload: rawBody,
    })

    expect(stripeEventsRes.statusCode).toBe(200)

    const orderPaid = await testPrisma.order.findUnique({ where: { id: orderId } })
    expect(orderPaid!.status).toBe('PAID')

    const paidEvents = eventBus.eventsOf('ORDER_PAID')
    expect(paidEvents).toHaveLength(1)
    expect(paidEvents[0].orderId).toBe(orderId)
    expect(paidEvents[0].userId).toBe(userId)
  })

  it('handles charge.refunded end-to-end and ignores duplicate delivery', async () => {
    const { userId, cookie } = await seedAuthUser({ email: 'checkout-refund-flow@example.com' })

    const address = await testPrisma.address.create({
      data: {
        userId,
        line1: '969 Cox Rd',
        city: 'Gastonia',
        state: 'NC',
        postal_code: '28054',
        country: 'US',
        isDefault: true,
      },
    })

    const sessionRes = await app.inject({
      method: 'POST',
      url: '/api/checkout/create-session',
      headers: { cookie },
      payload: {
        addressId: address.id,
        items: [{ productId: firstStripePriceProductId, quantity: 1 }],
      },
    })

    expect(sessionRes.statusCode).toBe(200)
    const { orderId } = sessionRes.json() as { orderId: string; url: string }

    const createdOrder = await testPrisma.order.findUnique({ where: { id: orderId } })
    expect(createdOrder).not.toBeNull()
    const stripeSessionId = createdOrder!.stripeSessionId

    // Transition order to PAID first via checkout.session.completed.
    const paidEvent = {
      id: `evt_checkout_paid_for_refund_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeSessionId,
          metadata: { orderId, userId },
        },
      },
    }

    const paidRawBody = Buffer.from(JSON.stringify(paidEvent))
    const paidSignature = Stripe.webhooks.generateTestHeaderString({
      payload: paidRawBody.toString(),
      secret: stripeEventsSecret,
    })

    const paidRes = await app.inject({
      method: 'POST',
      url: '/api/stripe-events',
      headers: { 'stripe-signature': paidSignature },
      payload: paidRawBody,
    })
    expect(paidRes.statusCode).toBe(200)

    const refundedEvent = {
      id: `evt_checkout_refund_${Date.now()}`,
      type: 'charge.refunded',
      data: {
        object: {
          id: `ch_checkout_refund_${Date.now()}`,
          metadata: { orderId },
        },
      },
    }

    const refundedRawBody = Buffer.from(JSON.stringify(refundedEvent))
    const refundedSignature = Stripe.webhooks.generateTestHeaderString({
      payload: refundedRawBody.toString(),
      secret: stripeEventsSecret,
    })

    const firstRefundRes = await app.inject({
      method: 'POST',
      url: '/api/stripe-events',
      headers: { 'stripe-signature': refundedSignature },
      payload: refundedRawBody,
    })
    expect(firstRefundRes.statusCode).toBe(200)

    const orderRefunded = await testPrisma.order.findUnique({ where: { id: orderId } })
    expect(orderRefunded!.status).toBe('REFUNDED')

    // Stripe can redeliver the same event. Handler should be idempotent.
    const duplicateRefundRes = await app.inject({
      method: 'POST',
      url: '/api/stripe-events',
      headers: { 'stripe-signature': refundedSignature },
      payload: refundedRawBody,
    })
    expect(duplicateRefundRes.statusCode).toBe(200)

    const refundEvents = eventBus.eventsOf('ORDER_REFUNDED')
    expect(refundEvents).toHaveLength(1)
    expect(refundEvents[0].orderId).toBe(orderId)
    expect(refundEvents[0].userId).toBe(userId)
  })
})
