import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import {
  setNewsletterOptIn,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../services/accountService.js'
import { getOrdersByUser, getOrderById } from '../services/orderService.js'
import { safeAddr } from '../lib/validation.js'

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
    app.addHook('preHandler', app.csrfProtection as any) // type mismatch between @fastify/csrf-protection v6 and Fastify v4 hook overloads
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

  // ── GET /api/account/orders — list all orders for the logged-in user ─────────

  app.get('/api/account/orders', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const orders = await getOrdersByUser(sub)
    return reply.send({ orders })
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
