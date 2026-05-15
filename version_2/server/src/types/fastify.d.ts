import type { EventBus } from '../events/EventBus.js'
import type { FastifyRequestUser } from './FastifyRequestWithUser.js'

declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EventBus
  }

  interface FastifyRequest {
    user?: FastifyRequestUser
  }
}
