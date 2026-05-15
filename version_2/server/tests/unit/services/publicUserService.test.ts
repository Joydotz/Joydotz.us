import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/db/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    emailSubscriber: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '../../../src/db/client'
import { getUserById, syncNewsletterForUser, setNewsletterOptIn } from '../../../src/services/publicUserService'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockUpdate = vi.mocked(prisma.user.update)
const mockUpsert = vi.mocked(prisma.emailSubscriber.upsert)
const mockDeleteMany = vi.mocked(prisma.emailSubscriber.deleteMany)

const USER_ID = 'user-abc-123'

const DB_USER = {
  id: USER_ID,
  name: 'test',
  email: 'test@example.com',
  emailVerified: false,
  image: null,
  newsletterOptIn: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const DB_USER_OPTED_IN = { ...DB_USER, newsletterOptIn: true }
const DB_USER_OPTED_OUT = { ...DB_USER, newsletterOptIn: false }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserById', () => {
  it('returns public user fields only', async () => {
    mockFindUnique.mockResolvedValueOnce(DB_USER as never)
    const result = await getUserById(DB_USER.id)
    expect(result).toEqual({
      id: DB_USER.id,
      email: DB_USER.email,
      emailVerified: false,
      newsletterOptIn: false,
      createdAt: DB_USER.createdAt,
    })
  })
})

describe('syncNewsletterForUser', () => {
  it('upserts subscriber when opted in (signup source by default)', async () => {
    await syncNewsletterForUser('Test@Example.com', true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
        create: expect.objectContaining({ source: 'signup' }),
      }),
    )
  })

  it('uses account source when provided', async () => {
    await syncNewsletterForUser('test@example.com', true, 'account')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ source: 'account' }),
      }),
    )
  })

  it('deletes subscriber when opted out', async () => {
    await syncNewsletterForUser('test@example.com', false)
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
  })
})

describe('setNewsletterOptIn', () => {
  describe('opting in', () => {
    it('updates the user row with newsletterOptIn: true', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_IN as never)
      mockUpsert.mockResolvedValueOnce({} as never)

      await setNewsletterOptIn(USER_ID, true)

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { newsletterOptIn: true },
      })
    })

    it('upserts EmailSubscriber with account source', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_IN as never)
      mockUpsert.mockResolvedValueOnce({} as never)

      await setNewsletterOptIn(USER_ID, true)

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: DB_USER.email },
          create: expect.objectContaining({ email: DB_USER.email, source: 'account' }),
        }),
      )
    })

    it('does not delete subscriber rows when opting in', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_IN as never)
      mockUpsert.mockResolvedValueOnce({} as never)

      await setNewsletterOptIn(USER_ID, true)

      expect(mockDeleteMany).not.toHaveBeenCalled()
    })
  })

  describe('opting out', () => {
    it('updates the user row with newsletterOptIn: false', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_OUT as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 1 } as never)

      await setNewsletterOptIn(USER_ID, false)

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { newsletterOptIn: false },
      })
    })

    it('deletes the EmailSubscriber row when opting out', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_OUT as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 1 } as never)

      await setNewsletterOptIn(USER_ID, false)

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { email: DB_USER.email },
      })
    })

    it('does not upsert when opting out', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_OUT as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 0 } as never)

      await setNewsletterOptIn(USER_ID, false)

      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('does not throw when no subscriber row exists to delete', async () => {
      mockUpdate.mockResolvedValueOnce(DB_USER_OPTED_OUT as never)
      mockDeleteMany.mockResolvedValueOnce({ count: 0 } as never)

      await expect(setNewsletterOptIn(USER_ID, false)).resolves.not.toThrow()
    })
  })
})
