/**
 * Auth: Better Auth handler is mounted; GET /api/auth/me returns the app user shape.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'
import { TEST_USER_ID, createMockUser } from '../../shared/fixtures'

vi.mock('../../../src/lib/auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  },
}))

vi.mock('../../../src/services/publicUserService.js', () => ({
  getUserById: vi.fn(),
  syncNewsletterForUser: vi.fn(),
  setNewsletterOptIn: vi.fn(),
}))

import { auth } from '../../../src/lib/auth.js'
import { getUserById } from '../../../src/services/publicUserService.js'

const mockGetSession = vi.mocked(auth.api.getSession)
const mockGetUserById = vi.mocked(getUserById)

const MOCK_USER = createMockUser()

let app: FastifyInstance

beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-characters-long'
  process.env.BETTER_AUTH_URL = 'http://localhost:3001'
  app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: true })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/me', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce(null)

    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('returns the public user when session is valid', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: TEST_USER_ID, email: MOCK_USER.email },
      session: { id: 'sess-1' },
    } as never)
    mockGetUserById.mockResolvedValueOnce(MOCK_USER)

    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { user: typeof MOCK_USER }
    expect(body.user.id).toBe(TEST_USER_ID)
    expect(body.user).not.toHaveProperty('password')
    expect(body.user).not.toHaveProperty('passwordHash')
  })
})
