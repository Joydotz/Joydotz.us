import { useState } from 'react'
import { subscribeEmail } from '../../lib/api'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading' || status === 'success') return

    setStatus('loading')
    setErrorMessage('')

    try {
      await subscribeEmail(email)
      setStatus('success')
      setEmail('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-8 py-32 text-center">
      <div className="p-16 bg-surface-container-lowest rounded-xl shadow-[0_32px_80px_rgba(126,85,70,0.08)] space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary-container/30 rounded-full -translate-x-12 -translate-y-12 blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary-container/30 rounded-full translate-x-12 translate-y-12 blur-2xl" />

        <span className="material-symbols-outlined text-5xl text-primary">mail</span>

        <h2 className="text-4xl font-black font-headline tracking-tighter">Stay in the Joy.</h2>

        <p className="text-on-surface-variant max-w-lg mx-auto">
          Receive gentle reminders, skin phase guides, and first access to new collectible SKU drops.
        </p>

        {status === 'success' ? (
          <p className="text-primary font-bold text-lg">You're in! Talk soon. 🌸</p>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto relative z-10"
            onSubmit={handleSubmit}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              disabled={status === 'loading'}
              className="flex-grow bg-surface-container px-6 py-4 rounded-full border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 transition-all outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-error text-sm -mt-4">{errorMessage}</p>
        )}

        <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-bold">
          No spam. Only joy. Promise.
        </p>
      </div>
    </section>
  )
}
