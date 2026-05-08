// Load .env so TEST_DATABASE_URL and other vars are available
import 'dotenv/config'

// Set env vars before any module imports so config.ts validates cleanly in tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'
process.env.STRIPE_SECRET_KEY ||= 'sk_test_placeholder'
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_test_placeholder'
process.env.FRONTEND_ORIGIN ||= 'http://localhost:5173'
process.env.PORT ||= '3001'
