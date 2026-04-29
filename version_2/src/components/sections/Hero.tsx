import FadeIn from '../ui/FadeIn'

/* SVG patch shapes — floating in the background */
function CloudPatch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 60" className={className} fill="none">
      <path
        d="M20 40 Q10 40 10 30 Q10 20 20 20 Q22 12 30 12 Q38 8 44 16 Q50 10 58 14 Q68 16 68 26 Q72 26 72 34 Q72 42 62 42 Z"
        fill="url(#cloud-grad)"
        opacity="0.7"
      />
      <defs>
        <linearGradient id="cloud-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8d8f0" />
          <stop offset="50%" stopColor="#ccc0e8" />
          <stop offset="100%" stopColor="#a8d4e8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function FlowerPatch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} fill="none">
      <path
        d="M30 10 Q36 10 36 16 Q42 10 46 16 Q52 20 46 26 Q52 30 46 34 Q42 40 36 34 Q36 40 30 40 Q24 40 24 34 Q18 40 14 34 Q8 30 14 26 Q8 20 14 16 Q18 10 24 16 Q24 10 30 10 Z"
        fill="#f5c4c0"
        opacity="0.75"
      />
    </svg>
  )
}

function ButterflyPatch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 70 50" className={className} fill="none">
      <path
        d="M35 25 Q28 10 18 10 Q8 10 8 20 Q8 30 18 30 Q25 30 30 25 Q28 22 35 25 Z"
        fill="#e0dbd4"
        opacity="0.8"
      />
      <path
        d="M35 25 Q42 10 52 10 Q62 10 62 20 Q62 30 52 30 Q45 30 40 25 Q42 22 35 25 Z"
        fill="#ede9e4"
        opacity="0.8"
      />
      <path
        d="M35 25 Q30 30 22 36 Q14 40 14 34 Q14 28 22 28 Q28 28 35 25 Z"
        fill="#d8d4ce"
        opacity="0.7"
      />
      <path
        d="M35 25 Q40 30 48 36 Q56 40 56 34 Q56 28 48 28 Q42 28 35 25 Z"
        fill="#ddd8d2"
        opacity="0.7"
      />
    </svg>
  )
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grain bg-brand-cream px-6">
      {/* Floating patch shapes — background layer */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <CloudPatch className="absolute w-28 md:w-40 top-[18%] left-[8%] animate-float opacity-60" />
        <FlowerPatch className="absolute w-20 md:w-28 top-[15%] right-[12%] animate-float-delayed opacity-55" />
        <ButterflyPatch className="absolute w-28 md:w-36 bottom-[22%] left-[14%] animate-float-slow opacity-50" />
        <CloudPatch className="absolute w-16 md:w-24 bottom-[28%] right-[10%] animate-float opacity-40" />
        <FlowerPatch className="absolute w-14 top-[55%] left-[4%] animate-float-slow opacity-35" />
        <ButterflyPatch className="absolute w-20 top-[60%] right-[5%] animate-float-delayed opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto flex flex-col items-center gap-6">
        {/* Eyebrow */}
        <FadeIn delay={0}>
          <p className="font-body text-xs tracking-[0.25em] uppercase text-brand-muted2 font-medium">
            hydrocolloid spot patches
          </p>
        </FadeIn>

        {/* Brand name */}
        <FadeIn delay={80}>
          <h1 className="font-display font-extrabold italic text-[clamp(3.5rem,12vw,7rem)] leading-none tracking-tight text-brand-dark">
            joydotz
          </h1>
        </FadeIn>

        {/* Tagline */}
        <FadeIn delay={200}>
          <p className="font-body text-[clamp(1.1rem,3vw,1.5rem)] text-brand-dark font-light leading-snug max-w-md">
            some days your skin just decides.
            <br />
            <span className="font-medium">there's still joy in you.</span>
          </p>
        </FadeIn>

        {/* CTA */}
        <FadeIn delay={340}>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <a
              href="#shop"
              className="font-body font-medium bg-brand-dark text-brand-cream px-8 py-3.5 rounded-full text-sm hover:bg-brand-muted transition-colors duration-200 hover:scale-[1.02] active:scale-[0.98] transform"
            >
              shop the collection
            </a>
            <a
              href="#about"
              className="font-body font-medium bg-brand-blush/60 text-brand-dark px-8 py-3.5 rounded-full text-sm hover:bg-brand-blush transition-colors duration-200 hover:scale-[1.02] active:scale-[0.98] transform"
            >
              our story
            </a>
          </div>
        </FadeIn>

        {/* Sub-note */}
        <FadeIn delay={460}>
          <p className="font-body text-xs text-brand-muted2 mt-1">
            cute enough to wear · comforting to use · a little collectible
          </p>
        </FadeIn>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="font-body text-xs tracking-widest uppercase text-brand-muted">scroll</span>
        <div className="w-px h-10 bg-brand-muted/40 relative overflow-hidden">
          <div className="absolute top-0 w-full h-full bg-brand-muted animate-[scrollDown_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes scrollDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
      `}</style>
    </section>
  )
}
