import type { EventBus } from '../events/EventBus.js'

declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EventBus
  }
}
