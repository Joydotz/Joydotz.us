import { prisma } from '../db/client.js'

export interface AddressInput {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function setNewsletterOptIn(
  userId: string,
  optIn: boolean,
): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { newsletterOptIn: optIn },
  })

  if (optIn) {
    await prisma.emailSubscriber.upsert({
      where: { email: user.email },
      update: {},
      create: { email: user.email, source: 'account' },
    })
  } else {
    await prisma.emailSubscriber.deleteMany({ where: { email: user.email } })
  }
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function getAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } })
  const isFirst = count === 0

  return prisma.address.create({
    data: {
      userId,
      ...input,
      isDefault: isFirst,
    },
  })
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: Partial<AddressInput>,
) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) {
    throw Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' })
  }

  return prisma.address.update({
    where: { id: addressId },
    data: input,
  })
}

export async function deleteAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) {
    throw Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' })
  }

  await prisma.address.delete({ where: { id: addressId } })

  // If the deleted address was the default, promote the oldest remaining one
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
    }
  }
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) {
    throw Object.assign(new Error('Address not found'), { code: 'NOT_FOUND' })
  }

  // Unset all, then set the chosen one
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } })
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } })
}

