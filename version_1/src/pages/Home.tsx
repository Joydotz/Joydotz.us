import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FadeIn from '../components/ui/FadeIn'
import ImagePlaceholder from '../components/ui/ImagePlaceholder'
import { products } from '../lib/products'
import { messageCards } from '../lib/messages'

const skuVariant: Record<string, 'cloud' | 'butterfly' | 'flower'> = {
  cloud: 'cloud', butterfly: 'butterfly', flower: 'flower',
}

export default function Home() {
  const card = messageCards[1]

  return (
    <main className="pt-16">

      {/* ── Hero — text + images directly on the canvas ─────── */}
      <section className="min-h-[92vh] flex items-center relative overflow-hidden px-6">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center py-24">

          {/* Left: copy on canvas */}
          <div className="flex flex-col gap-7">
            <FadeIn delay={0.05}>
              <span className="label">hydrocolloid spot patches</span>
            </FadeIn>

            <FadeIn delay={0.15}>
              <h1 className="headline-xl text-balance">
                skin has<br />
                moments.<br />
                <span className="text-joy-text/50">joy stays.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.25}>
              <p className="body-lg max-w-sm">
                cute patches. real comfort.<br />
                a little message for the hard days.
              </p>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="flex flex-wrap gap-3">
                <Link to="/shop" className="btn-primary">find your dot →</Link>
                <Link to="/about" className="btn-ghost">our story</Link>
              </div>
            </FadeIn>

            {/* SKU chips */}
            <FadeIn delay={0.45}>
              <div className="flex gap-2 flex-wrap">
                {products.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/shop/${p.slug}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-body font-medium
                      bg-joy-surface/30 text-joy-text border border-joy-text/10
                      hover:-translate-y-0.5 transition-transform"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: p.accentColor }} />
                    {p.name}
                  </Link>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right: white surface cards for model + product */}
          <FadeIn delay={0.1} className="relative flex justify-center">
            <div className="relative w-full max-w-sm">
              {/* Main model image — white surface card */}
              <ImagePlaceholder
                aspect="aspect-[3/4]"
                rounded="rounded-4xl"
                variant="surface"
                className="shadow-float"
              />
              {/* Floating product card */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-8 -left-8 w-36 shadow-float rounded-3xl overflow-hidden"
              >
                <ImagePlaceholder aspect="aspect-square" rounded="rounded-3xl" variant="surface" />
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Brand quote — typography directly on canvas ─────── */}
      <section className="px-6 py-24">
        <FadeIn className="max-w-2xl mx-auto text-center flex flex-col gap-6">
          <p className="label">from the message cards</p>
          <blockquote className="font-display text-4xl md:text-5xl font-semibold text-joy-text leading-[1.2] text-balance">
            "{card.headline.replace(/\n/g, ' ').toLowerCase()}"
          </blockquote>
          <p className="body-lg italic">{card.sign}</p>
          <Link to="/messages" className="btn-ghost self-center text-xs tracking-wide">
            read all messages →
          </Link>
        </FadeIn>
      </section>

      {/* ── Product trio — white surface cards on canvas ─────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="headline-md mb-3">three shapes. one feeling.</h2>
              <p className="body-lg">each one different. all of them yours.</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {products.map((p, i) => (
              <FadeIn key={p.slug} delay={i * 0.1}>
                <Link to={`/shop/${p.slug}`} className="group block">
                  <div className="surface p-5 flex flex-col gap-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-float">
                    {/* Product image */}
                    <ImagePlaceholder
                      aspect="aspect-square"
                      rounded="rounded-2xl"
                      variant={skuVariant[p.sku]}
                    />
                    {/* Model image — wide strip */}
                    <ImagePlaceholder
                      aspect="aspect-[16/7]"
                      rounded="rounded-xl"
                      variant={skuVariant[p.sku]}
                    />
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-joy-text">{p.name}</h3>
                        <p className="body-sm mt-0.5">{p.tagline}</p>
                      </div>
                      <span className="font-display text-lg font-semibold text-joy-text flex-shrink-0">{p.price}</span>
                    </div>
                    <span className="font-body text-xs text-joy-text-mid group-hover:underline underline-offset-2">
                      shop now →
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's inside — single surface panel ─────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="surface-alt p-10 md:p-14">
            <FadeIn>
              <div className="text-center mb-12">
                <h2 className="headline-md mb-3">what comes inside</h2>
                <p className="body-lg">every box is a little world.</p>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: '32 patches', sub: '4 sheets · 8 per sheet' },
                { title: 'precision stylus', sub: 'peel & press without touching' },
                { title: 'message card',     sub: 'a little something for the hard days' },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.1}>
                  <div className="flex flex-col gap-4">
                    <ImagePlaceholder aspect="aspect-[4/3]" rounded="rounded-2xl" variant="canvas" />
                    <div>
                      <p className="font-display text-lg font-semibold text-joy-text">{item.title}</p>
                      <p className="body-sm mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Model lifestyle strip — white cards on canvas ─────── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <p className="label text-center mb-8">worn with joy</p>
          </FadeIn>
          <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory">
            {[1, 2, 3, 4].map((n, i) => (
              <FadeIn key={n} delay={i * 0.08} className="flex-shrink-0 w-48 md:w-auto snap-start">
                <ImagePlaceholder aspect="aspect-[3/4]" rounded="rounded-3xl" variant="surface" className="shadow-soft" />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — on canvas ─────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="headline-md mb-3">how it works</h2>
              <p className="body-lg">three steps. that's it.</p>
            </div>
          </FadeIn>
          <div className="flex flex-col gap-10">
            {[
              { n: 1, text: 'Peel open the pouch and remove the stylus.', note: 'the kraft pouch keeps everything fresh.' },
              { n: 2, text: 'Gently lift the patch with the single-tip end.', note: 'no fingerprints = better adhesion.' },
              { n: 3, text: 'Use the dual-tip end to press the patch onto your skin.', note: 'press gently around the edges. leave it to work.' },
            ].map((item, i) => (
              <FadeIn key={item.n} delay={i * 0.1}>
                <div className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-full bg-joy-surface/40 flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-lg font-semibold text-joy-text">{item.n}</span>
                  </div>
                  <div className="pt-1 flex flex-col gap-1">
                    <p className="font-body font-medium text-joy-text text-base">{item.text}</p>
                    <p className="body-sm italic">{item.note}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Message cards preview ─────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="headline-md mb-3">the messages</h2>
              <p className="body-lg">every box comes with one. we mean them.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {messageCards.slice(0, 2).map((mc, i) => (
              <FadeIn key={mc.id} delay={i * 0.1}>
                <div className="message-card flex flex-col justify-between min-h-56 gap-6">
                  <div className="flex flex-col gap-2">
                    {mc.body.map((line, j) => (
                      <p key={j} className={`font-body ${j === 0 ? 'text-joy-text/50 text-sm' : 'text-joy-text text-sm leading-relaxed'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold text-joy-text leading-tight whitespace-pre-line">{mc.headline}</p>
                    <p className="font-body text-sm italic text-joy-text/60 mt-2">{mc.sign}</p>
                    <div className="flex justify-end mt-3">
                      <span className="font-display text-base font-semibold text-joy-text/60">joydotz</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="text-center mt-8">
            <Link to="/messages" className="btn-ghost">see all messages →</Link>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA — on canvas ───────────────────────────────────── */}
      <section className="px-6 py-28 text-center">
        <FadeIn className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <h2 className="headline-lg">still joy in you.</h2>
          <p className="body-lg">find the patch that feels like you.</p>
          <Link to="/shop" className="btn-primary px-10 py-4 text-base">shop all →</Link>
        </FadeIn>
      </section>

    </main>
  )
}
