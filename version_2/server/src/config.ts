import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL').optional(),
    STRIPE_SECRET_KEY: z
      .string()
      .min(1, 'STRIPE_SECRET_KEY is required')
      .refine((v) => v.startsWith('sk_'), 'STRIPE_SECRET_KEY must start with sk_'),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .refine((v) => v.startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET must start with whsec_')
      .optional(),
    FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a valid URL'),
    EMAIL_API_KEY: z.string().trim().min(1).optional(),
    EMAIL_DOMAIN: z.string().trim().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'test' && !env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'STRIPE_WEBHOOK_SECRET is required outside test mode',
      })
    }

    if (env.NODE_ENV === 'production') {
      if (env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_SECRET_KEY'],
          message: 'STRIPE_SECRET_KEY cannot use placeholder value in production',
        })
      }

      if (env.STRIPE_WEBHOOK_SECRET === 'whsec_test_placeholder') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_WEBHOOK_SECRET'],
          message: 'STRIPE_WEBHOOK_SECRET cannot use placeholder value in production',
        })
      }
    }
  })

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Invalid environment configuration:')
  result.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export const config = result.data
export type Config = typeof config
