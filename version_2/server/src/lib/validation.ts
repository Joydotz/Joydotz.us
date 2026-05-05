import { z } from 'zod'

/**
 * Wraps any ZodString with a null byte + CRLF refine.
 * Must be called last — after .email(), .min(), .max(), etc. —
 * because .refine() returns ZodEffects, which doesn't support further chaining.
 *
 * Usage:  safe(z.string().email().max(255))
 */
export function safe(schema: z.ZodString) {
  return schema.refine(
    (s) => !/[\x00\r\n]/.test(s),
    { message: 'Invalid characters' },
  )
}

/**
 * Allowlist for address text fields (line1, line2, city, state).
 * Permits letters, digits, spaces, and punctuation found in real postal addresses:
 *   hyphen     → "123-A Main St"
 *   period     → "St.", "Ave."
 *   apostrophe → "O'Brien St"
 *   comma      → "Suite 100, Bldg A"
 *   hash       → "#4B"
 *   slash      → "1/2 Oak Lane"
 * Everything else — { } $ < > | ` null bytes, CRLF — is rejected.
 *
 * Usage:  safeAddr(z.string().trim().min(1).max(255))
 */
export function safeAddr(schema: z.ZodString) {
  return schema.refine(
    (s) => /^[A-Za-z0-9 '\-\.,#\/]*$/.test(s),
    { message: 'Invalid characters' },
  )
}
