import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FadeIn from '../components/ui/FadeIn'

const faqs = [
  {
    category: 'the product',
    items: [
      { q: 'What are joydotz patches made of?', a: 'joydotz are hydrocolloid patches — the same technology used in wound care, now in cute shapes. hydrocolloid creates a moist environment that absorbs the fluid from a blemish while protecting it from bacteria and picking.' },
      { q: 'Do they actually work?', a: 'yes. hydrocolloid is one of the most well-studied acne patch technologies available. the patch absorbs pus and fluid, protects the area, and reduces inflammation. the cute shape doesn\'t change the science.' },
      { q: 'How long should I wear one?', a: 'at least 6–8 hours. overnight is ideal. the patch turns white when it\'s worked — that\'s the absorbed fluid.' },
      { q: 'Can I wear them during the day?', a: 'you can. daydream cloud has an iridescent finish that\'s genuinely cute to wear out. blush flower is pink and visible. softwind butterfly blends most easily.' },
      { q: 'What skin types work with these?', a: 'hydrocolloid is gentle for most skin types including sensitive. if you have very reactive skin, patch test first.' },
    ],
  },
  {
    category: 'using the stylus',
    items: [
      { q: 'Why is there a stylus?', a: 'touching the patch with your fingers transfers oil, which reduces adhesion. the stylus lets you lift and place without contact — so it sticks better.' },
      { q: 'How do I use it?', a: 'single tip to lift the patch off the sheet. dual tip to press the edges onto your skin. that\'s it.' },
    ],
  },
  {
    category: 'the box',
    items: [
      { q: 'How many patches come in a box?', a: '32 patches — 4 sheets of 8. each sheet is sealed in its own pouch.' },
      { q: 'What is the hidden variant?', a: 'sometimes a surprise shape sneaks into a sheet. we\'ll leave it at that.' },
      { q: 'What are the message cards?', a: 'every box includes a card with a short message — genuine, not marketing copy. four different ones, included randomly.' },
    ],
  },
  {
    category: 'orders & shipping',
    items: [
      { q: 'Do you ship internationally?', a: 'yes. joydotz ships worldwide. shipping times vary by location.' },
      { q: 'Is there free shipping?', a: 'free shipping on orders over $30.' },
      { q: 'Can I return a box?', a: 'if your order arrives damaged or incorrect, reach out and we\'ll make it right. for hygiene reasons we can\'t accept returns on opened boxes.' },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-joy-text/10 py-5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-6 text-left group">
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
            <p className="body-lg pt-4 pb-1 pr-10">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  return (
    <main className="pt-16">

      {/* Header — on canvas */}
      <section className="px-6 pt-20 pb-14 text-center">
        <FadeIn className="max-w-xl mx-auto flex flex-col gap-4">
          <h1 className="headline-lg">questions</h1>
          <p className="body-lg">the honest answers.</p>
        </FadeIn>
      </section>

      {/* FAQ — surface panel */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="surface p-8 md:p-12">
            <div className="flex flex-col gap-12">
              {faqs.map((section, i) => (
                <FadeIn key={section.category} delay={i * 0.05}>
                  <div>
                    <p className="label mb-4">{section.category}</p>
                    {section.items.map((item) => (
                      <FAQItem key={item.q} q={item.q} a={item.a} />
                    ))}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions — on canvas */}
      <section className="pb-24 px-6 text-center">
        <FadeIn className="max-w-sm mx-auto flex flex-col items-center gap-4">
          <p className="body-lg">still have a question?</p>
          <a href="mailto:hello@joydotz.us" className="btn-ghost">email us →</a>
          <Link to="/shop" className="btn-primary mt-1">shop now →</Link>
        </FadeIn>
      </section>

    </main>
  )
}
