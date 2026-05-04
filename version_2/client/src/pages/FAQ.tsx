import { useState } from 'react'

const sections = [
  {
    heading: 'Products',
    items: [
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
    ],
  },
  {
    heading: 'Orders & Shipping',
    items: [
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
    ],
  },
  {
    heading: 'Returns & Refunds',
    items: [
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
    ],
  },
  {
    heading: 'Brand',
    items: [
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
      { q: 'Question placeholder', a: 'Answer placeholder.' },
    ],
  },
]

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-outline-variant/20 last:border-none">
      <button
        className="w-full flex justify-between items-center py-5 text-left gap-4"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="font-bold font-body text-on-surface">{q}</span>
        <span
          className={`material-symbols-outlined text-primary shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p className="text-on-surface-variant font-body leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-[5%] w-80 h-80 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-40 left-[5%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
            Got Questions
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
            Frequently <span className="text-primary italic">Asked.</span>
          </h1>
          <p className="text-on-surface-variant max-w-sm text-lg font-body leading-relaxed">
            Everything you need to know, in one place.
          </p>
        </div>
      </section>

      {/* Accordion sections */}
      <section className="max-w-3xl mx-auto px-8 pb-32 space-y-12">
        {sections.map(({ heading, items }) => (
          <div key={heading}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-2">
              {heading}
            </h2>
            <div className="bg-surface-container-lowest rounded-xl px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {items.map(({ q, a }) => (
                <AccordionItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        ))}

        {/* Contact prompt */}
        <div className="bg-surface-container-low rounded-xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
            <span className="material-symbols-outlined text-2xl">mail</span>
          </div>
          <h3 className="text-2xl font-black font-headline tracking-tight">Still have a question?</h3>
          <p className="text-on-surface-variant font-body">
            Contact copy placeholder.
          </p>
          <a
            href="#"
            className="inline-block mt-2 px-8 py-3 bg-primary text-on-primary rounded-full font-bold hover:scale-105 transition-all active:scale-95"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}
