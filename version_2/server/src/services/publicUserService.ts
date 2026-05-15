import { prisma } from '../db/client.js'

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

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  return toPublicUser(user)
}

// ── Newsletter ────────────────────────────────────────────────────────────────

export async function setNewsletterOptIn(userId: string, newsletterOptIn: boolean): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { newsletterOptIn },
  })
  await syncNewsletterForUser(user.email, newsletterOptIn, 'account')
}

/** Keeps EmailSubscriber in sync when a user signs up or toggles newsletter. */
export async function syncNewsletterForUser(
  email: string,
  newsletterOptIn: boolean,
  source: 'signup' | 'account' = 'signup',
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (newsletterOptIn) {
    await prisma.emailSubscriber.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail, source },
    })
  } else {
    await prisma.emailSubscriber.deleteMany({ where: { email: normalizedEmail } })
  }
}
