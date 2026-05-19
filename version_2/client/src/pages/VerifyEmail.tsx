import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getMe, resendVerificationEmail } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const emailParam = searchParams.get('email') ?? ''
  const success = searchParams.get('success') === '1'
  const errorCode = searchParams.get('error')

  const [email, setEmail] = useState(emailParam)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!success) return
    void getMe().then((user) => {
      if (user?.emailVerified) {
        setUser(user)
        navigate('/account', { replace: true })
      }
    })
  }, [success, navigate, setUser])

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    const target = email.trim()
    if (!target) {
      setError('Enter your email address.')
      return
    }
    setLoading(true)
    try {
      await resendVerificationEmail(target)
      setMessage('If that address is registered and not yet verified, we sent a new link.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email')
    } finally {
      setLoading(false)
    }
  }

  const errorMessages: Record<string, string> = {
    TOKEN_EXPIRED: 'This link has expired. Request a new verification email below.',
    INVALID_TOKEN: 'This verification link is invalid. Request a new one below.',
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-20 left-[5%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      <section className="max-w-md mx-auto px-8 pt-20 pb-32">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black font-headline tracking-tighter mb-2">
            {success ? (
              <>
                Email <span className="text-primary italic">verified.</span>
              </>
            ) : (
              <>
                Check your <span className="text-primary italic">inbox.</span>
              </>
            )}
          </h1>
          <p className="text-on-surface-variant font-body">
            {success
              ? 'Signing you in…'
              : 'We sent a verification link. Confirm your email, then sign in.'}
          </p>
        </div>

        {(errorCode || error) && (
          <p className="text-error text-sm font-body mb-4 text-center">
            {errorCode ? (errorMessages[errorCode] ?? 'Verification failed.') : error}
          </p>
        )}

        {message && (
          <p className="text-primary text-sm font-body mb-4 text-center">{message}</p>
        )}

        {!success && (
          <form
            onSubmit={handleResend}
            className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {loading ? 'Sending…' : 'Resend verification email'}
            </button>

            <p className="text-center text-sm text-on-surface-variant font-body pt-2">
              Already verified?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}

        <p className="text-center text-sm text-on-surface-variant font-body mt-8">
          <Link to="/shop" className="text-primary font-bold hover:underline">
            Continue browsing the shop
          </Link>
        </p>
      </section>
    </div>
  )
}
