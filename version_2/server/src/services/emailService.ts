import { Prisma } from '@prisma/client'
import { prisma } from '../db/client'

export interface SaveEmailResult {
  created: boolean
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export async function saveEmail(
  email: string,
  source: string,
): Promise<SaveEmailResult> {
  try {
    await prisma.emailSubscriber.create({
      data: {
        email: email.toLowerCase().trim(),
        source,
      },
    })
    return { created: true }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Duplicate email — not an error, just a no-op
      return { created: false }
    }
    throw error
  }
}
