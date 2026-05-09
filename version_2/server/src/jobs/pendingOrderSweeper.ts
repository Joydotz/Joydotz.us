import type { FastifyBaseLogger } from 'fastify'
import { sweepStalePendingOrders } from '../services/orderService.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** Runs once on startup, then every `intervalMs` (default 24h). */
export function startPendingOrderSweeper(log: FastifyBaseLogger, opts?: { intervalMs?: number }): () => void {
  const intervalMs = opts?.intervalMs ?? DAY_MS

  const tick = () => {
    void sweepStalePendingOrders()
      .then((cancelledPendingCount) => {
        if (cancelledPendingCount > 0) {
          log.info({ cancelledPendingCount }, 'swept stale pending orders')
        }
      })
      .catch((err) => {
        log.error(err, 'pending order sweep failed')
      })
  }

  tick()
  const id = setInterval(tick, intervalMs)
  return () => clearInterval(id)
}
