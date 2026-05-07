import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

const isTest = process.env.USE_TEST_DB === '1'

export default defineConfig({
  datasource: {
    url: isTest ? env('TEST_DATABASE_URL') : env('DATABASE_URL'),
  },
})
