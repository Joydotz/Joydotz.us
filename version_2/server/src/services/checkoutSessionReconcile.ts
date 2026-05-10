import type Stripe from 'stripe'
import { prisma } from '../db/client.js'
import type { EventBus } from '../events/EventBus.js'
import { getOrderByStripeSessionId, tryMarkOrderPaidAfterCheckout } from './orderService.js'
import { retrieveCheckoutSession } from './stripeService.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const RECON_BATCH_LIMIT = 200
const SWEEP_CS_BATCH_LIMIT = 200

/**
 * Align DB with Stripe when Checkout Session is paid (missed webhook,
 * or thank-you poll before webhook). Mirrors checkout.session.completed:
 * tryMark then ORDER_PAID only when this call performed the transition.
 */
export async function reconcilePaidCheckoutFromStripeSession(
  stripeSession: Stripe.Checkout.Session,
  eventBus: EventBus,
): Promise<{ order: NonNullable<Awaited<ReturnType<typeof getOrderByStripeSessionId>>>; transitioned: boolean } | null> {
  if (stripeSession.payment_status !== 'paid') return null

  const orderIdMeta = stripeSession.metadata?.orderId
  if (!orderIdMeta || typeof orderIdMeta !== 'string') return null

  const order = await getOrderByStripeSessionId(stripeSession.id)
  if (!order || order.id !== orderIdMeta) return null

  if (order.status === 'PAID') {
    return { order, transitioned: false }
  }

  if (order.status !== 'PENDING') return null

  const transitioned = await tryMarkOrderPaidAfterCheckout(order.id)

  const paid = await getOrderByStripeSessionId(stripeSession.id)
  if (!paid || paid.status !== 'PAID') return null

  if (transitioned) {
    await eventBus.publish('ORDER_PAID', {
      orderId: paid.id,
      userId: paid.userId,
      email: paid.user.email,
      total: paid.total,
    })
    return { order: paid, transitioned: true }
  }

  return { order: paid, transitioned: false }
}

/** Recent PENDING Checkout sessions — retrieve from Stripe and mark PAID when Stripe says paid. */
export async function reconcilePendingPaidCheckoutSessionsBatch(
  eventBus: EventBus,
): Promise<{ checked: number; transitioned: number }> {
  const since = new Date(Date.now() - WEEK_MS)
  const rows = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      stripeSessionId: { startsWith: 'cs_' },
      createdAt: { gte: since },
    },
    select: { stripeSessionId: true },
    take: RECON_BATCH_LIMIT,
  })

  let transitioned = 0
  for (const row of rows) {
    try {
      const session = await retrieveCheckoutSession(row.stripeSessionId)
      const r = await reconcilePaidCheckoutFromStripeSession(session, eventBus)
      if (r?.transitioned) transitioned++
    } catch {
      /* Stripe/network — skip until next sweep */
    }
  }

  return { checked: rows.length, transitioned }
}

/**
 * Cancel stale abandonments. Real `cs_` rows are verified with Stripe first so we never
 * cancel an order Stripe reports as paid (webhook missed). Placeholder session ids are cancelled in bulk.
 */
export async function sweepStaleAbandonedPendingOrders(
  eventBus: EventBus,
  maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<{ cancelled: number }> {
  const cutoff = new Date(Date.now() - maxAgeMs)
  let cancelled = 0

  const placeholderResult = await prisma.order.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
      NOT: { stripeSessionId: { startsWith: 'cs_' } },
    },
    data: { status: 'CANCELLED' },
  })
  cancelled += placeholderResult.count

  const staleCsRows = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      stripeSessionId: { startsWith: 'cs_' },
      createdAt: { lt: cutoff },
    },
    select: { id: true, stripeSessionId: true },
    take: SWEEP_CS_BATCH_LIMIT,
  })

  for (const row of staleCsRows) {
    try {
      const session = await retrieveCheckoutSession(row.stripeSessionId)
      if (session.payment_status === 'paid') {
        await reconcilePaidCheckoutFromStripeSession(session, eventBus)
        continue
      }
      const up = await prisma.order.updateMany({
        where: { id: row.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      if (up.count === 1) cancelled++
    } catch {
      const up = await prisma.order.updateMany({
        where: { id: row.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      if (up.count === 1) cancelled++
    }
  }

  return { cancelled }
}
