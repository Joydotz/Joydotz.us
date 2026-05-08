import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

// Mock the Prisma client before importing the service
vi.mock('../../../src/db/client', () => ({
  prisma: {
    emailSubscriber: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../../../src/db/client'
import { saveEmail } from '../../../src/services/emailService'

const mockCreate = vi.mocked(prisma.emailSubscriber.create)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// saveEmail — normalise email, insert subscriber row, return created flag
// ─────────────────────────────────────────────────────────────────────────────

describe('saveEmail', () => {
  it('creates a new subscriber and returns created: true', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'abc-123',
      email: 'test@example.com',
      source: 'newsletter',
      createdAt: new Date(),
    })

    const result = await saveEmail('test@example.com', 'newsletter')

    expect(result).toEqual({ created: true })
    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: 'test@example.com', source: 'newsletter' },
    })
  })

  it('lowercases and trims the email before saving', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'abc-124',
      email: 'test@example.com',
      source: 'newsletter',
      createdAt: new Date(),
    })

    await saveEmail('  TEST@Example.COM  ', 'newsletter')

    expect(mockCreate).toHaveBeenCalledWith({
      data: { email: 'test@example.com', source: 'newsletter' },
    })
  })

  it('returns created: false on duplicate email without throwing', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.0.0', meta: {} },
    )
    mockCreate.mockRejectedValueOnce(uniqueError)

    const result = await saveEmail('duplicate@example.com', 'newsletter')

    expect(result).toEqual({ created: false })
  })

  it('rethrows unexpected database errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'))

    await expect(saveEmail('test@example.com', 'newsletter')).rejects.toThrow(
      'Connection refused',
    )
  })
})
