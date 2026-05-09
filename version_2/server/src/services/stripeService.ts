import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000

type CachedStripePrice = { unitAmount: number; currency: string; fetchedAt: number }

const stripePriceCache = new Map<string, CachedStripePrice>()
const stripePriceInflight = new Map<string, Promise<{ unitAmount: number; currency: string }>>()

// https://stripe.com/docs/currencies#presentment-currencies
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])

/** Clears in-memory Stripe Price cache (vitest only). */
export function clearStripePriceCacheForTests() {
  stripePriceCache.clear()
  stripePriceInflight.clear()
}

function isoCurrency(code: string) {
  return code.toUpperCase()
}

/** Format `Price.unit_amount` for storefront display. */
export function formatStripeUnitAmount(unitAmount: number, currency: string): string {
  const cc = isoCurrency(currency)
  const zeroDec = ZERO_DECIMAL_CURRENCIES.has(cc)
  const divisor = zeroDec ? 1 : 100
  const major = unitAmount / divisor
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cc,
      maximumFractionDigits: zeroDec ? 0 : 2,
    }).format(major)
  } catch {
    return `${major} ${cc}`
  }
}

async function fetchPriceSnapshot(priceId: string): Promise<{ unitAmount: number; currency: string }> {
  const price = await stripe.prices.retrieve(priceId)
  if (price.unit_amount == null) {
    throw new Error(`Stripe price ${priceId} has no unit_amount`)
  }
  return { unitAmount: price.unit_amount, currency: price.currency }
}

/** Looks up current unit amounts from Stripe (cached). Used for catalog + order totals. */
export async function retrieveStripePricesByIds(
  priceIds: string[],
): Promise<Map<string, { unitAmount: number; currency: string }>> {
  const unique = [...new Set(priceIds)]
  const now = Date.now()
  const out = new Map<string, { unitAmount: number; currency: string }>()
  const needFetch: string[] = []

  for (const id of unique) {
    const cached = stripePriceCache.get(id)
    if (cached && now - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
      out.set(id, { unitAmount: cached.unitAmount, currency: cached.currency })
    } else {
      needFetch.push(id)
    }
  }

  await Promise.all(
    needFetch.map(async (id) => {
      if (!stripePriceInflight.has(id)) {
        const p = fetchPriceSnapshot(id)
          .then((snap) => {
            stripePriceCache.set(id, { ...snap, fetchedAt: Date.now() })
            return snap
          })
          .finally(() => {
            stripePriceInflight.delete(id)
          })
        stripePriceInflight.set(id, p)
      }
      const snap = await stripePriceInflight.get(id)!
      out.set(id, snap)
    }),
  )

  return out
}

export interface CheckoutSessionInput {
  lineItems: { stripePriceId: string; quantity: number }[]
  successUrl: string
  cancelUrl: string
  metadata: { orderId: string; userId: string }
  idempotencyKey?: string
}

export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<{ sessionId: string; url: string }> {
  const idempotencyKey = input.idempotencyKey ?? `checkout_session_${input.metadata.orderId}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: input.lineItems.map((item) => ({
      price: item.stripePriceId,
      quantity: item.quantity,
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: input.metadata,
  }, {
    idempotencyKey,
  })

  if (!session.url) {
    throw new Error('Stripe did not return a session URL')
  }

  return { sessionId: session.id, url: session.url }
}

/** Used to verify return from hosted Checkout before exposing order details (no JWT required). */
export async function retrieveCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId)
}

export function constructStripeEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
