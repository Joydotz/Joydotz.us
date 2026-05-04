import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { errorHandler } from './middleware/errorHandler.js'
import { productRoutes } from './routes/products.js'
import { emailRoutes } from './routes/emails.js'
import { authRoutes } from './routes/auth.js'
import { accountRoutes } from './routes/account.js'

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // required for cookies
  })

  app.register(cookie)

  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'fallback-secret-for-tests-only',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
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
  app.register(authRoutes)
  app.register(accountRoutes)

  return app
}
