/**
 * Auth route tests — POST /api/auth/signup, login, logout, GET /api/auth/me
 *
 * Strategy: service layer is mocked so tests never touch the database.
 * The real @fastify/jwt signs and verifies tokens, so cookie-based auth
 * flows are exercised end-to-end within the test process.
 *
 * Security properties verified throughout:
 *   - passwordHash is never present in any response
 *   - Login errors are identical whether email exists or not (no enumeration)
 *   - Cookies are httpOnly (not readable by JS)
 *   - Authenticated routes reject requests with no cookie or a tampered token
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../src/services/authService', () => ({
  signupUser: vi.fn(),
  loginUser: vi.fn(),
  getUserById: vi.fn(),
}))

import { signupUser, loginUser, getUserById } from '../../src/services/authService'

const mockSignup = vi.mocked(signupUser)
const mockLogin = vi.mocked(loginUser)
const mockGetById = vi.mocked(getUserById)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-abc-123',
  email: 'test@example.com',
  newsletterOptIn: false,
  createdAt: new Date('2026-01-01'),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

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
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Perform a real login and return the Set-Cookie header value. */
async function getSessionCookie(): Promise<string> {
  mockLogin.mockResolvedValueOnce(MOCK_USER)
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'test@example.com', password: 'password123' },
  })
  const raw = res.headers['set-cookie']
  return Array.isArray(raw) ? raw[0] : (raw as string)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup — register a new user account
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  describe('happy path', () => {
    it('returns 201 and the public user object on valid input', async () => {
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: false },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().user).toMatchObject({
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        newsletterOptIn: false,
      })
    })

    it('sets an httpOnly cookie after signup', async () => {
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: false },
      })

      const cookie = res.headers['set-cookie'] as string
      expect(cookie).toBeDefined()
      expect(cookie).toMatch(/HttpOnly/i)
    })

    it('calls signupUser with the correct arguments', async () => {
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: true },
      })

      expect(mockSignup).toHaveBeenCalledWith('test@example.com', 'password123', true)
    })

    it('defaults newsletterOptIn to false when not provided', async () => {
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      expect(mockSignup).toHaveBeenCalledWith('test@example.com', 'password123', false)
    })

    it('never exposes passwordHash in the response', async () => {
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      const body = res.json()
      expect(JSON.stringify(body)).not.toContain('passwordHash')
    })
  })

  describe('duplicate email', () => {
    it('returns 409 when the email is already registered', async () => {
      mockSignup.mockRejectedValueOnce(
        Object.assign(new Error('Email already in use'), { code: 'EMAIL_TAKEN' }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'taken@example.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ error: 'Email already in use' })
    })
  })

  describe('input validation', () => {
    it('returns 400 when email is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for an invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'not-an-email', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is shorter than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'short' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password exceeds 72 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'a'.repeat(73) },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for an email exceeding 255 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'a'.repeat(246) + '@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when the request body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('error handling', () => {
    it('returns 500 when the service throws unexpectedly', async () => {
      mockSignup.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('malformed / malicious payloads', () => {
    it('returns 400 when email contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test\x00@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when email contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test\r\n@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password\x00123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password\r\n123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when email is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 12345, password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: ['p', 'a', 's', 's'] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when newsletterOptIn is a string instead of boolean', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: 'true' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when newsletterOptIn is a number instead of boolean', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', newsletterOptIn: 1 },
      })
      expect(res.statusCode).toBe(400)
    })

    it('strips unknown fields and still creates the account', async () => {
      // Attacker injects a role or admin flag — Zod strips it before it reaches the service
      mockSignup.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: { email: 'test@example.com', password: 'password123', role: 'admin', isAdmin: true },
      })

      expect(res.statusCode).toBe(201)
      expect(mockSignup).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        expect.any(Boolean),
      )
      // Service must not receive the injected fields
      const [, , thirdArg, ...rest] = mockSignup.mock.calls[0]
      expect(rest).toHaveLength(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login — authenticate and receive a session cookie
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  describe('happy path', () => {
    it('returns 200 and the public user object on valid credentials', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().user).toMatchObject({ email: MOCK_USER.email })
    })

    it('sets an httpOnly cookie on successful login', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      const cookie = res.headers['set-cookie'] as string
      expect(cookie).toBeDefined()
      expect(cookie).toMatch(/HttpOnly/i)
    })

    it('never exposes passwordHash in the response', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      expect(JSON.stringify(res.json())).not.toContain('passwordHash')
    })
  })

  describe('invalid credentials', () => {
    it('returns 401 for a wrong password', async () => {
      mockLogin.mockRejectedValueOnce(
        Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns 401 for a non-existent email', async () => {
      mockLogin.mockRejectedValueOnce(
        Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@example.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns the same error message whether email exists or not (prevents enumeration)', async () => {
      mockLogin.mockRejectedValue(
        Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' }),
      )

      const resWrongEmail = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@example.com', password: 'password123' },
      })

      const resWrongPassword = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'wrongpassword' },
      })

      expect(resWrongEmail.statusCode).toBe(resWrongPassword.statusCode)
      expect(resWrongEmail.json().error).toBe(resWrongPassword.json().error)
    })
  })

  describe('input validation', () => {
    it('returns 400 when email is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for an invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('error handling', () => {
    it('returns 500 when the service throws unexpectedly', async () => {
      mockLogin.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('malformed / malicious payloads', () => {
    it('returns 400 when email contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test\x00@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when email contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test\r\n@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password\x00123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password\r\n123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password exceeds 1000 characters (DoS guard)', async () => {
      // No max on login password currently — a huge bcrypt payload would block the event loop
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'a'.repeat(1001) },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when email is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 99999, password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: { value: 'password123' } },
      })
      expect(res.statusCode).toBe(400)
    })

    it('strips unknown fields and still attempts login', async () => {
      mockLogin.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123', role: 'admin' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout — clear the session cookie
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ success: true })

    // Cookie should be cleared (Max-Age=0 or expired)
    const cookie = res.headers['set-cookie'] as string
    expect(cookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i)
  })

  it('succeeds even when no cookie is present (idempotent)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })
    expect(res.statusCode).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me — return the currently authenticated user
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  describe('authenticated', () => {
    it('returns 200 and the current user when a valid cookie is present', async () => {
      const cookie = await getSessionCookie()
      mockGetById.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().user).toMatchObject({ email: MOCK_USER.email })
    })

    it('never exposes passwordHash in the response', async () => {
      const cookie = await getSessionCookie()
      mockGetById.mockResolvedValueOnce(MOCK_USER)

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie },
      })

      expect(JSON.stringify(res.json())).not.toContain('passwordHash')
    })

    it('returns 401 when the user no longer exists (deleted account)', async () => {
      const cookie = await getSessionCookie()
      mockGetById.mockResolvedValueOnce(null)

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 when no cookie is present', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 401 when the token is tampered with', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: 'token=this.is.not.a.valid.jwt' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 401 for a token signed with a different secret', async () => {
      // Manually forge a token using a different secret
      const forgedToken = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
      ).toString('base64') + '.' +
        Buffer.from(JSON.stringify({ sub: 'fake-user-id' })).toString('base64') +
        '.fakesignature'

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: `token=${forgedToken}` },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting on auth routes — POST /api/auth/login blocks after 10 failed attempts
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limiting on auth routes', () => {
  let rateLimitedApp: FastifyInstance

  beforeAll(async () => {
    rateLimitedApp = buildApp({ logger: false, skipRateLimit: false })
    await rateLimitedApp.ready()
  })

  afterAll(async () => {
    await rateLimitedApp.close()
  })

  it('blocks login after 10 failed attempts within 15 minutes', async () => {
    mockLogin.mockRejectedValue(
      Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' }),
    )

    for (let i = 0; i < 10; i++) {
      await rateLimitedApp.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'wrong' },
      })
    }

    const blocked = await rateLimitedApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'wrong' },
    })

    expect(blocked.statusCode).toBe(429)
  })
})
