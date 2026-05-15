/**
 * Account route tests — /api/account, /api/account/addresses, /api/account/orders
 *
 * All routes require authentication. Each describe block verifies both the
 * happy path and the unauthenticated (401) case.
 *
 * Strategy:
 *   - addressService and publicUserService are mocked — no database
 *   - authenticate is mocked (Better Auth session stand-in)
 *   - Authorization is verified: unauthenticated requests always get 401
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../src/app.js'
import { createMockUser } from '../../shared/fixtures.js'
import { rejectAuthOnce, resetAuthenticateMock } from '../mocks/authenticate.js'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../src/middleware/authenticate.js', async () => {
  const mod = await import('../mocks/authenticate.js')
  return { authenticate: mod.authenticate }
})

vi.mock('../../../src/services/addressService.js', () => ({
  getAddresses: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}))

vi.mock('../../../src/services/publicUserService.js', () => ({
  setNewsletterOptIn: vi.fn(),
}))

vi.mock('../../../src/services/orderService', async () => {
  const { buildOrderServiceMock: buildMock } = await import('../../shared/mocks/orderService.js')
  return buildMock()
})

import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../../src/services/addressService.js'
import { getPaidOrdersByUser } from '../../../src/services/orderService.js'
import { setNewsletterOptIn } from '../../../src/services/publicUserService.js'

const mockSetNewsletter = vi.mocked(setNewsletterOptIn)
const mockGetAddresses = vi.mocked(getAddresses)
const mockCreateAddress = vi.mocked(createAddress)
const mockUpdateAddress = vi.mocked(updateAddress)
const mockDeleteAddress = vi.mocked(deleteAddress)
const mockSetDefault = vi.mocked(setDefaultAddress)
const mockGetPaidOrders = vi.mocked(getPaidOrdersByUser)

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = createMockUser()

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

// Mirrors EMPTY_ADDRESS in client/src/pages/Account.tsx exactly —
// the frontend always serialises line2 as '' even when left blank.
const VALID_ADDRESS_PAYLOAD = {
  line1: '123 Joy Street',
  line2: '',
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'US',
}

// ── Setup ─────────────────────────────────────────────────────────────────────

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
  resetAuthenticateMock()
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/news — newsletter opt-in toggle
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/news', () => {
  describe('authenticated', () => {
    it('returns 200 when opting in to the newsletter', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: true },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls setNewsletterOptIn with the correct userId and value', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: true },
      })

      expect(mockSetNewsletter).toHaveBeenCalledWith(MOCK_USER.id, true)
    })

    it('returns 200 when opting out of the newsletter', async () => {
      mockSetNewsletter.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: false },
      })

      expect(res.statusCode).toBe(200)
    })

    it('returns 400 when newsletterOptIn is not a boolean', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: 'yes' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when the body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: {},
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockSetNewsletter.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: true },
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/news',
        payload: { newsletterOptIn: true },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/addresses — list all addresses for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/addresses', () => {
  describe('authenticated', () => {
    it('returns 200 and a list of addresses', async () => {
      mockGetAddresses.mockResolvedValueOnce([MOCK_ADDRESS])

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
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
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().addresses).toEqual([])
    })

    it('calls getAddresses with the correct userId', async () => {
      mockGetAddresses.mockResolvedValueOnce([])

      await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
      })

      expect(mockGetAddresses).toHaveBeenCalledWith(MOCK_USER.id)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockGetAddresses.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/addresses',
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({ method: 'GET', url: '/api/account/addresses' })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/addresses — create a new address
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/addresses', () => {
  describe('authenticated', () => {
    it('returns 201 and the created address on valid input', async () => {
      mockCreateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
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
        payload: { ...VALID_ADDRESS_PAYLOAD, line2: 'Apt 4B' },
      })

      expect(res.statusCode).toBe(201)
    })


    it('returns 400 when line1 is missing', async () => {
      const { line1: _removed, ...without } = VALID_ADDRESS_PAYLOAD

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: without,
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city is missing', async () => {
      const { city: _removed, ...without } = VALID_ADDRESS_PAYLOAD

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: without,
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when country code is not exactly 2 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, country: 'USA' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockCreateAddress.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: VALID_ADDRESS_PAYLOAD,
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('malformed / malicious payloads', () => {
    it('returns 400 when line1 is whitespace only', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: '   ' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 exceeds 255 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: 'A'.repeat(256) },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line2 exceeds 255 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line2: 'B'.repeat(256) },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city is whitespace only', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, city: '   ' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when postal_code contains special characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, postal_code: '<script>alert(1)</script>' },
      })
      expect(res.statusCode).toBe(400)
    })


    it('returns 400 when country code contains digits', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, country: '12' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: '123 Main\x00St' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: '123 Main\r\nSt' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 contains HTML tags', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: '<script>alert(1)</script>' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 contains object injection characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: '{"$gt":""}' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when line1 is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, line1: 12345 },
      })
      expect(res.statusCode).toBe(400)
    })

    it('strips unknown fields and still creates the address', async () => {
      // Attacker attempts to inject a userId override — Zod strips unknown fields,
      // so the address is created under the authenticated user's ID, not the injected one.
      mockCreateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses',
        payload: { ...VALID_ADDRESS_PAYLOAD, userId: 'attacker-id', isDefault: true },
      })

      expect(res.statusCode).toBe(201)
      // Service must be called with the real authenticated userId, not the injected one
      expect(mockCreateAddress).toHaveBeenCalledWith(
        MOCK_USER.id,
        expect.not.objectContaining({ userId: 'attacker-id' }),
      )
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
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
// POST /api/account/addresses/:id — update fields on an existing address
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/addresses/:id', () => {
  describe('authenticated', () => {
    it('returns 200 and the updated address', async () => {
      // Frontend sends the full form state, not a partial patch
      mockUpdateAddress.mockResolvedValueOnce({ ...MOCK_ADDRESS, city: 'San Francisco' })

      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { ...VALID_ADDRESS_PAYLOAD, city: 'San Francisco' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().address.city).toBe('San Francisco')
    })

    it('calls updateAddress with the correct userId and addressId', async () => {
      mockUpdateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { ...VALID_ADDRESS_PAYLOAD, city: 'San Francisco' },
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
        method: 'POST',
        url: '/api/account/addresses/other-users-address-id',
        payload: { ...VALID_ADDRESS_PAYLOAD, city: 'San Francisco' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for an invalid country code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { ...VALID_ADDRESS_PAYLOAD, country: 'INVALID' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('malformed / malicious payloads', () => {
    it('returns 400 when updating city to whitespace only', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: '   ' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when postal_code contains special characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { postal_code: '!!!<bad>' },
      })
      expect(res.statusCode).toBe(400)
    })


    it('returns 400 when country code contains digits', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { country: '42' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city contains a null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: 'Los\x00Angeles' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city contains a CRLF sequence', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: 'Los\r\nAngeles' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city contains HTML tags', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: '<img src=x onerror=alert(1)>' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city contains object injection characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: '{"$gt":""}' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when city is not a string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: ['Los', 'Angeles'] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('strips unknown fields and still updates the address', async () => {
      mockUpdateAddress.mockResolvedValueOnce(MOCK_ADDRESS)

      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: 'San Francisco', userId: 'attacker-id' },
      })

      expect(res.statusCode).toBe(200)
      expect(mockUpdateAddress).toHaveBeenCalledWith(
        MOCK_USER.id,
        MOCK_ADDRESS.id,
        expect.not.objectContaining({ userId: 'attacker-id' }),
      )
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
        payload: { city: 'San Francisco' },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/account/addresses/:id — remove an address
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/account/addresses/:id', () => {
  describe('authenticated', () => {
    it('returns 200 on successful deletion', async () => {
      mockDeleteAddress.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls deleteAddress with the correct userId and addressId', async () => {
      mockDeleteAddress.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
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
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 409 when the address is linked to orders', async () => {
      mockDeleteAddress.mockRejectedValueOnce(
        Object.assign(
          new Error(
            'This address cannot be deleted because it is linked to one or more orders. You can edit it instead, or add a new address.',
          ),
          { code: 'ADDRESS_IN_USE' },
        ),
      )

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
      })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({ code: 'ADDRESS_IN_USE' })
      expect(res.json().error).toContain('linked to one or more orders')
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockDeleteAddress.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/account/addresses/:id/default — set an address as default
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/account/addresses/:id/default', () => {
  describe('authenticated', () => {
    it('returns 200 on success', async () => {
      mockSetDefault.mockResolvedValueOnce(undefined)

      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ success: true })
    })

    it('calls setDefaultAddress with the correct userId and addressId', async () => {
      mockSetDefault.mockResolvedValueOnce(undefined)

      await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
      })

      expect(mockSetDefault).toHaveBeenCalledWith(MOCK_USER.id, MOCK_ADDRESS.id)
    })

    it('returns 404 when the address does not belong to the user', async () => {
      mockSetDefault.mockRejectedValueOnce(
        Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' }),
      )

      const res = await app.inject({
        method: 'POST',
        url: '/api/account/addresses/other-users-address-id/default',
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({
        method: 'POST',
        url: `/api/account/addresses/${MOCK_ADDRESS.id}/default`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/account/orders — list past orders for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/account/orders', () => {
  describe('authenticated', () => {
    it('returns 200 and an empty array before any orders exist', async () => {
      mockGetPaidOrders.mockResolvedValueOnce([])

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/orders',
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().orders).toEqual([])
    })

    it('calls getPaidOrdersByUser with the correct userId', async () => {
      mockGetPaidOrders.mockResolvedValueOnce([])

      await app.inject({
        method: 'GET',
        url: '/api/account/orders',
      })

      expect(mockGetPaidOrders).toHaveBeenCalledWith(MOCK_USER.id)
    })

    it('returns 500 when the service throws unexpectedly', async () => {
      mockGetPaidOrders.mockRejectedValueOnce(new Error('DB is down'))

      const res = await app.inject({
        method: 'GET',
        url: '/api/account/orders',
      })

      expect(res.statusCode).toBe(500)
    })
  })

  describe('unauthenticated', () => {
    it('returns 401 with no cookie', async () => {
      rejectAuthOnce()
      const res = await app.inject({ method: 'GET', url: '/api/account/orders' })
      expect(res.statusCode).toBe(401)
    })
  })
})
