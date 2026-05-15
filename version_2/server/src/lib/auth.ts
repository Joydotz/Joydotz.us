import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../db/client.js'
import { syncNewsletterForUser } from '../services/publicUserService.js'

const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL,
  trustedOrigins: [frontendOrigin],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: 'User',
    additionalFields: {
      newsletterOptIn: {
        type: 'boolean',
        defaultValue: false,
        required: false,
      },
    },
  },
  session: {
    modelName: 'Session',
  },
  account: {
    modelName: 'Account',
  },
  verification: {
    modelName: 'Verification',
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const newsletterOptIn = Boolean(
            (user as { newsletterOptIn?: boolean }).newsletterOptIn,
          )
          await syncNewsletterForUser(user.email, newsletterOptIn)
        },
      },
    },
  },
})
