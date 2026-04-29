export default function Footer() {
  return (
    <footer id="faq" className="bg-brand-dark text-brand-cream">
      {/* FAQ strip */}
      <div className="border-b border-white/10 px-6 py-14 md:py-16">
        <div className="max-w-4xl mx-auto">
          <p className="font-body text-xs tracking-[0.25em] uppercase text-brand-cream/40 mb-8">FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                q: "how do i use them?",
                a: "clean and dry skin, then press a patch on the spot. use the stylus to place without touching. leave overnight or wear during the day.",
              },
              {
                q: "how long do i wear each patch?",
                a: "at least 6–8 hours. overnight is ideal. you'll know it's working when it turns white and swells slightly.",
              },
              {
                q: "what's the hidden variant?",
                a: "some boxes ship with a surprise SKU inside. you won't know which until you open it — that's part of the joy.",
              },
              {
                q: "are they safe for sensitive skin?",
                a: "yes. our patches are latex-free, fragrance-free, and dermatologist tested. hydrocolloid is gentle by design.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="flex flex-col gap-2">
                <h3 className="font-display font-bold text-base text-brand-cream">{q}</h3>
                <p className="font-body text-sm text-brand-cream/60 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="px-6 py-12 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="font-display font-extrabold italic text-3xl tracking-tight text-brand-cream">
              joydotz
            </span>
            <p className="font-body text-sm text-brand-cream/50 max-w-xs leading-relaxed">
              a soft little layer of comfort and joy.
              <br />
              hydrocolloid spot patches, designed with care.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-14">
            <div className="flex flex-col gap-3">
              <p className="font-body text-[10px] tracking-[0.2em] uppercase text-brand-cream/30 mb-1">shop</p>
              {['Daydream Cloud', 'Softwing Butterfly', 'Blush Flower'].map((name) => (
                <a
                  key={name}
                  href="#shop"
                  className="font-body text-sm text-brand-cream/60 hover:text-brand-cream transition-colors"
                >
                  {name}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-body text-[10px] tracking-[0.2em] uppercase text-brand-cream/30 mb-1">brand</p>
              {['About', 'Messages', 'FAQ', 'Contact'].map((name) => (
                <a
                  key={name}
                  href={`#${name.toLowerCase()}`}
                  className="font-body text-sm text-brand-cream/60 hover:text-brand-cream transition-colors"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-brand-cream/30">
            © 2025 joydotz. all rights reserved.
          </p>
          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Shipping'].map((l) => (
              <a key={l} href="#" className="font-body text-xs text-brand-cream/30 hover:text-brand-cream/60 transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
