/**
 * CSRF protection tests
 *
 * Tests run against a CSRF-enabled app (skipCsrf: false).
 * Strategy:
 *   - GET /api/csrf-token to obtain a token + cookie
 *   - Use both on state-changing requests
 *   - Verify that missing / tampered tokens are rejected with 403
 *   - Verify that GET requests pass through without a token
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../src/services/emailService', () => ({
  saveEmail: vi.fn().mockResolvedValue({ created: true }),
}))

vi.mock('../../../src/services/authService', () => ({
  signupUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
}))

import { loginUser, getUserById } from '../../../src/services/authService'

const MOCK_USER_FOR_ME = {
  id: 'user-csrf-me',
  email: 'csrf-me-test@example.com',
  newsletterOptIn: false,
  createdAt: new Date('2026-01-01'),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance

beforeAll(async () => {
  // CSRF ON — this is the whole point of this test file
  app = buildApp({ logger: false, skipRateLimit: true, skipCsrf: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetches a fresh CSRF token and returns both the token string and the raw
 * Set-Cookie header value. The cookie must accompany every state-changing
 * request alongside the x-csrf-token header.
 */
async function getCsrfCredentials(): Promise<{ token: string; cookie: string }> {
  const res = await app.inject({ method: 'GET', url: '/api/csrf-token' })
  const token = res.json().token as string
  const raw = res.headers['set-cookie']
  const cookie = Array.isArray(raw) ? raw[0] : (raw as string)
  return { token, cookie }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/csrf-token — token endpoint
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/csrf-token', () => {
  it('returns 200 and a token string', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/csrf-token' })

    expect(res.statusCode).toBe(200)
    expect(typeof res.json().token).toBe('string')
    expect(res.json().token.length).toBeGreaterThan(0)
  })

  it('sets a CSRF cookie in the response', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/csrf-token' })

    const cookie = res.headers['set-cookie']
    expect(cookie).toBeDefined()
  })

  it('returns a different token on each call', async () => {
    const first = await app.inject({ method: 'GET', url: '/api/csrf-token' })
    const second = await app.inject({ method: 'GET', url: '/api/csrf-token' })

    expect(first.json().token).not.toBe(second.json().token)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CSRF enforcement on state-changing routes
// ─────────────────────────────────────────────────────────────────────────────

describe('CSRF enforcement — POST /api/emails', () => {
  it('returns 200 when a valid token and cookie are provided', async () => {
    const { token, cookie } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { cookie, 'x-csrf-token': token },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('returns 403 when the x-csrf-token header is missing', async () => {
    const { cookie } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { cookie },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when the CSRF cookie is missing', async () => {
    const { token } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { 'x-csrf-token': token },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when both token and cookie are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when the token is tampered with', async () => {
    const { cookie } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { cookie, 'x-csrf-token': 'tampered-token-value' },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when the token is from a different session', async () => {
    // Token from session A, cookie from session B — must be rejected
    const sessionA = await getCsrfCredentials()
    const sessionB = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { cookie: sessionB.cookie, 'x-csrf-token': sessionA.token },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })
})

describe('CSRF enforcement — POST /api/auth/signup', () => {
  it('returns 403 when CSRF credentials are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: false },
    })

    expect(res.statusCode).toBe(403)
  })

  it('proceeds past CSRF check with valid credentials (may fail for other reasons)', async () => {
    const { token, cookie } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers: { cookie, 'x-csrf-token': token },
      payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: false },
    })

    // 403 would mean CSRF blocked it — any other status means CSRF passed
    expect(res.statusCode).not.toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cross-origin POST requests
//
// NOTE: Real CORS enforcement is browser-side — the browser refuses to read
// the response if Access-Control-Allow-Origin doesn't match. Server-side tests
// can only verify the server-side backstop: CSRF blocks requests that arrive
// without a valid token, regardless of their Origin header.
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-origin POST requests', () => {
  it('returns 403 for a cross-origin POST with no CSRF credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { origin: 'https://evil.com' },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 for a cross-origin POST with a tampered token', async () => {
    const { cookie } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { origin: 'https://evil.com', cookie, 'x-csrf-token': 'forged-token' },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 403 when the attacker replays a token without its paired cookie', async () => {
    // Attacker intercepts a token value but cannot steal the httpOnly cookie
    const { token } = await getCsrfCredentials()

    const res = await app.inject({
      method: 'POST',
      url: '/api/emails',
      headers: { origin: 'https://evil.com', 'x-csrf-token': token },
      payload: { email: 'test@example.com', source: 'newsletter' },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET requests are exempt from CSRF
// ─────────────────────────────────────────────────────────────────────────────

describe('CSRF exemption — GET requests', () => {
  it('GET /api/products passes without a CSRF token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/products' })
    expect(res.statusCode).toBe(200)
  })

  it('GET /api/csrf-token itself passes without a CSRF token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/csrf-token' })
    expect(res.statusCode).toBe(200)
  })

  it('GET /api/auth/me passes without x-csrf-token when JWT cookie is present', async () => {
    vi.mocked(loginUser).mockResolvedValueOnce(MOCK_USER_FOR_ME)
    vi.mocked(getUserById).mockResolvedValueOnce(MOCK_USER_FOR_ME)

    const { token, cookie: csrfSetCookie } = await getCsrfCredentials()
    const csrfPair = csrfSetCookie.split(';')[0]

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { cookie: csrfPair, 'x-csrf-token': token },
      payload: { email: MOCK_USER_FOR_ME.email, password: 'password123' },
    })
    expect(loginRes.statusCode).toBe(200)

    const raw = loginRes.headers['set-cookie']
    const setCookies = Array.isArray(raw) ? raw : [raw]
    const jwtLine = setCookies.find((s) => String(s).startsWith('token='))
    const jwtPair = jwtLine?.split(';')[0]?.trim() ?? ''
    expect(jwtPair.startsWith('token=')).toBe(true)

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `${csrfPair}; ${jwtPair}` },
    })

    expect(meRes.statusCode).toBe(200)
    expect(meRes.json().user.email).toBe(MOCK_USER_FOR_ME.email)
  })
})
