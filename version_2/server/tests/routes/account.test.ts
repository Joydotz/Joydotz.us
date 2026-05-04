/**
 * Account route tests — /api/account, /api/account/addresses, /api/account/orders
 *
 * All routes require authentication. Each describe block verifies both the
 * happy path and the unauthenticated (401) case.
 *
 * Strategy:
 *   - accountService is mocked so tests never touch the database
 *   - authService.loginUser is mocked to issue a real JWT cookie
 *   - That cookie is used for all authenticated requests
 *   - Authorization is verified: unauthenticated requests always get 401
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

vi.mock('../../src/services/accountService', () => ({
  setNewsletterOptIn: vi.fn(),
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
  getOrders: vi.fn(),
}))

import { loginUser } from '../../src/services/authService'
import {
  setNewsletterOptIn,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getOrders,
} from '../../src/services/accountService'

const mockLogin = vi.mocked(loginUser)
const mockSetNewsletter = vi.mocked(setNewsletterOptIn)
const mockGetAddresses = vi.mocked(getAddresses)
const mockCreateAddress = vi.mocked(createAddress)
const mockUpdateAddress = vi.mocked(updateAddress)
const mockDeleteAddress = vi.mocked(deleteAddress)
const mockSetDefault = vi.mocked(setDefaultAddress)
const mockGetOrders = vi.mocked(getOrders)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-abc-123',
  email: 'test@example.com',
  newsletterOptIn: false,
  createdAt: new Date('2026-01-01'),
}

const MOCK_ADDRESS = {
  id: 'addr-001',
  userId: MOCK_USER.id,
  line1: '123 Joy Street',
  line2: null,
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'US',
  isDefault: true,
  createdAt: new Date('2026-01-01'),
}

const VALID_ADDRESS_PAYLOAD = {
  line1: '123 Joy Street',
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'US',
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance
let sessionCookie: string

beforeAll(async () => {
  app = buildApp({ logger: false, skipRateLimit: true })
  await app.ready()

  // Obtain a real JWT cookie once — reused for all authenticated tests
  mockLogin.mockResolvedValueOnce(MOCK_USER)
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'test@example.com', password: 'password123' },
  })
  const raw = loginRes.headers['set-cookie']
  sessionCookie = Array.isArray(raw) ? raw[0] : (raw as string)
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/account — newsletter opt-in toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/account', () => {
  describe('authenticated', () => {
    it('returns 200 when opting in to the newsletter', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: { newsletterOptIn: true },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls setNewsletterOptIn with the correct userId and value', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: { newsletterOptIn: true },
      })

      expect(mockSetNewsletter).toHaveBeenCalledWith(MOCK_USER.id, true)
    })

    it('returns 200 when opting out of the newsletter', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: { newsletterOptIn: false },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 400 when newsletterOptIn is not a boolean', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: { newsletterOptIn: 'yes' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when the body is empty', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: {},
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockSetNewsletter.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        headers: { cookie: sessionCookie },
        payload: { newsletterOptIn: true },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account',
        payload: { newsletterOptIn: true },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/addresses
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/addresses', () => {
  describe('authenticated', () => {
    it('returns 200 and a list of addresses', async () => {
      mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS])

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().addresses).toHaveLength(1)
      expect(res.json().addresses[0]).toMatchObject({ line1: '123 Joy Street' })
    })

    it('returns an empty array when no addresses are saved', async () => {
      mockGetAddresses.mockResolvedValueOnce([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().addresses).toEqual([])
    })

    it('calls getAddresses with the correct userId', async () => {
      mockGetAddresses.mockResolvedValueOnce([])

      await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
      })

      expect(mockGetAddresses).toHaveBeenCalledWith(MOCK_USER.id)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockGetAddresses.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/account/addresses' })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/addresses
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/addresses', () => {
  describe('authenticated', () => {
    it('returns 201 and the created address on valid input', async () => {
      mockCreateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: VALID_ADDRESS_PAYLOAD,
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().address).toMatchObject({ line1: '123 Joy Street' })
    })

    it('calls createAddress with the correct userId and input', async () => {
      mockCreateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: VALID_ADDRESS_PAYLOAD,
      })

      expect(mockCreateAddress).toHaveBeenCalledWith(MOCK_USER.id, expect.objectContaining({
        line1: '123 Joy Street',
        city: 'Los Angeles',
      }))
    })

    it('accepts an optional line2 field', async () => {
      mockCreateAddress.mockResolvedValueOnce({ ...MOCK_ADDRESS, line2: 'Apt 4B' })

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: { ...VALID_ADDRESS_PAYLOAD, line2: 'Apt 4B' },
      })

      expect(res.statusCode).toBe(201)
    })

    it('returns 400 when line1 is missing', async () => {
      const { line1: _removed, ...without } = VALID_ADDRESS_PAYLOAD

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: without,
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city is missing', async () => {
      const { city: _removed, ...without } = VALID_ADDRESS_PAYLOAD

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: without,
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when country code is not exactly 2 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: { ...VALID_ADDRESS_PAYLOAD, country: 'USA' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockCreateAddress.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        headers: { cookie: sessionCookie },
        payload: VALID_ADDRESS_PAYLOAD,
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: VALID_ADDRESS_PAYLOAD,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/account/addresses/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/account/addresses/:id', () => {
  describe('authenticated', () => {
    it('returns 200 and the updated address', async () => {
      mockUpdateAddress.mockResolvedValueOnce({ ...MOCK_ADDRESS, city: 'San Francisco' })

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
        payload: { city: 'San Francisco' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().address.city).toBe('San Francisco')
    })

    it('calls updateAddress with the correct userId and addressId', async () => {
      mockUpdateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
        payload: { city: 'San Francisco' },
      })

      expect(mockUpdateAddress).toHaveBeenCalledWith(
        MOCK_USER.id,
        MOCK_ADDRESS.id,
        expect.objectContaining({ city: 'San Francisco' }),
      )
    })

    it('returns 404 when the address does not belong to the user', async () => {
      mockUpdateAddress.mockRejectedValueOnce(
        Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' }),
      )

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account/addresses/other-users-address-id',
        headers: { cookie: sessionCookie },
        payload: { city: 'San Francisco' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for an invalid country code', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
        payload: { country: 'INVALID' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: 'San Francisco' },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/account/addresses/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/account/addresses/:id', () => {
  describe('authenticated', () => {
    it('returns 200 on successful deletion', async () => {
      mockDeleteAddress.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls deleteAddress with the correct userId and addressId', async () => {
      mockDeleteAddress.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
      })

      expect(mockDeleteAddress).toHaveBeenCalledWith(MOCK_USER.id, MOCK_ADDRESS.id)
    })

    it('returns 404 when the address does not belong to the user', async () => {
      mockDeleteAddress.mockRejectedValueOnce(
        Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' }),
      )

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/account/addresses/other-users-address-id',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockDeleteAddress.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/account/addresses/:id/default
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/account/addresses/:id/default', () => {
  describe('authenticated', () => {
    it('returns 200 on success', async () => {
      mockSetDefault.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls setDefaultAddress with the correct userId and addressId', async () => {
      mockSetDefault.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
        headers: { cookie: sessionCookie },
      })

      expect(mockSetDefault).toHaveBeenCalledWith(MOCK_USER.id, MOCK_ADDRESS.id)
    })

    it('returns 404 when the address does not belong to the user', async () => {
      mockSetDefault.mockRejectedValueOnce(
        Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' }),
      )

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/account/addresses/other-users-address-id/default',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/orders
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/orders', () => {
  describe('authenticated', () => {
    it('returns 200 and an empty array before any orders exist', async () => {
      mockGetOrders.mockResolvedValueOnce([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/orders',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().orders).toEqual([])
    })

    it('calls getOrders with the correct userId', async () => {
      mockGetOrders.mockResolvedValueOnce([])

      await app.inject({
        method: 'GET',
        url: '/api/account/orders',
        headers: { cookie: sessionCookie },
      })

      expect(mockGetOrders).toHaveBeenCalledWith(MOCK_USER.id)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockGetOrders.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/orders',
        headers: { cookie: sessionCookie },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/account/orders' })
      expect(res.statusCode).toBe(401)
    })
  })
})
