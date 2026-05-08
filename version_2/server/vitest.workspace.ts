import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    // Unit / route / service tests — run files in parallel (default)
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      exclude: ['tests/integration/**', 'node_modules/**'],
    },
  },
  {
    // server - db integration tests in isolated schema
    extends: './vitest.config.ts',
    test: {
      name: 'server-db',
      include: ['tests/integration/server_db.test.ts'],
      setupFiles: ['tests/integration/setup_server_db.ts'],
      pool: 'forks',
      maxWorkers: 1,
    },
  },
  {
    // server - stripe - db integration tests in isolated schema
    extends: './vitest.config.ts',
    test: {
      name: 'server-stripe-db',
      include: ['tests/integration/server_stripe_db.test.ts'],
      setupFiles: ['tests/integration/setup_server_stripe_db.ts'],
      pool: 'forks',
      maxWorkers: 1,
    },
  },
  {
    // server - stripe integration tests
    extends: './vitest.config.ts',
    test: {
      name: 'server-stripe',
      include: ['tests/integration/server_stripe.test.ts'],
      setupFiles: ['tests/integration/setup.ts'],
      pool: 'forks',
      maxWorkers: 1,
    },
  },
])
