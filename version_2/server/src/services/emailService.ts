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

/** Resend returns `{ data, error }` and does not throw on API failures. */
export async function sendEmail({ from, to, subject, html }: SendEmailOptions): Promise<void> {
  console.log('[sendEmail] sending', { from, to, subject })

  const { data, error } = await resend.emails.send({ from, to, subject, html })

  if (error) {
    console.error('[sendEmail] Resend API error', { from, to, subject, error })
    throw new Error(error.message ?? 'Resend failed to send email')
  }

  console.log('[sendEmail] sent', { from, to, subject, id: data?.id })
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
