import { Prisma } from '@prisma/client'
import { Resend } from 'resend'
import { prisma } from '../db/client.js'
import { config } from '../config.js'

export interface SaveEmailResult {
  created: boolean
}

export interface SendEmailOptions {
  from: string,
  to: string[],
  subject: string
  html: string
}

const resend = new Resend(config.email.apiKey)

/**
 * Same shape as `test.ts`: `new Resend(apiKey).emails.send({ from, to: [...], subject, html })`.
 * Skips when `NODE_ENV` is `test`, or when `EMAIL_API_KEY` / `EMAIL_DOMAIN` are unset.
 */
export async function sendEmail({ from, to, subject, html }: SendEmailOptions): Promise<void> {
  await resend.emails.send({ from, to, subject, html })
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Duplicate email — not an error, just a no-op
      return { created: false }
    }
    throw error
  }
}
