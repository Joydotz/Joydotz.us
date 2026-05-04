import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { saveEmail } from '../services/emailService'

const bodySchema = z.object({
  email: z.string().email().max(255),
  source: z.enum(['newsletter', 'checkout']).default('newsletter'),
})

interface EmailRouteOptions {
  skipRateLimit?: boolean
}

export async function emailRoutes(
  app: FastifyInstance,
  opts: EmailRouteOptions,
) {
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
