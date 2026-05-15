import { Prisma } from '@prisma/client'
import { Resend } from 'resend'
import { prisma } from '../db/client.js'

export interface SaveEmailResult {
  created: boolean
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export interface SendTransactionalEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

/** `Joydotz <orders@EMAIL_DOMAIN>` — reads `EMAIL_DOMAIN` from env (avoid importing `config` here so unit tests can stub env before `config` runs). */
export function ordersFromAddress(): string | undefined {
  const domain = process.env.EMAIL_DOMAIN?.trim()
  if (!domain) return undefined
  return `Joydotz <orders@${domain}>`
}

/**
 * Same shape as `test.ts`: `new Resend(apiKey).emails.send({ from, to: [...], subject, html })`.
 * Skips when `NODE_ENV` is `test`, or when `EMAIL_API_KEY` / `EMAIL_DOMAIN` are unset.
 */
export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  const apiKey = process.env.EMAIL_API_KEY?.trim()
  const from = ordersFromAddress()
  if (!apiKey || !from) return

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [input.to.trim()],
    subject: input.subject,
    html: input.html,
    text: input.text,
  })
  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)
    throw new Error(message || 'Sending email failed')
  }
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
