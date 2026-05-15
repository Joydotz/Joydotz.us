import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config.js'

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const isProd = config.nodeEnv === 'production'

  // Log full error server-side always
  reply.log.error(error)

  // Validation errors from Fastify schema or Zod — safe to expose shape
  if (error.statusCode === 400 || error.validation) {
    reply.status(400).send({ error: 'Invalid request' })
    return
  }

  if (error.statusCode === 403) {
    reply.status(403).send({ error: 'Forbidden' })
    return
  }

  if (error.statusCode === 429) {
    reply.status(429).send({ error: 'Too many requests' })
    return
  }

  if (error.statusCode === 404) {
    reply.status(404).send({ error: 'Not found' })
    return
  }

  // Never leak internals in production
  reply.status(500).send({
    error: isProd ? 'Internal server error' : error.message,
  })
}
