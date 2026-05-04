import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)
      setUser(user)
      navigate('/account')
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
            Welcome <span className="text-primary italic">back.</span>
          </h1>
          <p className="text-on-surface-variant font-body">
            Sign in to your Joydotz account.
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
              disabled={loading}
              className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-surface-container px-5 py-4 rounded-full text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-error text-sm font-body">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-on-surface-variant font-body pt-2">
            No account yet?{' '}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </section>
    </div>
  )
}
