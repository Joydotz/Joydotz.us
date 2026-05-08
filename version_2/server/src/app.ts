import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import csrf from '@fastify/csrf-protection'
import { errorHandler } from './middleware/errorHandler.js'
import { productRoutes } from './routes/products.js'
import { emailRoutes } from './routes/emails.js'
import { authRoutes } from './routes/auth.js'
import { accountRoutes } from './routes/account.js'
import { checkoutRoutes } from './routes/checkout.js'
import { EventBus } from './events/EventBus.js'
import { MockEventBus } from './events/MockEventBus.js'

interface AppOptions {
  logger?: boolean
  skipRateLimit?: boolean
  skipCsrf?: boolean
  eventBus?: EventBus
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
    allowedHeaders: ['Content-Type', 'x-csrf-token'],
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

  app.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieOpts: {
      httpOnly: true,
      // Lax so JWT + CSRF cookies survive top-level redirects back from Stripe Checkout (cross-site).
      // Strict breaks post-payment return with Vite proxying `/api` on the dev SPA origin.
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
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

  // ── GET /api/csrf-token — fetch a CSRF token on app load ──────────────────
  app.get('/api/csrf-token', async (_request, reply) => {
    const token = await reply.generateCsrf()
    return { token }
  })

  const eventBus = opts.eventBus ?? new MockEventBus()

  app.register(productRoutes)
  app.register(emailRoutes, { skipRateLimit: opts.skipRateLimit ?? false, skipCsrf: opts.skipCsrf ?? false })
  app.register(authRoutes, { skipCsrf: opts.skipCsrf ?? false })
  app.register(accountRoutes, { skipCsrf: opts.skipCsrf ?? false })
  app.register(checkoutRoutes, { skipCsrf: opts.skipCsrf ?? false, eventBus })

  return app
}
