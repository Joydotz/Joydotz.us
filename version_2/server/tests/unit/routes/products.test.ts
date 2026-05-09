import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'
import { PRODUCTS } from '../../../src/data/products'

vi.mock('../../../src/services/stripeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/stripeService')>()
  return {
    ...actual,
    retrieveStripePricesByIds: vi.fn(),
  }
})

import { retrieveStripePricesByIds } from '../../../src/services/stripeService'
import { UNIT_AMOUNTS_BY_PRODUCT_ID, wireRetrieveStripePricesByIdsMock } from '../../shared/stripePriceMocks'

let app: FastifyInstance

beforeAll(async () => {
  wireRetrieveStripePricesByIdsMock(vi.mocked(retrieveStripePricesByIds))
  app = buildApp({ logger: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/catalog — static merchandising (no Stripe)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/catalog', () => {
  it('returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog' })
    expect(res.statusCode).toBe(200)
  })

  it('returns three SKUs without price fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog' })
    const { products } = res.json<{ products: Record<string, unknown>[] }>()
    expect(products).toHaveLength(3)
    for (const p of products) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('description')
      expect(p).toHaveProperty('imageUrl')
      expect(p).not.toHaveProperty('price')
      expect(p).not.toHaveProperty('displayPrice')
      expect(p).not.toHaveProperty('stripePriceId')
    }
  })

  it('matches PRODUCTS ids and copy', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog' })
    const { products } = res.json<{ products: { id: string; name: string }[] }>()
    expect(products.map((p) => p.id).sort()).toEqual(PRODUCTS.map((p) => p.id).sort())
    expect(products.find((p) => p.id === PRODUCTS[0].id)?.name).toBe(PRODUCTS[0].name)
  })

  it('never exposes Stripe price ids — only merchandising keys', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/catalog' })
    const { products } = res.json<{ products: Record<string, unknown>[] }>()
    const allowedSorted = ['description', 'id', 'imageUrl', 'name']
    const forbiddenStripePriceKeys = [
      'stripePriceId',
      'priceId',
      'price_id',
      'stripe_price_id',
      'default_price',
    ]
    for (const p of products) {
      expect(Object.keys(p).sort()).toEqual(allowedSorted)
      for (const key of forbiddenStripePriceKeys) {
        expect(p).not.toHaveProperty(key)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products — return all available product SKUs
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  it('returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    expect(res.statusCode).toBe(200)
  })

  it('returns all three SKUs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const body = res.json<{ products: unknown[] }>()
    expect(body.products).toHaveLength(3)
  })

  it('each product has required fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const { products } = res.json<{ products: Record<string, unknown>[] }>()

    for (const product of products) {
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('name')
      expect(product).toHaveProperty('price')
      expect(product).toHaveProperty('displayPrice')
      expect(product).toHaveProperty('description')
      expect(product).toHaveProperty('imageUrl')
    }
  })

  it('contains the correct SKU ids', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const { products } = res.json<{ products: { id: string }[] }>()
    const ids = products.map((p) => p.id)

    expect(ids).toContain('softwing-butterfly')
    expect(ids).toContain('daydream-cloud')
    expect(ids).toContain('blush-flower')
  })

  it('price is a positive integer in cents', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const { products } = res.json<{ products: { price: number }[] }>()

    for (const product of products) {
      expect(typeof product.price).toBe('number')
      expect(Number.isInteger(product.price)).toBe(true)
      expect(product.price).toBeGreaterThan(0)
    }
  })

  it('does not expose stripePriceId to the client', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const { products } = res.json<{ products: Record<string, unknown>[] }>()

    for (const product of products) {
      expect(product).not.toHaveProperty('stripePriceId')
    }
  })

  it('matches the source product data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    const { products } = res.json<{ products: Record<string, unknown>[] }>()

    expect(products).toHaveLength(PRODUCTS.length)
    expect(products[0].id).toBe(PRODUCTS[0].id)
    expect(products[0].name).toBe(PRODUCTS[0].name)
    expect(products[0].price).toBe(UNIT_AMOUNTS_BY_PRODUCT_ID[PRODUCTS[0].id])
  })
})
