import 'dotenv/config'
import { configureIntegrationEnv, migrateCurrentSchema } from './helpers'

configureIntegrationEnv(undefined, 'inte_server_stripe_db')
await migrateCurrentSchema(undefined, 'inte_server_stripe_db')

