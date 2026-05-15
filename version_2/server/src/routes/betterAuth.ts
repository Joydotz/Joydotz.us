import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth.js'
import { getUserById } from '../services/publicUserService.js'
import { authenticate } from '../middleware/authenticate.js'

async function forwardToBetterAuth(request: FastifyRequest, reply: FastifyReply) {
  const url = new URL(request.url, `${request.protocol}://${request.headers.host}`)
  const headers = fromNodeHeaders(request.headers)

  let body: string | undefined
  if (request.body !== undefined && request.body !== null) {
    body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
  }

  const req = new Request(url.toString(), {
    method: request.method,
    headers,
    body: body && request.method !== 'GET' && request.method !== 'HEAD' ? body : undefined,
  })

  const response = await auth.handler(req)

  reply.status(response.status)
  response.headers.forEach((value, key) => {
    reply.header(key, value)
  })

  const text = await response.text()
  if (!text) return reply.send()
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return reply.send(JSON.parse(text))
  }
  return reply.send(text)
}

export async function betterAuthRoutes(app: FastifyInstance) {
  /** App-shaped session payload for the React client (matches legacy GET /api/auth/me). */
  app.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const user = await getUserById(sub)
    if (!user) return reply.status(401).send({ error: 'Unauthorized' })
    return reply.send({ user })
  })

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: forwardToBetterAuth,
  })
}
