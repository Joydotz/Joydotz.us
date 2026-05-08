import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'
import { PRODUCTS } from '../../../src/data/products'

let app: FastifyInstance

beforeAll(async () => {
  app = buildApp({ logger: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
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
    expect(products[0].price).toBe(PRODUCTS[0].price)
  })
})
