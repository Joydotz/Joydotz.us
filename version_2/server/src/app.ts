import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { errorHandler } from './middleware/errorHandler'
import { productRoutes } from './routes/products'
import { emailRoutes } from './routes/emails'

interface AppOptions {
  logger?: boolean
  skipRateLimit?: boolean
}

export function buildApp(opts: AppOptions = {}) {
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

  if (!opts.skipRateLimit) {
    app.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: '1 minute',
    })
  }

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({ status: 'ok' }))
  app.register(productRoutes)
  app.register(emailRoutes, { skipRateLimit: opts.skipRateLimit ?? false })

  return app
}
