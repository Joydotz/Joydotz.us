import { Link } from 'react-router-dom'
import FadeIn from '../components/ui/FadeIn'
import ImagePlaceholder from '../components/ui/ImagePlaceholder'

export default function About() {
  return (
    <main className="pt-16">

      {/* Header — on canvas */}
      <section className="px-6 pt-20 pb-14 text-center">
        <FadeIn className="max-w-2xl mx-auto flex flex-col gap-4">
          <h1 className="headline-lg">we get it.</h1>
          <p className="body-lg">
            joydotz started from a simple feeling — that bad skin days deserve more than a clinical fix.
          </p>
        </FadeIn>
      </section>

      {/* Story — model image beside copy, on canvas */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <FadeIn direction="none">
            <ImagePlaceholder aspect="aspect-[3/4]" rounded="rounded-4xl" variant="surface" className="shadow-float" />
          </FadeIn>
          <FadeIn delay={0.15} className="flex flex-col gap-6">
            <h2 className="headline-md">skin has moments.<br />that's just skin.</h2>
            <p className="body-lg">
              a breakout doesn't need to become a whole thing. but we also know that sometimes it does —
              the one you notice in every reflection, that somehow becomes the only thing you think about.
            </p>
            <p className="body-lg">
              joydotz patches absorb, protect, work quietly while you sleep.
              but the reason we made them cute is because the ritual matters.
              the way you treat yourself matters.
            </p>
            <p className="body-lg">you deserve a patch that feels like you. not a medical supply.</p>
          </FadeIn>
        </div>
      </section>

      {/* What we believe — surface panel */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="surface p-10 md:p-14">
            <FadeIn><h2 className="headline-md mb-12 text-center">what we believe</h2></FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'skin is not your identity.',
                  body: 'a bad skin day changes nothing true about you. we just want to help you remember that.',
                },
                {
                  title: 'comfort should look good.',
                  body: 'self-care isn\'t a chore. putting on a patch can feel like something you\'re choosing, not just enduring.',
                },
                {
                  title: 'joy is not conditional.',
                  body: 'it\'s not something you earn after your skin clears. it\'s here now. a little bit, at least.',
                },
              ].map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.1}>
                  <div className="flex flex-col gap-3">
                    <h3 className="font-display text-xl font-semibold text-joy-text leading-tight">{item.title}</h3>
                    <p className="body-lg">{item.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Second model image + copy — on canvas */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-12 items-center">
          <FadeIn delay={0.1} className="md:col-span-3 flex flex-col gap-6">
            <h2 className="headline-md">"a soft little layer<br />of comfort and joy."</h2>
            <p className="body-lg">
              every box includes a message card. not because a card fixes anything —
              but because being seen a little, even by a brand, is worth doing.
            </p>
            <Link to="/messages" className="btn-ghost self-start">read the messages →</Link>
          </FadeIn>
          <FadeIn direction="none" className="md:col-span-2">
            <ImagePlaceholder aspect="aspect-[3/4]" rounded="rounded-4xl" variant="surface" className="shadow-float" />
          </FadeIn>
        </div>
      </section>

      {/* Lifestyle image pair — white cards on canvas */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-2 gap-4">
          <FadeIn>
            <ImagePlaceholder aspect="aspect-[4/3]" rounded="rounded-3xl" variant="surface" className="shadow-soft" />
          </FadeIn>
          <FadeIn delay={0.08}>
            <ImagePlaceholder aspect="aspect-[4/3]" rounded="rounded-3xl" variant="surface" className="shadow-soft" />
          </FadeIn>
        </div>
      </section>

      {/* CTA — on canvas */}
      <section className="px-6 py-24 text-center">
        <FadeIn className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <h2 className="headline-md">find your dot.</h2>
          <p className="body-lg">three shapes. all comfort.</p>
          <Link to="/shop" className="btn-primary px-10 py-4 text-base">shop now →</Link>
        </FadeIn>
      </section>

    </main>
  )
}
