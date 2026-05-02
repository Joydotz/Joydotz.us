import { useState } from 'react'

export default function Newsletter() {
  const [email, setEmail] = useState('')

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

        <form
          className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto relative z-10"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="flex-grow bg-surface-container px-6 py-4 rounded-full border-none focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 transition-all outline-none"
          />
          <button
            type="submit"
            className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold hover:scale-105 transition-all active:scale-95"
          >
            Subscribe
          </button>
        </form>

        <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-bold">
          No spam. Only joy. Promise.
        </p>
      </div>
    </section>
  )
}
