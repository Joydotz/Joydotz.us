import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FadeIn from '../components/ui/FadeIn'
import ImagePlaceholder from '../components/ui/ImagePlaceholder'
import SKUBadge from '../components/ui/SKUBadge'
import { getProduct } from '../lib/products'

const skuVariant: Record<string, 'cloud' | 'butterfly' | 'flower'> = {
  cloud: 'cloud', butterfly: 'butterfly', flower: 'flower',
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-joy-text/10 py-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-4 text-left group">
        <span className="font-body font-medium text-joy-text text-sm md:text-base group-hover:text-joy-text/70 transition-colors">{q}</span>
        <span className={`text-joy-text/50 text-xl flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="body-lg pt-3 pb-1 pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const product = getProduct(slug ?? '')

  if (!product) {
    return (
      <main className="pt-16 max-w-6xl mx-auto px-6 py-24 text-center">
        <p className="body-lg">product not found.</p>
        <Link to="/shop" className="btn-primary mt-6 inline-flex">back to shop</Link>
      </main>
    )
  }

  const variant = skuVariant[product.sku]

  return (
    <main className="pt-16">

      {/* ── Main product section ─────────────────────────────── */}
      <section className="px-6 pt-12 pb-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">

          {/* Images — white surface cards on canvas */}
          <FadeIn direction="none" className="flex flex-col gap-4">
            <ImagePlaceholder aspect="aspect-square" rounded="rounded-4xl" variant={variant} className="shadow-surface" />
            <div className="grid grid-cols-2 gap-4">
              <ImagePlaceholder aspect="aspect-square" rounded="rounded-3xl" variant={variant} />
              <ImagePlaceholder aspect="aspect-square" rounded="rounded-3xl" variant={variant} />
            </div>
          </FadeIn>

          {/* Info — text directly on canvas */}
          <div className="md:sticky md:top-24 flex flex-col gap-6 pb-8">
            <FadeIn delay={0.05}><SKUBadge sku={product.sku} size="md" onCanvas /></FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="headline-lg">{product.name}</h1>
              <p className="font-body italic text-joy-text/60 mt-1">{product.tagline}</p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <p className="font-display text-3xl font-semibold text-joy-text">{product.price}</p>
              <p className="body-sm mt-1">{product.count}</p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="body-lg">{product.longDescription}</p>
            </FadeIn>

            <FadeIn delay={0.25}>
              <ul className="flex flex-col gap-2">
                {product.details.map((d) => (
                  <li key={d} className="flex items-center gap-2 body-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-joy-text/40 flex-shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.3}>
              <button className="btn-primary w-full py-4 text-base justify-center">add to bag</button>
            </FadeIn>

            {product.hiddenVariant && (
              <FadeIn delay={0.35}>
                <div className="rounded-2xl px-5 py-4 bg-joy-surface/20 border border-joy-text/10">
                  <p className="font-body text-sm text-joy-text">
                    <span className="font-medium">✦ hidden variant</span> — sometimes a surprise shape sneaks in. keep an eye on your sheets.
                  </p>
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* ── Model / lifestyle images on canvas ──────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <FadeIn><p className="label mb-8">worn on skin</p></FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n, i) => (
              <FadeIn key={n} delay={i * 0.08}>
                <ImagePlaceholder aspect="aspect-[3/4]" rounded="rounded-3xl" variant="surface" className="shadow-soft" />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's inside — surface panel ───────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="surface p-10 md:p-14">
            <FadeIn><h2 className="headline-md mb-10 text-center">what's inside</h2></FadeIn>
            <div className="grid md:grid-cols-3 gap-8">
              {product.whatsInside.map((item, i) => (
                <FadeIn key={item.label} delay={i * 0.1}>
                  <div className="flex flex-col gap-4">
                    <ImagePlaceholder aspect="aspect-square" rounded="rounded-2xl" variant={variant} />
                    <div>
                      <p className="font-display text-lg font-semibold text-joy-text">{item.label}</p>
                      <p className="body-sm mt-0.5">{item.note}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ — on canvas ─────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <FadeIn><h2 className="headline-md mb-10">questions</h2></FadeIn>
          {product.faq.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* ── Back to shop ─────────────────────────────────────── */}
      <section className="px-6 pb-24 text-center">
        <FadeIn>
          <Link to="/shop" className="btn-ghost">← see all patches</Link>
        </FadeIn>
      </section>

    </main>
  )
}
