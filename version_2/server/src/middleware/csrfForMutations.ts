import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * CSRF must not run on safe reads: GET /api/auth/me and GET /api/account/* never send
 * x-csrf-token; verifying undefined fails and looks like "logged out on every reload".
 */
export function csrfProtectionForMutations(app: FastifyInstance) {
  return function csrfProtectionForMutationsHook(
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ): void {
    if (SAFE_METHODS.has(request.method)) {
      done()
      return
    }
    ;(app.csrfProtection as (req: FastifyRequest, rep: FastifyReply, cb: (err?: Error) => void) => void)(
      request,
      reply,
      done,
    )
  }
}
