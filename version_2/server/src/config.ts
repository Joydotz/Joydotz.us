import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  STRIPE_SECRET_KEY: z
    .string()
    .refine((v) => v.startsWith('sk_'), 'STRIPE_SECRET_KEY must start with sk_'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .refine((v) => v.startsWith('whsec_'), 'Must start with whsec_')
    .optional(),
  FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a valid URL'),
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
