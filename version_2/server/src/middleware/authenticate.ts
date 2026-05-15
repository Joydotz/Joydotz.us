import type { FastifyRequest, FastifyReply } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth.js'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  })

  if (!session?.user) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  request.user = {
    sub: session.user.id,
    email: session.user.email,
  }
}
