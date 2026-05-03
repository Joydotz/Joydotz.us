// Set env vars before any module imports so config.ts validates cleanly in tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://localhost:5432/joydotz_test'
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_placeholder'
process.env.FRONTEND_ORIGIN = 'http://localhost:5173'
process.env.PORT = '3001'
