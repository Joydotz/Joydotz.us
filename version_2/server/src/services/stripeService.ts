import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

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

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
