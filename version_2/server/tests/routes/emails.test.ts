import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app'

// Mock the email service so tests never touch the database
vi.mock('../../src/services/emailService', () => ({
  saveEmail: vi.fn().mockResolvedValue({ created: true }),
}))

import { saveEmail } from '../../src/services/emailService'

const mockSaveEmail = vi.mocked(saveEmail)

let app: FastifyInstance

beforeAll(async () => {
  app = buildApp({ logger: false, skipRateLimit: true })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSaveEmail.mockResolvedValue({ created: true })
})

describe('POST /api/emails', () => {
  it('returns 200 for a valid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'hello@example.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ success: true })
  })

  it('calls saveEmail with the correct arguments', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'hello@example.com', source: 'newsletter' },
    })

    expect(mockSaveEmail).toHaveBeenCalledWith('hello@example.com', 'newsletter')
  })

  it('defaults source to newsletter when not provided', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'hello@example.com' },
    })

    expect(mockSaveEmail).toHaveBeenCalledWith('hello@example.com', 'newsletter')
  })

  it('returns 400 for a missing email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for an invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'not-an-email' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for an email exceeding 255 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'a'.repeat(246) + '@example.com' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for an invalid source value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'hello@example.com', source: 'invalid_source' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 200 for a duplicate email (silent dedup)', async () => {
    mockSaveEmail.mockResolvedValueOnce({ created: false })

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'duplicate@example.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ success: true })
  })

  it('returns 500 when the database throws unexpectedly', async () => {
    mockSaveEmail.mockRejectedValueOnce(new Error('DB is down'))

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'hello@example.com' },
    })

    expect(res.statusCode).toBe(500)
  })
})
