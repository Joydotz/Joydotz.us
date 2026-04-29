import FadeIn from '../ui/FadeIn'

export default function BrandMessage() {
  return (
    <section id="about" className="relative grain bg-brand-blush px-6 py-28 md:py-36 overflow-hidden">
      {/* Decorative soft circle */}
      <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Message card — mirrors the sample design exactly */}
        <FadeIn>
          <div className="bg-brand-blush rounded-none p-0">
            <p className="font-body text-base md:text-lg text-brand-dark mb-6 leading-relaxed">
              hey,
            </p>
            <p className="font-body text-base md:text-lg text-brand-dark leading-relaxed mb-6">
              some days your skin just decides to be difficult.
              <br />
              and suddenly that's the only thing you notice in the mirror.
              <br />
              but you're still you.
            </p>
            <h2 className="font-display font-black text-[clamp(2.2rem,8vw,4.5rem)] leading-none text-brand-dark uppercase mb-8">
              you're more<br />than your skin.
            </h2>
            <p className="font-body text-base md:text-lg text-brand-dark italic">
              and there's still joy in you.
            </p>
          </div>
        </FadeIn>

        {/* Brand mark */}
        <FadeIn delay={200}>
          <div className="mt-16 flex items-center gap-4">
            <div className="h-px flex-1 bg-brand-dark/15" />
            <span className="font-display font-extrabold italic text-sm tracking-tight text-brand-dark/60">
              joydotz
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
