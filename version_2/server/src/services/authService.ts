import bcrypt from 'bcrypt'
import { prisma } from '../db/client.js'

const SALT_ROUNDS = 12

export interface PublicUser {
  id: string
  email: string
  newsletterOptIn: boolean
  createdAt: Date
}

function toPublicUser(user: {
  id: string
  email: string
  newsletterOptIn: boolean
  createdAt: Date
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    newsletterOptIn: user.newsletterOptIn,
    createdAt: user.createdAt,
  }
}

export async function signupUser(
  email: string,
  password: string,
  newsletterOptIn: boolean,
): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    throw Object.assign(new Error('Email already in use'), { code: 'EMAIL_TAKEN' })
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      newsletterOptIn,
    },
  })

  if (newsletterOptIn) {
    await prisma.emailSubscriber.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail, source: 'signup' },
    })
  } else {
    // User explicitly opted out at signup — remove any prior newsletter subscription
    await prisma.emailSubscriber.deleteMany({ where: { email: normalizedEmail } })
  }

  return toPublicUser(user)
}

export async function loginUser(
  email: string,
  password: string,
): Promise<PublicUser> {
  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' })
  }

  return toPublicUser(user)
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  return toPublicUser(user)
}
