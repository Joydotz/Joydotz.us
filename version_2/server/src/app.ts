import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { errorHandler } from './middleware/errorHandler'

export function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: opts.logger ?? true,
    bodyLimit: 10 * 1024, // 10 KB hard limit
    trustProxy: true,
  })

  app.register(helmet)

  app.register(cors, {
    origin: process.env.FRONTEND_ORIGIN ?? false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
  })

  app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
