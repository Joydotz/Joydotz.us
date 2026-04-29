import FadeIn from '../ui/FadeIn'

interface Detail {
  number: string
  label: string
  description: string
  accentColor: string
  icon: string
}

const details: Detail[] = [
  {
    number: '01',
    label: 'the patch',
    description:
      'hydrocolloid magic. absorbs overnight, protects during the day. cute enough you might actually want to wear it.',
    accentColor: 'bg-cloud-light',
    icon: '✦',
  },
  {
    number: '02',
    label: 'the message card',
    description:
      'every box has one. a little note, just for you. not advice — just a reminder you already know.',
    accentColor: 'bg-brand-blush/50',
    icon: '✉',
  },
  {
    number: '03',
    label: 'the stylus',
    description:
      'apply without fingers, without fuss. clean placement, every time.',
    accentColor: 'bg-butterfly-pearl',
    icon: '◌',
  },
  {
    number: '04',
    label: 'the packaging',
    description:
      'kraft-paper inner wrap, tissue sheets, a box worth keeping. designed to feel like a little gift to yourself.',
    accentColor: 'bg-flower-pink/40',
    icon: '▢',
  },
]

export default function Ritual() {
  return (
    <section className="bg-brand-cream py-24 md:py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: header + image */}
          <div className="flex flex-col gap-8">
            <FadeIn>
              <p className="font-body text-xs tracking-[0.25em] uppercase text-brand-muted2 mb-3">
                what's inside
              </p>
              <h2 className="font-display font-extrabold text-[clamp(2rem,5vw,3rem)] text-brand-dark leading-tight">
                a soft little ritual.
              </h2>
              <p className="font-body text-brand-muted mt-4 text-base leading-relaxed max-w-sm">
                every joydotz box is packed with more than patches. it's a moment of care, designed to feel like it.
              </p>
            </FadeIn>

            {/* Product all-in-one image */}
            <FadeIn delay={150}>
              <div className="img-placeholder aspect-[4/3] w-full shadow-[0_6px_32px_rgba(0,0,0,0.04)]">
                product image
              </div>
            </FadeIn>
          </div>

          {/* Right: detail cards */}
          <div className="flex flex-col gap-4 lg:pt-20">
            {details.map((d, i) => (
              <FadeIn key={d.label} delay={i * 100}>
                <div className="group flex gap-5 items-start bg-brand-warm rounded-3xl p-5 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300">
                  <div
                    className={`shrink-0 w-11 h-11 rounded-2xl ${d.accentColor} flex items-center justify-center text-brand-muted text-lg font-body`}
                  >
                    {d.icon}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-body text-[10px] text-brand-muted2 tracking-widest">{d.number}</span>
                      <h3 className="font-display font-bold text-base text-brand-dark">{d.label}</h3>
                    </div>
                    <p className="font-body text-sm text-brand-muted leading-relaxed">{d.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
