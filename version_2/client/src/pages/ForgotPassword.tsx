import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setMessage('If that email is registered, we sent a link to reset your password.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
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
            Forgot <span className="text-primary italic">password?</span>
          </h1>
          <p className="text-on-surface-variant font-body">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
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
              disabled={loading || !!message}
              className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
              placeholder="your@email.com"
            />
          </div>

          {error && <p className="text-error text-sm font-body">{error}</p>}
          {message && <p className="text-primary text-sm font-body">{message}</p>}

          <button
            type="submit"
            disabled={loading || !!message}
            className="w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 mt-2"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="text-center text-sm text-on-surface-variant font-body pt-2">
            <Link to="/login" className="text-primary font-bold hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}
