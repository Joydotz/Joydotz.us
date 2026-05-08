/**
 * authService unit tests
 *
 * Prisma and bcrypt are both mocked so tests run fast and never touch the
 * database or perform real hashing.
 *
 * Mock return values represent the exact shape of rows as PostgreSQL/Prisma
 * would return them — including passwordHash — so we can verify that the
 * service strips sensitive fields before returning data to callers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock('../../../src/db/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    emailSubscriber: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

// ── Mock bcrypt ───────────────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import { prisma } from '../../../src/db/client'
import bcrypt from 'bcrypt'
import { signupUser, loginUser, getUserById } from '../../../src/services/authService'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockCreate = vi.mocked(prisma.user.create)
const mockUpsert = vi.mocked(prisma.emailSubscriber.upsert)
const mockDeleteMany = vi.mocked(prisma.emailSubscriber.deleteMany)
const mockHash = vi.mocked(bcrypt.hash)
const mockCompare = vi.mocked(bcrypt.compare)

// ── Fixtures — exact DB row shapes ───────────────────────────────────────────

/**
 * Represents the exact row Prisma returns from the users table.
 * passwordHash is a real bcrypt v2b format string (12 rounds).
 */
const DB_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  passwordHash: '$2b$12$LCKjKRj1GqZpgJSH1x7MsOV5Wr/cSTm.0VIj1Q4bN5bI6qCBe5Cu',
  newsletterOptIn: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const DB_EMAIL_SUBSCRIBER = {
  id: 'sub-550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  source: 'signup',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// signupUser — hash password, create user, strip passwordHash from return value
// ─────────────────────────────────────────────────────────────────────────────

describe('signupUser', () => {
  describe('happy path', () => {
    it('returns a public user object without passwordHash', async () => {
      mockFindUnique.mockResolvedValueOnce(null) // email not taken
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)

      const result = await signupUser('test@example.com', 'password123', false)

      expect(result).not.toHaveProperty('passwordHash')
      expect(result).toMatchObject({
        id: DB_USER.id,
        email: DB_USER.email,
        newsletterOptIn: false,
      })
    })

    it('hashes the password with bcrypt before storing', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)

      await signupUser('test@example.com', 'password123', false)

      expect(mockHash).toHaveBeenCalledWith('password123', 12)
    })

    it('stores the hash, not the plaintext password', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)

      await signupUser('test@example.com', 'password123', false)

      const createCall = mockCreate.mock.calls[0][0] as any
      expect(createCall.data.passwordHash).toBe(DB_USER.passwordHash)
      expect(createCall.data).not.toHaveProperty('password')
    })

    it('normalizes email to lowercase before saving', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)

      await signupUser('TEST@EXAMPLE.COM', 'password123', false)

      const createCall = mockCreate.mock.calls[0][0] as any
      expect(createCall.data.email).toBe('test@example.com')
    })

    it('trims whitespace from email before saving', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)

      await signupUser('  test@example.com  ', 'password123', false)

      const createCall = mockCreate.mock.calls[0][0] as any
      expect(createCall.data.email).toBe('test@example.com')
    })

    it('creates an EmailSubscriber when newsletterOptIn is true', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce({ ...DB_USER, newsletterOptIn: true } as never)
      mockUpsert.mockResolvedValueOnce(DB_EMAIL_SUBSCRIBER as never)

      await signupUser('test@example.com', 'password123', true)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
          create: expect.objectContaining({ email: 'test@example.com', source: 'signup' }),
        }),
      )
    })

    it('does not upsert an EmailSubscriber when newsletterOptIn is false', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 0 } as never)

      await signupUser('test@example.com', 'password123', false)

      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('deletes any prior EmailSubscriber when newsletterOptIn is false', async () => {
      // Scenario: user previously subscribed via the landing page, then signs up
      // with the checkbox unchecked — their prior subscription must be removed.
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockResolvedValueOnce(DB_USER as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 1 } as never)

      await signupUser('test@example.com', 'password123', false)

      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
    })
  })

  describe('duplicate email', () => {
    it('throws EMAIL_TAKEN when the email is already registered', async () => {
      // findUnique returns the existing DB row — email is taken
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)

      await expect(signupUser('test@example.com', 'password123', false)).rejects.toMatchObject({
        code: 'EMAIL_TAKEN',
      })
    })

    it('does not call bcrypt.hash or prisma.user.create on duplicate email', async () => {
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)

      await expect(signupUser('test@example.com', 'password123', false)).rejects.toThrow()

      expect(mockHash).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('rethrows unexpected database errors', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      mockHash.mockResolvedValueOnce(DB_USER.passwordHash as never)
      mockCreate.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(signupUser('test@example.com', 'password123', false)).rejects.toThrow(
        'Connection refused',
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// loginUser — verify credentials, return public user or throw INVALID_CREDENTIALS
// ─────────────────────────────────────────────────────────────────────────────

describe('loginUser', () => {
  describe('happy path', () => {
    it('returns a public user object without passwordHash', async () => {
      // DB returns the full row including the hash
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)
      mockCompare.mockResolvedValueOnce(true as never)

      const result = await loginUser('test@example.com', 'password123')

      // The hash must not leak out to the caller
      expect(result).not.toHaveProperty('passwordHash')
      expect(result).toMatchObject({
        id: DB_USER.id,
        email: DB_USER.email,
      })
    })

    it('compares the plaintext password against the stored hash', async () => {
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)
      mockCompare.mockResolvedValueOnce(true as never)

      await loginUser('test@example.com', 'password123')

      expect(mockCompare).toHaveBeenCalledWith('password123', DB_USER.passwordHash)
    })

    it('normalizes email to lowercase before querying', async () => {
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)
      mockCompare.mockResolvedValueOnce(true as never)

      await loginUser('TEST@EXAMPLE.COM', 'password123')

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      )
    })
  })

  describe('invalid credentials', () => {
    it('throws INVALID_CREDENTIALS when the email does not exist', async () => {
      // DB returns null — no user found
      mockFindUnique.mockResolvedValueOnce(null)

      await expect(loginUser('nobody@example.com', 'password123')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('throws INVALID_CREDENTIALS when the password is wrong', async () => {
      mockFindUnique.mockResolvedValueOnce(DB_USER as never)
      // bcrypt.compare returns false — wrong password
      mockCompare.mockResolvedValueOnce(false as never)

      await expect(loginUser('test@example.com', 'wrongpassword')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('throws the same error type for wrong email and wrong password (no enumeration)', async () => {
      mockFindUnique.mockResolvedValueOnce(null)
      const errorNoUser = await loginUser('nobody@example.com', 'password123').catch((e) => e)

      mockFindUnique.mockResolvedValueOnce(DB_USER as never)
      mockCompare.mockResolvedValueOnce(false as never)
      const errorBadPassword = await loginUser('test@example.com', 'wrong').catch((e) => e)

      expect(errorNoUser.code).toBe(errorBadPassword.code)
      expect(errorNoUser.message).toBe(errorBadPassword.message)
    })

    it('does not call bcrypt.compare when the email does not exist', async () => {
      mockFindUnique.mockResolvedValueOnce(null)

      await loginUser('nobody@example.com', 'password123').catch(() => {})

      // bcrypt.compare must not be called — avoids unnecessary computation
      expect(mockCompare).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('rethrows unexpected database errors', async () => {
      mockFindUnique.mockRejectedValueOnce(new Error('Connection refused'))

      await expect(loginUser('test@example.com', 'password123')).rejects.toThrow(
        'Connection refused',
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getUserById — fetch a user by id, strip passwordHash from return value
// ─────────────────────────────────────────────────────────────────────────────

describe('getUserById', () => {
  it('returns a public user object without passwordHash', async () => {
    mockFindUnique.mockResolvedValueOnce(DB_USER as never)

    const result = await getUserById(DB_USER.id)

    expect(result).not.toHaveProperty('passwordHash')
    expect(result).toMatchObject({ id: DB_USER.id, email: DB_USER.email })
  })

  it('returns null when the user does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    const result = await getUserById('non-existent-id')

    expect(result).toBeNull()
  })

  it('queries by the correct id', async () => {
    mockFindUnique.mockResolvedValueOnce(DB_USER as never)

    await getUserById(DB_USER.id)

    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DB_USER.id } }),
    )
  })

  it('rethrows unexpected database errors', async () => {
    mockFindUnique.mockRejectedValueOnce(new Error('Connection refused'))

    await expect(getUserById(DB_USER.id)).rejects.toThrow('Connection refused')
  })
})
