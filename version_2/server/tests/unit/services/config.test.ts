import { afterEach, describe, expect, it, vi } from 'vitest'

function setBaseEnv() {
  vi.stubEnv('PORT', '3001')
  vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-at-least-32-characters-long')
  vi.stubEnv('FRONTEND_ORIGIN', 'http://localhost:5173')
}

async function importConfig() {
  vi.resetModules()
  return import('../../../src/config')
}

describe('config stripe env validation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('allows placeholder Stripe values in test mode', async () => {
    setBaseEnv()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_placeholder')

    const { config } = await importConfig()
    expect(config.NODE_ENV).toBe('test')
    expect(config.STRIPE_SECRET_KEY).toBe('sk_test_placeholder')
    expect(config.STRIPE_WEBHOOK_SECRET).toBe('whsec_test_placeholder')
  })

  it('fails fast outside test mode when STRIPE_WEBHOOK_SECRET is missing', async () => {
    setBaseEnv()
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_valid_value')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code}`)
    }) as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(importConfig()).rejects.toThrow('EXIT_1')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('fails fast in production when placeholder Stripe values are used', async () => {
    setBaseEnv()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_placeholder')

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code}`)
    }) as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(importConfig()).rejects.toThrow('EXIT_1')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('accepts valid production Stripe values', async () => {
    setBaseEnv()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_abc123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_live_abc123')

    const { config } = await importConfig()
    expect(config.NODE_ENV).toBe('production')
    expect(config.STRIPE_SECRET_KEY).toBe('sk_live_abc123')
    expect(config.STRIPE_WEBHOOK_SECRET).toBe('whsec_live_abc123')
  })
})
