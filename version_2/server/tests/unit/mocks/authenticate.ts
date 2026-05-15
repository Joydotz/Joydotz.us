import { vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { TEST_USER_ID } from '../../shared/fixtures'

/** Request after authenticate (or test mock) has set `user`. */
type FastifyRequestWithUser = FastifyRequest & {
  user: {
    sub: string
    email?: string
  }
}

async function defaultAuth(request: FastifyRequestWithUser, _reply: FastifyReply) {
  request.user = {
    sub: TEST_USER_ID,
    email: 'test@example.com',
  }
}

export const authenticate = vi.fn(defaultAuth)

export function rejectAuthOnce() {
  authenticate.mockImplementationOnce(async (_request, reply) => {
    return reply.status(401).send({ error: 'Unauthorized' })
  })
}

export function resetAuthenticateMock() {
  authenticate.mockReset()
  authenticate.mockImplementation(defaultAuth)
}
