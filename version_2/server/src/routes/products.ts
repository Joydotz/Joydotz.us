import { FastifyInstance } from 'fastify'
import { PRODUCTS } from '../data/products.js'
import { formatStripeUnitAmount, retrieveStripePricesByIds } from '../services/stripeService.js'

export async function productRoutes(app: FastifyInstance) {
  /** Static merchandising only — no Stripe; for home/preview where prices are not shown. */
  app.get('/api/catalog', async () => ({
    products: PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
    })),
  }))

  app.get('/api/products', async (_request, reply) => {
    try {
      const snapshots = await retrieveStripePricesByIds(PRODUCTS.map((p) => p.stripePriceId))
      const products = PRODUCTS.map((p) => {
        const snap = snapshots.get(p.stripePriceId)
        if (!snap) {
          throw new Error(`Missing Stripe price for catalog SKU ${p.id}`)
        }
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          price: snap.unitAmount,
          displayPrice: formatStripeUnitAmount(snap.unitAmount, snap.currency),
        }
      })
      return { products }
    } catch {
      return reply.status(503).send({ error: 'Catalog unavailable' })
    }
  })
}
