import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { getAddresses } from '../services/accountService.js'
import {
  createOrder,
  getOrderByIdForStripeEvent,
  getRecentPendingOrdersByUser,
  getOrderByStripeSessionId,
  tryMarkOrderPaidAfterCheckout,
  updateOrderStatus,
  updateOrderStripeSessionId,
} from '../services/orderService.js'
import { reconcilePaidCheckoutFromStripeSession } from '../services/checkoutSessionReconcile.js'
import {
  createCheckoutSession,
  constructStripeEvent,
  retrieveCheckoutSession,
  retrieveStripePricesByIds,
  shouldVerifyStripeBeforeCheckout,
  verifyStripeCheckoutReadiness,
} from '../services/stripeService.js'
import { PRODUCTS } from '../data/products.js'
import { EventBus } from '../events/EventBus.js'

interface CheckoutRouteOptions {
  skipCsrf?: boolean
  eventBus: EventBus
}

export async function checkoutRoutes(app: FastifyInstance, opts: CheckoutRouteOptions) {
  const buildCartFingerprint = (items: { productId: string; quantity: number }[]) =>
    [...items]
      .sort((a, b) => a.productId.localeCompare(b.productId))
      .map((item) => `${item.productId}:${item.quantity}`)
      .join('|')

  // Override the JSON parser for this entire plugin scope so that the Stripe events
  // route receives a raw Buffer for signature verification.  The create-session
  // handler manually JSON.parses its buffer below.
  // Both routes in this plugin need the raw Buffer:
  // - create-session: receives application/json from the client; manually JSON.parses below
  // - stripe-events: Fastify inject sends Buffer payloads as application/octet-stream;
  //                    real Stripe POSTs use application/json
  // Parse every request body in this plugin scope as a raw Buffer.
  // create-session manually JSON.parses below; stripe-events needs the raw
  // bytes for Stripe signature verification. The catch-all '*' also covers
  // requests sent with no Content-Type (e.g. Fastify inject with a Buffer payload).
  const rawBufferParser = (_req: any, body: Buffer, done: any) => done(null, body)
  app.addContentTypeParser('application/json', { parseAs: 'buffer', bodyLimit: 1024 * 1024 }, rawBufferParser)
  app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: 1024 * 1024 }, rawBufferParser)

  const checkoutSessionIdSchema = z.string().regex(/^cs_[a-zA-Z0-9_]+$/)

  // ── GET /api/checkout/order-by-session — post-Stripe return (no auth) ────────

  app.get('/api/checkout/order-by-session', async (request, reply) => {
    const parsed = z
      .object({ session_id: checkoutSessionIdSchema })
      .safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid session' })
    }

    let stripeSession
    try {
      stripeSession = await retrieveCheckoutSession(parsed.data.session_id)
    } catch {
      return reply.status(404).send({ error: 'Session not found' })
    }

    if (stripeSession.payment_status !== 'paid') {
      return reply.status(404).send({ error: 'Payment not completed' })
    }

    const orderIdMeta = stripeSession.metadata?.orderId
    if (!orderIdMeta || typeof orderIdMeta !== 'string') {
      return reply.status(404).send({ error: 'Order not found' })
    }

    const order = await getOrderByStripeSessionId(stripeSession.id)
    if (!order || order.id !== orderIdMeta) {
      return reply.status(404).send({ error: 'Order not found' })
    }

    if (order.status === 'PENDING') {
      const reconciled = await reconcilePaidCheckoutFromStripeSession(stripeSession, opts.eventBus)
      if (reconciled?.order.status === 'PAID') {
        return reply.send({ order: reconciled.order })
      }
      return reply.status(202).send({
        awaitingWebhook: true,
        message: 'Payment received — confirming your order.',
      })
    }

    return reply.send({ order })
  })

  // ── POST /api/checkout/create-session ────────────────────────────────────────

  app.post(
    '/api/checkout/create-session',
    { preHandler: [authenticate, ...(opts.skipCsrf ? [] : [app.csrfProtection as any])] },
    async (request, reply) => {
      const { sub: userId } = request.user as { sub: string }

      if (shouldVerifyStripeBeforeCheckout()) {
        const readiness = await verifyStripeCheckoutReadiness()
        if (!readiness.ok) {
          return reply.status(503).send({
            error: 'Stripe is not ready for checkout',
            stripeReadiness: readiness,
          })
        }
      }

      // 1. Validate body
      const schema = z.object({
        addressId: z.string().min(1),
        items: z
          .array(z.object({ productId: z.string(), quantity: z.number().int().min(1) }))
          .min(1),
      })
      let rawJson: unknown
      try {
        rawJson = JSON.parse((request.body as Buffer).toString())
      } catch {
        return reply.status(400).send({ error: 'Invalid input' })
      }
      const parsed = schema.safeParse(rawJson)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input' })
      }
      const { addressId, items } = parsed.data

      // 2. Verify address ownership
      const addresses = await getAddresses(userId)
      const address = addresses.find((a) => a.id === addressId)
      if (!address) {
        return reply.status(404).send({ error: 'Address not found' })
      }

      // 3. Resolve SKUs server-side; amounts always from Stripe Prices — never trust client prices
      const productMap = new Map(PRODUCTS.map((p) => [p.id, p]))
      const preliminary: { product: (typeof PRODUCTS)[number]; quantity: number }[] = []
      for (const item of items) {
        const product = productMap.get(item.productId)
        if (!product) {
          return reply.status(400).send({ error: `Unknown product: ${item.productId}` })
        }
        preliminary.push({ product, quantity: item.quantity })
      }

      let priceSnapshots: Map<string, { unitAmount: number; currency: string }>
      try {
        priceSnapshots = await retrieveStripePricesByIds(preliminary.map((x) => x.product.stripePriceId))
      } catch {
        return reply.status(503).send({ error: 'Pricing unavailable' })
      }

      const resolvedItems = []
      for (const { product, quantity } of preliminary) {
        const snap = priceSnapshots.get(product.stripePriceId)
        if (!snap) {
          return reply.status(503).send({ error: 'Pricing unavailable' })
        }
        resolvedItems.push({
          productId: product.id,
          name: product.name,
          priceAtPurchase: snap.unitAmount,
          quantity,
          imageUrl: product.imageUrl,
          stripePriceId: product.stripePriceId,
        })
      }

      // 4. Calculate total server-side
      const total = resolvedItems.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0)

      // 5. Reuse an equivalent pending checkout attempt when possible to avoid
      // accidental duplicate sessions/orders from reload/double-click retries.
      const requestCartFingerprint = buildCartFingerprint(
        resolvedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      )
      const pendingOrders = await getRecentPendingOrdersByUser(userId)
      const reusableOrder = pendingOrders.find((pendingOrder) => {
        if (pendingOrder.addressId !== addressId) return false
        if (pendingOrder.total !== total) return false

        const pendingFingerprint = buildCartFingerprint(
          pendingOrder.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        )
        return pendingFingerprint === requestCartFingerprint
      })

      // 6. Create a temporary PENDING order only when no equivalent intent exists.
      //    stripeSessionId starts as a placeholder — replaced with the real `cs_...`
      //    immediately after Stripe creates the Checkout Session (step 7).
      const order = reusableOrder ?? await createOrder({
        userId,
        addressId,
        stripeSessionId: `pending_${userId}_${Date.now()}`,
        total,
        items: resolvedItems,
      })

      // 7. Create Stripe Checkout Session with orderId embedded in metadata.
      //    stripeService uses an orderId-based idempotency key, so duplicate
      //    retries of the same order reuse the same Stripe session.
      const origin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
      const { url, sessionId } = await createCheckoutSession({
        lineItems: resolvedItems.map((i) => ({ stripePriceId: i.stripePriceId, quantity: i.quantity })),
        successUrl: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/cart`,
        metadata: { orderId: order.id, userId },
      })

      await updateOrderStripeSessionId(order.id, sessionId)

      return reply.send({ url, orderId: order.id })
    },
  )

  // ── POST /api/stripe-events ───────────────────────────────────────────────────

  app.post('/api/stripe-events', async (request, reply) => {
    const signature = request.headers['stripe-signature']
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'Missing stripe-signature header' })
    }

    let event
    try {
      event = constructStripeEvent(
        request.body as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? '',
      )
    } catch {
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as { id: string; metadata: { orderId: string; userId: string } }

      const order = await getOrderByStripeSessionId(session.id)
      if (!order) return reply.send({ received: true })

      const transitioned = await tryMarkOrderPaidAfterCheckout(order.id)
      if (transitioned) {
        const paid = await getOrderByStripeSessionId(session.id)
        if (paid) {
          await opts.eventBus.publish('ORDER_PAID', {
            orderId: paid.id,
            userId: paid.userId,
            email: paid.user.email,
            total: paid.total,
          })
        }
      }

      return reply.send({ received: true })
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as unknown as { metadata: { orderId: string } }
      const orderId = charge.metadata?.orderId
      if (!orderId) return reply.send({ received: true })

      const order = await getOrderByIdForStripeEvent(orderId)
      if (!order) return reply.send({ received: true })
      if (order.status === 'REFUNDED') return reply.send({ received: true })

      await updateOrderStatus(order.id, 'REFUNDED')

      await opts.eventBus.publish('ORDER_REFUNDED', {
        orderId: order.id,
        userId: order.userId,
        email: order.user.email,
        total: order.total,
      })
    }

    return reply.send({ received: true })
  })
}
