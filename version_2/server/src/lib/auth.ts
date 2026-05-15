import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../db/client.js'
import { syncNewsletterForUser } from '../services/publicUserService.js'
import { sendEmail } from '../services/emailService.js'
import { config } from '../config.js'

export const auth = betterAuth({
  secret: config.auth.secret,
  baseURL: config.backendOrigin,
  trustedOrigins: [config.frontendOrigin],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (config.nodeEnv === 'test') return

      void sendEmail({
        from: `Joydotz <${config.email.noreply}>`,
        to: [user.email],
        subject: 'Verify your email address',
        html: `<p>Thanks for joining Joydotz.</p>
              <p><a href="${url}">Verify your email address</a> to activate your account.</p>
              <p>If you did not create an account, you can ignore this email.</p>`,
      }).catch((err) => {
        console.error('Failed to send verification email:', err)
      })
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (config.nodeEnv === 'test') return

      void sendEmail({
        from: `Joydotz <${config.email.noreply}>`,
        to: [user.email],
        subject: 'Reset your password',
        html: `<p>Someone has requested a password reset for your Joydotz account.</p>
              <p><a href="${url}">Reset your password</a>.</p>
              <p>If you did not request a password reset, you can ignore this email.</p>`,
      }).catch((err) => {
        console.error('Failed to send reset password email:', err)
      })
    },
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
