import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const linkError = searchParams.get('error')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const showForm = token.length > 0 && linkError !== 'INVALID_TOKEN'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password.length > 128) {
      setError('Password must be at most 128 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(password, token)
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated. Sign in with your new password.' },
      })
    } catch (err) {
      const e = err as Error & { code?: string }
      setError(e.message || 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-20 left-[5%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      <section className="max-w-md mx-auto px-8 pt-20 pb-32">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black font-headline tracking-tighter mb-2">
            New <span className="text-primary italic">password.</span>
          </h1>
          <p className="text-on-surface-variant font-body">Choose a new password for your account.</p>
        </div>

        {!showForm ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 text-center">
            <p className="text-error text-sm font-body">
              This reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password" className="text-primary font-bold hover:underline text-sm">
              Request a new link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={loading}
                className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                placeholder="8–128 characters"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                disabled={loading}
                className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                placeholder="repeat password"
              />
            </div>

            {error && <p className="text-error text-sm font-body">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 mt-2"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-on-surface-variant font-body mt-8">
          <Link to="/login" className="text-primary font-bold hover:underline">
            Back to sign in
          </Link>
        </p>
      </section>
    </div>
  )
}
