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
  getOrders,
} from '../services/accountService.js'

const addressSchema = z.object({
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().length(2).default('US'),
})

export async function accountRoutes(app: FastifyInstance) {
  // All account routes require authentication
  app.addHook('preHandler', authenticate)

  // ── Newsletter ──────────────────────────────────────────────────────────────

  app.patch('/api/account', async (request, reply) => {
    const { sub } = request.user as { sub: string }

    const result = z.object({ newsletterOptIn: z.boolean() }).safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input' })
    }

    await setNewsletterOptIn(sub, result.data.newsletterOptIn)
    return reply.send({ success: true })
  })

  // ── Addresses ───────────────────────────────────────────────────────────────

  app.get('/api/account/addresses', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const addresses = await getAddresses(sub)
    return reply.send({ addresses })
  })

  app.post('/api/account/addresses', async (request, reply) => {
    const { sub } = request.user as { sub: string }

    const result = addressSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid address' })
    }

    const address = await createAddress(sub, result.data)
    return reply.status(201).send({ address })
  })

  app.patch('/api/account/addresses/:id', async (request, reply) => {
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

  app.patch('/api/account/addresses/:id/default', async (request, reply) => {
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

  // ── Orders ──────────────────────────────────────────────────────────────────

  app.get('/api/account/orders', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const orders = await getOrders(sub)
    return reply.send({ orders })
  })
}
