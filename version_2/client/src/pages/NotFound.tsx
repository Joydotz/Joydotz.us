import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-64 left-[2%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      <section className="max-w-7xl mx-auto px-8 pt-16 pb-32 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-3xl">explore_off</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black font-headline tracking-tighter">
          this page doesn&apos;t exist.
        </h1>
        <p className="text-on-surface-variant font-body max-w-sm leading-relaxed">
          The link might be broken or the page may have moved — let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/"
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-105 transition-all text-center"
          >
            home
          </Link>
          <Link
            to="/shop"
            className="px-8 py-3 border border-outline-variant/40 text-on-surface-variant rounded-full font-bold text-sm hover:bg-surface-container transition-all text-center"
          >
            shop
          </Link>
        </div>
      </section>
    </div>
  )
}
