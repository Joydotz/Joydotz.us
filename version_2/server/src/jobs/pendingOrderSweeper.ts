import type { FastifyBaseLogger } from 'fastify'
import type { EventBus } from '../events/EventBus.js'
import {
  reconcilePendingPaidCheckoutSessionsBatch,
  sweepStaleAbandonedPendingOrders,
} from '../services/checkoutSessionReconcile.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** Runs once on startup, then every `intervalMs` (default 24h). */
export function startPendingOrderSweeper(
  log: FastifyBaseLogger,
  opts: { intervalMs?: number; eventBus: EventBus },
): () => void {
  const intervalMs = opts.intervalMs ?? DAY_MS
  const { eventBus } = opts

  const tick = () => {
    void (async () => {
      try {
        const recon = await reconcilePendingPaidCheckoutSessionsBatch(eventBus)
        if (recon.checked > 0 || recon.transitioned > 0) {
          log.info(
            { checkedSessions: recon.checked, transitionedToPaid: recon.transitioned },
            'reconciled pending Stripe checkout sessions against Stripe',
          )
        }

        const sweep = await sweepStaleAbandonedPendingOrders(eventBus)
        if (sweep.cancelled > 0) {
          log.info({ cancelledPendingCount: sweep.cancelled }, 'cancelled stale abandoned pending orders')
        }
      } catch (err) {
        log.error(err, 'pending order sweep failed')
      }
    })()
  }

  tick()
  const id = setInterval(tick, intervalMs)
  return () => clearInterval(id)
}
