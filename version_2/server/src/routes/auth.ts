import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { signupUser, loginUser, getUserById } from '../services/authService.js'
import { authenticate } from '../middleware/authenticate.js'

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  newsletterOptIn: z.boolean().default(false),
})

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
})

const COOKIE_NAME = 'token'

function setCookie(reply: ReturnType<FastifyInstance['route']>, token: string) {
  // Session cookie: no maxAge = expires when browser closes
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/signup', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const result = signupSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input' })
    }

    const { email, password, newsletterOptIn } = result.data

    try {
      const user = await signupUser(email, password, newsletterOptIn)
      const token = app.jwt.sign({ sub: user.id })
      setCookie(reply, token)
      return reply.status(201).send({ user })
    } catch (err: any) {
      if (err.code === 'EMAIL_TAKEN') {
        return reply.status(409).send({ error: 'Email already in use' })
      }
      throw err
    }
  })

  app.post('/api/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input' })
    }

    const { email, password } = result.data

    try {
      const user = await loginUser(email, password)
      const token = app.jwt.sign({ sub: user.id })
      setCookie(reply, token)
      return reply.send({ user })
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({ error: 'Invalid email or password' })
      }
      throw err
    }
  })

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' })
    return reply.send({ success: true })
  })

  app.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const user = await getUserById(sub)
    if (!user) return reply.status(401).send({ error: 'Unauthorized' })
    return reply.send({ user })
  })
}
