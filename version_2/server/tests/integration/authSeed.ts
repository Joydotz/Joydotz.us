/**
 * Better Auth helpers for integration tests: sign up + sign in and return session cookies.
 */

import { isAPIError } from 'better-auth/api'
import { auth } from '../../src/lib/auth.js'
import { testPrisma } from './helpers.js'

export const INTEGRATION_AUTH_PASSWORD = 'IntegrationTestPass123!'

function sessionCookieFromHeaders(headers: Headers): string {
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie')].filter((c): c is string => !!c)

  const cookie = setCookies.map((c) => c.split(';')[0]!.trim()).join('; ')
  if (!cookie) {
    throw new Error('signInEmail did not return a session cookie')
  }
  return cookie
}

/** Creates (or reuses) a user via Better Auth and returns a cookie header for app.inject. */
export async function seedAuthUser(opts: {
  email: string
  name?: string
  newsletterOptIn?: boolean
}): Promise<{ userId: string; cookie: string }> {
  const { email, name = email.split('@')[0] ?? 'user', newsletterOptIn = false } = opts

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: INTEGRATION_AUTH_PASSWORD,
        name,
        newsletterOptIn,
      },
    })
  } catch (err) {
    if (!isAPIError(err)) throw err
    // User may already exist if a prior attempt partially succeeded.
  }

  await testPrisma.user.updateMany({
    where: { email },
    data: { emailVerified: true },
  })

  const { headers } = await auth.api.signInEmail({
    returnHeaders: true,
    body: {
      email,
      password: INTEGRATION_AUTH_PASSWORD,
    },
  })

  const cookie = sessionCookieFromHeaders(headers)
  const user = await testPrisma.user.findUniqueOrThrow({ where: { email } })
  return { userId: user.id, cookie }
}
