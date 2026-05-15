/**
 * addressService unit tests
 *
 * Prisma is mocked so tests never touch the database.
 * Mock return values represent the exact shape of rows as PostgreSQL/Prisma
 * would return them — including all foreign keys, timestamps, and nullable
 * fields — so we test against real data structures.
 *
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock('../../../src/db/client', () => ({
  prisma: {
    address: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    order: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../../src/db/client'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../../src/services/addressService.js'

const mockAddressFindMany = vi.mocked(prisma.address.findMany)
const mockAddressFindFirst = vi.mocked(prisma.address.findFirst)
const mockAddressCount = vi.mocked(prisma.address.count)
const mockAddressCreate = vi.mocked(prisma.address.create)
const mockAddressUpdate = vi.mocked(prisma.address.update)
const mockAddressUpdateMany = vi.mocked(prisma.address.updateMany)
const mockAddressDelete = vi.mocked(prisma.address.delete)
const mockOrderCount = vi.mocked(prisma.order.count)

// ── Fixtures — exact DB row shapes ───────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

/**
 * Exact row returned by Prisma from the Address table.
 * All nullable fields are explicitly set (null or value).
 */
const DB_ADDRESS_DEFAULT = {
  id: 'addr-550e8400-e29b-41d4-a716-446655440001',
  userId: USER_ID,
  line1: '123 Joy Street',
  line2: null,
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'US',
  isDefault: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const DB_ADDRESS_SECONDARY = {
  id: 'addr-550e8400-e29b-41d4-a716-446655440002',
  userId: USER_ID,
  line1: '456 Cloud Avenue',
  line2: 'Apt 4B',
  city: 'San Francisco',
  state: 'CA',
  postal_code: '94102',
  country: 'US',
  isDefault: false,
  createdAt: new Date('2026-02-01T00:00:00.000Z'),
}

const ADDRESS_INPUT = {
  line1: '123 Joy Street',
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'US',
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// getAddresses — list all addresses for a user, default address first
// ─────────────────────────────────────────────────────────────────────────────

describe('getAddresses', () => {
  it('returns all address rows for the user', async () => {
    mockAddressFindMany.mockResolvedValueOnce([DB_ADDRESS_DEFAULT, DB_ADDRESS_SECONDARY] as never)

    const result = await getAddresses(USER_ID)

    expect(result).toHaveLength(2)
  })

  it('queries only addresses belonging to the given userId', async () => {
    mockAddressFindMany.mockResolvedValueOnce([] as never)

    await getAddresses(USER_ID)

    expect(mockAddressFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
  })

  it('returns the default address first', async () => {
    mockAddressFindMany.mockResolvedValueOnce([DB_ADDRESS_DEFAULT, DB_ADDRESS_SECONDARY] as never)

    const result = await getAddresses(USER_ID)

    expect(result[0].isDefault).toBe(true)
  })

  it('returns an empty array when the user has no addresses', async () => {
    mockAddressFindMany.mockResolvedValueOnce([] as never)

    const result = await getAddresses(USER_ID)

    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createAddress — insert a new address, auto-set default if first
// ─────────────────────────────────────────────────────────────────────────────

describe('createAddress', () => {
  it('creates and returns the new address row', async () => {
    mockAddressCount.mockResolvedValueOnce(0 as never)
    mockAddressCreate.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)

    const result = await createAddress(USER_ID, ADDRESS_INPUT)

    expect(result).toMatchObject({ line1: '123 Joy Street', userId: USER_ID })
  })

  it('sets isDefault: true when this is the first address', async () => {
    mockAddressCount.mockResolvedValueOnce(0 as never)
    mockAddressCreate.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)

    await createAddress(USER_ID, ADDRESS_INPUT)

    const createCall = mockAddressCreate.mock.calls[0][0] as { data: { isDefault: boolean } }
    expect(createCall.data.isDefault).toBe(true)
  })

  it('sets isDefault: false when the user already has addresses', async () => {
    mockAddressCount.mockResolvedValueOnce(1 as never)
    mockAddressCreate.mockResolvedValueOnce({ ...DB_ADDRESS_DEFAULT, isDefault: false } as never)

    await createAddress(USER_ID, ADDRESS_INPUT)

    const createCall = mockAddressCreate.mock.calls[0][0] as { data: { isDefault: boolean } }
    expect(createCall.data.isDefault).toBe(false)
  })

  it('stores the correct userId on the new row', async () => {
    mockAddressCount.mockResolvedValueOnce(0 as never)
    mockAddressCreate.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)

    await createAddress(USER_ID, ADDRESS_INPUT)

    const createCall = mockAddressCreate.mock.calls[0][0] as { data: { userId: string } }
    expect(createCall.data.userId).toBe(USER_ID)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateAddress — edit address fields, verify ownership first
// ─────────────────────────────────────────────────────────────────────────────

describe('updateAddress', () => {
  it('returns the updated address row', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressUpdate.mockResolvedValueOnce({ ...DB_ADDRESS_DEFAULT, city: 'San Francisco' } as never)

    const result = await updateAddress(USER_ID, DB_ADDRESS_DEFAULT.id, { city: 'San Francisco' })

    expect(result.city).toBe('San Francisco')
  })

  it('verifies the address belongs to the user before updating', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressUpdate.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)

    await updateAddress(USER_ID, DB_ADDRESS_DEFAULT.id, { city: 'San Francisco' })

    expect(mockAddressFindFirst).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_DEFAULT.id, userId: USER_ID },
    })
  })

  it('throws NOT_FOUND when address does not belong to the user', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await expect(
      updateAddress(USER_ID, 'other-users-address-id', { city: 'San Francisco' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('does not call prisma.address.update when ownership check fails', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await updateAddress(USER_ID, 'other-id', { city: 'SF' }).catch(() => {})

    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// deleteAddress — remove an address, promote next to default if needed
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteAddress', () => {
  beforeEach(() => {
    mockOrderCount.mockResolvedValue(0 as never)
  })

  it('deletes the address row', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockAddressDelete.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)

    await deleteAddress(USER_ID, DB_ADDRESS_SECONDARY.id)

    expect(mockAddressDelete).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_SECONDARY.id },
    })
    expect(mockOrderCount).toHaveBeenCalledWith({ where: { addressId: DB_ADDRESS_SECONDARY.id } })
  })

  it('throws ADDRESS_IN_USE when the address is linked to orders', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockOrderCount.mockResolvedValueOnce(2 as never)

    await expect(deleteAddress(USER_ID, DB_ADDRESS_SECONDARY.id)).rejects.toMatchObject({
      code: 'ADDRESS_IN_USE',
    })

    expect(mockAddressDelete).not.toHaveBeenCalled()
  })

  it('verifies the address belongs to the user before deleting', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressDelete.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await deleteAddress(USER_ID, DB_ADDRESS_DEFAULT.id)

    expect(mockAddressFindFirst).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_DEFAULT.id, userId: USER_ID },
    })
  })

  it('throws NOT_FOUND when address does not belong to the user', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await expect(
      deleteAddress(USER_ID, 'other-users-address-id'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('does not call prisma.address.delete when ownership check fails', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await deleteAddress(USER_ID, 'other-id').catch(() => {})

    expect(mockAddressDelete).not.toHaveBeenCalled()
    expect(mockOrderCount).not.toHaveBeenCalled()
  })

  it('promotes the next address to default when the deleted address was the default', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressDelete.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockAddressUpdate.mockResolvedValueOnce({ ...DB_ADDRESS_SECONDARY, isDefault: true } as never)

    await deleteAddress(USER_ID, DB_ADDRESS_DEFAULT.id)

    expect(mockAddressUpdate).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_SECONDARY.id },
      data: { isDefault: true },
    })
  })

  it('does not promote any address when the deleted address was not the default', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockAddressDelete.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)

    await deleteAddress(USER_ID, DB_ADDRESS_SECONDARY.id)

    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })

  it('does not promote when there are no remaining addresses after deletion', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressDelete.mockResolvedValueOnce(DB_ADDRESS_DEFAULT as never)
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await deleteAddress(USER_ID, DB_ADDRESS_DEFAULT.id)

    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// setDefaultAddress — unset all, then set chosen address as default
// ─────────────────────────────────────────────────────────────────────────────

describe('setDefaultAddress', () => {
  it('unsets all addresses then sets the chosen one as default', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockAddressUpdateMany.mockResolvedValueOnce({ count: 2 } as never)
    mockAddressUpdate.mockResolvedValueOnce({ ...DB_ADDRESS_SECONDARY, isDefault: true } as never)

    await setDefaultAddress(USER_ID, DB_ADDRESS_SECONDARY.id)

    expect(mockAddressUpdateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { isDefault: false },
    })

    expect(mockAddressUpdate).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_SECONDARY.id },
      data: { isDefault: true },
    })
  })

  it('verifies the address belongs to the user before setting default', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)
    mockAddressUpdateMany.mockResolvedValueOnce({ count: 2 } as never)
    mockAddressUpdate.mockResolvedValueOnce(DB_ADDRESS_SECONDARY as never)

    await setDefaultAddress(USER_ID, DB_ADDRESS_SECONDARY.id)

    expect(mockAddressFindFirst).toHaveBeenCalledWith({
      where: { id: DB_ADDRESS_SECONDARY.id, userId: USER_ID },
    })
  })

  it('throws NOT_FOUND when address does not belong to the user', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await expect(
      setDefaultAddress(USER_ID, 'other-users-address-id'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('does not modify any rows when ownership check fails', async () => {
    mockAddressFindFirst.mockResolvedValueOnce(null)

    await setDefaultAddress(USER_ID, 'other-id').catch(() => {})

    expect(mockAddressUpdateMany).not.toHaveBeenCalled()
    expect(mockAddressUpdate).not.toHaveBeenCalled()
  })
})
