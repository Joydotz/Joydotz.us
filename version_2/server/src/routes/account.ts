import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import { csrfProtectionForMutations } from '../middleware/csrfForMutations.js'
import {
  setNewsletterOptIn,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../services/accountService.js'
import {
  dismissPendingOrder,
  getOrderById,
  getPaidOrdersByUser,
  getResumablePendingOrdersByUser,
  updateShippingAddressForPaidOrder,
} from '../services/orderService.js'
import { retrieveCheckoutSession } from '../services/stripeService.js'
import { safeAddr } from '../lib/validation.js'

const RESUME_CHECKOUT_WINDOW_MS = 60 * 60 * 1000
const checkoutSessionIdRegex = /^cs_[a-zA-Z0-9_]+$/

const addressSchema = z.object({
  line1: safeAddr(z.string().trim().min(1).max(255)),
  line2: safeAddr(z.string().trim().max(255)).optional(),
  city: safeAddr(z.string().trim().min(1).max(100)),
  state: safeAddr(z.string().trim().min(1).max(100)),
  // alphanumeric, spaces, and hyphens only — covers US ZIP, UK, CA, AU formats
  postal_code: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9 \-]+$/, 'Invalid postal code'),
  // exactly 2 alpha characters — ISO 3166-1 alpha-2
  country: z.string().trim().length(2).regex(/^[A-Za-z]{2}$/, 'Country must be a 2-letter code').default('US'),
})

interface AccountRouteOptions {
  skipCsrf?: boolean
}

export async function accountRoutes(app: FastifyInstance, opts: AccountRouteOptions = {}) {
  // All account routes require authentication and CSRF verification
  app.addHook('preHandler', authenticate)
  if (!opts.skipCsrf) {
    app.addHook('preHandler', csrfProtectionForMutations(app))
  }

  // ── POST /api/account/news — toggle newsletter opt-in ──────────────────────

  app.post('/api/account/news', async (request, reply) => {
    const { sub } = request.user as { sub: string }

    const result = z.object({ newsletterOptIn: z.boolean() }).safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input' })
    }

    await setNewsletterOptIn(sub, result.data.newsletterOptIn)
    return reply.send({ success: true })
  })

  // ── GET /api/account/addresses — list all addresses for the logged-in user ──

  app.get('/api/account/addresses', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const addresses = await getAddresses(sub)
    return reply.send({ addresses })
  })

  // ── POST /api/account/addresses — create a new address ─────────────────────

  app.post('/api/account/addresses', async (request, reply) => {
    const { sub } = request.user as { sub: string }

    const result = addressSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid address' })
    }

    const address = await createAddress(sub, result.data)
    return reply.status(201).send({ address })
  })

  // ── POST /api/account/addresses/:id — update fields on an existing address ──

  app.post('/api/account/addresses/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const result = addressSchema.partial().safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid address' })
    }

    try {
      const address = await updateAddress(sub, id, result.data)
      return reply.send({ address })
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: 'Address not found' })
      throw err
    }
  })

  // ── DELETE /api/account/addresses/:id — remove an address ──────────────────

  app.delete('/api/account/addresses/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      await deleteAddress(sub, id)
      return reply.send({ success: true })
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: 'Address not found' })
      throw err
    }
  })

  // ── POST /api/account/addresses/:id/default — set an address as default ────

  app.post('/api/account/addresses/:id/default', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      await setDefaultAddress(sub, id)
      return reply.send({ success: true })
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: 'Address not found' })
      throw err
    }
  })

  // ── GET /api/account/orders/incomplete — recent unpaid checkouts (resume UX) ─

  app.get('/api/account/orders/incomplete', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const orders = await getResumablePendingOrdersByUser(sub, RESUME_CHECKOUT_WINDOW_MS)
    return reply.send({ orders })
  })

  // ── GET /api/account/orders — paid/shipped history (no PENDING / CANCELLED) ──

  app.get('/api/account/orders', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const orders = await getPaidOrdersByUser(sub)
    return reply.send({ orders })
  })

  // ── POST /api/account/orders/:id/resume-checkout — Stripe Checkout URL ───────

  app.post('/api/account/orders/:id/resume-checkout', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const order = await getOrderById(id, sub)
    if (!order || order.status !== 'PENDING') {
      return reply.status(404).send({ error: 'Order not found' })
    }

    const minCreated = Date.now() - RESUME_CHECKOUT_WINDOW_MS
    if (order.createdAt.getTime() < minCreated) {
      return reply.status(410).send({ error: 'Checkout window expired' })
    }

    if (!checkoutSessionIdRegex.test(order.stripeSessionId)) {
      return reply.status(410).send({ error: 'Checkout session unavailable' })
    }

    let session
    try {
      session = await retrieveCheckoutSession(order.stripeSessionId)
    } catch {
      return reply.status(410).send({ error: 'Checkout session unavailable' })
    }

    if (session.status !== 'open' || !session.url) {
      return reply.status(410).send({ error: 'Checkout session no longer available' })
    }

    return reply.send({ url: session.url })
  })

  // ── POST /api/account/orders/:id/dismiss-incomplete — hide resume strip ───────

  app.post('/api/account/orders/:id/dismiss-incomplete', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const dismissed = await dismissPendingOrder(id, sub)
    if (!dismissed) return reply.status(404).send({ error: 'Order not found' })
    return reply.send({ success: true })
  })

  // ── POST /api/account/orders/:id/shipping-address — PAID orders only ─────────

  app.post('/api/account/orders/:id/shipping-address', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const result = addressSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid address' })
    }

    try {
      const address = await updateShippingAddressForPaidOrder(id, sub, result.data)
      return reply.send({ address })
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return reply.status(404).send({ error: 'Order not found' })
      throw err
    }
  })

  // ── GET /api/account/orders/:id — get a single order by ID ───────────────────

  app.get('/api/account/orders/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const order = await getOrderById(id, sub)
    if (!order) return reply.status(404).send({ error: 'Order not found' })
    return reply.send({ order })
  })
}
