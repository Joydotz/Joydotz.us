import { FastifyInstance } from 'fastify'
import { PRODUCTS } from '../data/products'

export async function productRoutes(app: FastifyInstance) {
  app.get('/api/products', async () => {
    const products = PRODUCTS.map(({ stripePriceId: _stripped, ...rest }) => rest)
    return { products }
  })
}
