import { useState } from 'react'

const categories = ['All', 'Announcements', 'Skin Tips', 'New Arrivals']

const messages = [
  {
    id: 1,
    category: 'Announcements',
    date: 'May 2026',
    title: 'Welcome to Joydotz.',
    body: 'We are officially live. After months of careful formulation and a lot of late nights, Joydotz is here. Three phases, three products — each one made to meet your skin exactly where it is. Thank you for being here from the beginning.',
    icon: 'celebration',
    pinned: true,
  },
  {
    id: 2,
    category: 'Skin Tips',
    date: 'May 2026',
    title: 'How to know which phase your skin is in.',
    body: 'Cloud Phase is for when your skin feels tight, reactive, or sensitive. Butterfly Phase is for mornings when you want luminosity and life. Flower Phase is for evenings after a long week. Trust your skin — it usually knows.',
    icon: 'lightbulb',
    pinned: false,
  },
  {
    id: 3,
    category: 'New Arrivals',
    date: 'Coming Soon',
    title: 'A fourth phase is on the way.',
    body: 'We are not ready to name it yet. But we are deep in development on a new SKU that fills a gap we have all felt. Sign up for the newsletter to hear it first.',
    icon: 'new_releases',
    pinned: false,
  },
  {
    id: 4,
    category: 'Skin Tips',
    date: 'May 2026',
    title: 'Layering the phases.',
    body: 'Yes, you can use more than one. Start with Cloud to calm and hydrate, layer Butterfly on top for glow, and finish evenings with Flower for recovery. Your skin will tell you what it needs — we just made the tools.',
    icon: 'layers',
    pinned: false,
  },
  {
    id: 5,
    category: 'Announcements',
    date: 'May 2026',
    title: 'Our packaging is intentional.',
    body: 'Every box, every label, every container was chosen with care. We kept things minimal because we believe the product should speak, not the wrapper. More details on our sustainability commitments coming soon.',
    icon: 'eco',
    pinned: false,
  },
]

export default function Messages() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered =
    activeCategory === 'All'
      ? messages
      : messages.filter((m) => m.category === activeCategory)

  return (
    <div className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-[10%] w-80 h-80 bg-secondary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-96 right-[5%] w-64 h-64 bg-primary-container/15 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
            From the Brand
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
            Messages <span className="text-primary italic">from Joy.</span>
          </h1>
          <p className="text-on-surface-variant max-w-sm text-lg font-body leading-relaxed">
            Updates, tips, and notes — straight from us to you.
          </p>
        </div>
      </section>

      {/* Category filter */}
      <section className="max-w-7xl mx-auto px-8 pb-12">
        <div className="flex gap-3 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={
                activeCategory === c
                  ? 'px-5 py-2 rounded-full font-bold text-sm bg-primary text-on-primary transition-all'
                  : 'px-5 py-2 rounded-full font-bold text-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all'
              }
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Messages feed */}
      <section className="max-w-4xl mx-auto px-8 pb-32 space-y-6">
        {filtered.map((msg) => (
          <div
            key={msg.id}
            className={`bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(126,85,70,0.08)] transition-all duration-500 ${msg.pinned ? 'border border-primary/20' : ''}`}
          >
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                <span className="material-symbols-outlined">{msg.icon}</span>
              </div>
              <div className="flex-grow space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {msg.pinned && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary rounded-full">
                      Pinned
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-surface-container text-on-surface-variant rounded-full">
                    {msg.category}
                  </span>
                  <span className="text-xs text-on-surface-variant font-body">{msg.date}</span>
                </div>
                <h2 className="text-xl font-black font-headline tracking-tight">{msg.title}</h2>
                <p className="text-on-surface-variant font-body leading-relaxed">{msg.body}</p>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-on-surface-variant py-24 text-lg font-body">
            Nothing here yet.
          </p>
        )}
      </section>
    </div>
  )
}
