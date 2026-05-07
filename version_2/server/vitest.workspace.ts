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
    // Integration tests share a single Postgres DB — run files sequentially
    // so concurrent cleanDb() calls don't race each other
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
    },
  },
])
