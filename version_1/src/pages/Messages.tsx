import { Link } from 'react-router-dom'
import FadeIn from '../components/ui/FadeIn'
import { messageCards } from '../lib/messages'

export default function Messages() {
  return (
    <main className="pt-16">

      {/* Header — on canvas */}
      <section className="px-6 pt-20 pb-14 text-center">
        <FadeIn className="max-w-2xl mx-auto flex flex-col gap-4">
          <h1 className="headline-lg">the messages</h1>
          <p className="body-lg">
            every joydotz box comes with one.<br />
            they're small. we mean them.
          </p>
        </FadeIn>
      </section>

      {/* Cards — lighter Pantone variant, feel like physical cards on the canvas */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {messageCards.map((card, i) => (
            <FadeIn key={card.id} delay={i * 0.1}>
              <div className="message-card min-h-80 flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-2.5">
                  {card.body.map((line, j) => (
                    <p
                      key={j}
                      className={`font-body ${
                        j === 0 ? 'text-joy-text/45 text-sm' : 'text-joy-text text-sm leading-relaxed'
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="font-display text-3xl md:text-4xl font-semibold text-joy-text leading-tight whitespace-pre-line">
                    {card.headline}
                  </p>
                  <p className="font-body text-sm italic text-joy-text/55 mt-3">{card.sign}</p>
                  <div className="flex justify-end mt-4">
                    <span className="font-display text-lg font-semibold text-joy-text/55">joydotz</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Note — on canvas */}
      <section className="pb-24 px-6">
        <FadeIn className="max-w-xl mx-auto text-center flex flex-col gap-5">
          <p className="body-lg">
            one card per box, randomly included.<br />
            each one is a little different.
          </p>
          <p className="body-sm">collect all four — or just keep opening boxes.</p>
          <Link to="/shop" className="btn-primary self-center mt-2">shop now →</Link>
        </FadeIn>
      </section>

    </main>
  )
}
