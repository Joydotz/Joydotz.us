import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'

vi.mock('../../../src/services/emailService', () => ({
  saveEmail: vi.fn().mockResolvedValue({ created: true }),
}))

let app: FastifyInstance

beforeAll(async () => {
  // Rate limiting ON — this is what tests the defense
  app = buildApp({ logger: false, skipRateLimit: false, skipCsrf: true })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — per-route and global request caps enforced by @fastify/rate-limit
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limiting', () => {
  describe('POST /api/emails — 10 requests per hour per IP', () => {
    it('allows the first 10 requests', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/emails',
          payload: { email: `user${i}@example.com` },
        })
        expect(res.statusCode).toBe(200)
      }
    })

    it('blocks the 4th request with 429', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/emails',
        payload: { email: 'blocked@example.com' },
      })

      expect(res.statusCode).toBe(429)
    })

    it('429 response contains the correct error message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/emails',
        payload: { email: 'blocked@example.com' },
      })

      expect(res.json()).toMatchObject({ error: 'Too many requests' })
    })

    it('429 response includes a Retry-After header', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/emails',
        payload: { email: 'blocked@example.com' },
      })

      expect(res.headers['retry-after']).toBeDefined()
    })
  })

  describe('GET /api/products — global limit applies', () => {
    it('returns 200 under the global limit', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/products' })
      expect(res.statusCode).toBe(200)
    })
  })
})
