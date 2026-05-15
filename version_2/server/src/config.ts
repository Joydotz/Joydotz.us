import { z } from 'zod'

/** Merged under `process.env` in test so imports see a valid config without a full Vitest `env` block. */
const TEST_ENV_DEFAULTS = {
  NODE_ENV: 'test',
  PORT: '3001',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  BACKEND_ORIGIN: 'http://localhost:3001',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/joydotz_test',
  BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_placeholder',
  EMAIL_API_KEY: 're_test_key',
  EMAIL_NOREPLY: 'noreply@example.com',
  EMAIL_HELLO: 'hello@example.com',
  EMAIL_ORDERS: 'orders@example.com',
  EMAIL_ADMIN: 'admin@example.com',
} as const satisfies Record<string, string>

function rawEnvForParse(): NodeJS.ProcessEnv {
  if (process.env.NODE_ENV !== 'test') {
    return process.env
  }
  return { ...TEST_ENV_DEFAULTS, ...process.env }
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a valid URL'),
    BACKEND_ORIGIN: z.string().url('BACKEND_ORIGIN must be a valid URL'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    STRIPE_SECRET_KEY: z
      .string()
      .refine((v) => v.startsWith('sk_'), 'STRIPE_SECRET_KEY must start with sk_'),
    STRIPE_WEBHOOK_SECRET: z
      .string()
      .refine((v) => v.startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET must start with whsec_'),
    EMAIL_API_KEY: z.string().min(1, 'EMAIL_API_KEY is required'),
    EMAIL_NOREPLY: z.string().email('EMAIL_NOREPLY must be a valid email address'),
    EMAIL_HELLO: z.string().email('EMAIL_HELLO must be a valid email address'),
    EMAIL_ORDERS: z.string().email('EMAIL_ORDERS must be a valid email address'),
    EMAIL_ADMIN: z.string().email('EMAIL_ADMIN must be a valid email address'),
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

const result = envSchema.safeParse(rawEnvForParse())

let env: z.infer<typeof envSchema>

if (result.success) {
  env = result.data
} else if (process.env.NODE_ENV === 'test') {
  console.warn('Invalid environment configuration (test mode — using defaults):')
  result.error.issues.forEach((issue) => {
    console.warn(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  env = envSchema.parse(TEST_ENV_DEFAULTS)
} else {
  console.error('Invalid environment configuration:')
  result.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  backendOrigin: env.BACKEND_ORIGIN,
  database: {
    url: env.DATABASE_URL,
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  email: {
    apiKey: env.EMAIL_API_KEY,
    noreply: env.EMAIL_NOREPLY,
    hello: env.EMAIL_HELLO,
    orders: env.EMAIL_ORDERS,
    admin: env.EMAIL_ADMIN,
  }
}
export type Config = typeof config
