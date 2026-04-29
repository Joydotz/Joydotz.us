import FadeIn from '../ui/FadeIn'

interface Card {
  intro: string
  body: string
  headline: string
  closing: string
}

const cards: Card[] = [
  {
    intro: 'hey,',
    body: "some days your skin just decides to be difficult.\nand suddenly that's the only thing you notice in the mirror.",
    headline: "YOU'RE MORE\nTHAN YOUR SKIN.",
    closing: "and there's still joy in you.",
  },
  {
    intro: 'hey,',
    body: "this little moment?\nit's not taking your cute away.\nnot your smile. not your vibe. not your glow.",
    headline: 'STILL CUTE.\nSTILL YOU.',
    closing: 'still joy, too.',
  },
  {
    intro: 'hey,',
    body: "not being there yet doesn't mean you're not getting there.\nsome things move under the surface before they show up on the outside.",
    headline: 'MORE IS\nHAPPENING\nTHAN YOU THINK.',
    closing: 'patience makes space for that. so does joy.',
  },
  {
    intro: 'hey,',
    body: "i know you give people so much grace.\nsometimes even when it costs you more than they notice.",
    headline: 'YOU DESERVE\nTHAT KINDNESS\nTOO.',
    closing: 'and a little joy with it.',
  },
]

/* A single message card styled like the reference samples */
function MessageCard({ card, rotate = 0 }: { card: Card; rotate?: number }) {
  return (
    <div
      className="shrink-0 w-64 md:w-72 bg-brand-blush rounded-3xl p-7 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.07)] select-none"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <p className="font-body text-sm text-brand-dark">{card.intro}</p>
      <p className="font-body text-sm text-brand-dark leading-relaxed whitespace-pre-line">{card.body}</p>
      <p className="font-display font-black text-xl text-brand-dark uppercase leading-tight whitespace-pre-line mt-1">
        {card.headline}
      </p>
      <p className="font-body text-sm text-brand-dark italic mt-auto pt-2">{card.closing}</p>
      <span className="font-display font-extrabold italic text-xs text-brand-dark/40 mt-2 self-end">joydotz</span>
    </div>
  )
}

export default function MessageCards() {
  const doubled = [...cards, ...cards] // duplicate for seamless loop

  return (
    <section id="messages" className="bg-brand-warm py-24 md:py-32 overflow-hidden">
      {/* Section header */}
      <FadeIn className="text-center px-6 mb-14">
        <p className="font-body text-xs tracking-[0.25em] uppercase text-brand-muted2 mb-3">messages</p>
        <h2 className="font-display font-extrabold text-[clamp(2rem,5vw,3rem)] text-brand-dark leading-tight">
          a little note, just for you.
        </h2>
        <p className="font-body text-brand-muted mt-3 text-base max-w-sm mx-auto">
          every box includes a message card. we hope it lands when you need it.
        </p>
      </FadeIn>

      {/* Scrolling marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-brand-warm to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-brand-warm to-transparent z-10 pointer-events-none" />

        <div className="flex gap-5 marquee-track animate-scroll-left" style={{ width: 'max-content' }}>
          {doubled.map((card, i) => (
            <MessageCard
              key={i}
              card={card}
              rotate={i % 4 === 0 ? -1.5 : i % 4 === 1 ? 1 : i % 4 === 2 ? -0.5 : 1.5}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <FadeIn delay={100} className="text-center mt-14 px-6">
        <p className="font-body text-sm text-brand-muted mb-4">
          hidden variants. different messages. collect them all.
        </p>
        <a
          href="#shop"
          className="inline-block font-body text-sm font-medium bg-brand-dark text-brand-cream px-8 py-3.5 rounded-full hover:bg-brand-muted transition-colors duration-200"
        >
          shop the collection
        </a>
      </FadeIn>
    </section>
  )
}
