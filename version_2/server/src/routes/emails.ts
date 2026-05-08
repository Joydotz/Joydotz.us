import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { saveEmail } from '../services/emailService'
import { safe } from '../lib/validation.js'
import { csrfProtectionForMutations } from '../middleware/csrfForMutations.js'

const bodySchema = z.object({
  email: safe(z.string().email().max(255)),
  source: z.enum(['newsletter', 'checkout']).default('newsletter'),
})

interface EmailRouteOptions {
  skipRateLimit?: boolean
  skipCsrf?: boolean
}

export async function emailRoutes(
  app: FastifyInstance,
  opts: EmailRouteOptions,
) {
  if (!opts.skipCsrf) {
    app.addHook('preHandler', csrfProtectionForMutations(app))
  }

  app.post(
    '/api/emails',
    {
      config: opts.skipRateLimit
        ? {}
        : { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      const result = bodySchema.safeParse(request.body)

      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid email address' })
      }

      const { email, source } = result.data
      await saveEmail(email, source)

      return reply.status(200).send({ success: true })
    },
  )
}
