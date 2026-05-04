const phases = [
  {
    label: 'Cloud Phase',
    icon: 'cloud',
    color: 'bg-tertiary-container text-on-tertiary-container',
    iconColor: 'text-tertiary',
    heading: 'The Soother',
    body: 'When your skin asks for stillness — light, airy hydration that wraps you in a gentle embrace. No drama. Just calm.',
  },
  {
    label: 'Butterfly Phase',
    icon: 'auto_awesome',
    color: 'bg-primary-container text-on-primary-container',
    iconColor: 'text-primary',
    heading: 'The Transformer',
    body: 'A burst of radiance. This phase is for the days you want your skin to wake up, glow, and take on the world.',
  },
  {
    label: 'Flower Phase',
    icon: 'eco',
    color: 'bg-secondary-container text-on-secondary-container',
    iconColor: 'text-secondary',
    heading: 'The Nurturer',
    body: 'Deep recovery for skin that has been through it. Slow down, bloom again. This one asks nothing of you.',
  },
]

const values = [
  {
    icon: 'favorite',
    title: 'Gentle by Design',
    body: 'Every formula starts with the question: is this kind enough? We never compromise on gentleness.',
  },
  {
    icon: 'auto_awesome',
    title: 'Collectible Joy',
    body: 'Skincare should feel like something you look forward to. Each SKU is a small piece of daily delight.',
  },
  {
    icon: 'eco',
    title: 'Phase-Aware',
    body: 'Your skin changes. Your routine should too. We build products that understand where you are today.',
  },
]

export default function About() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-80 left-0 w-80 h-80 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-40 right-[10%] w-64 h-64 bg-tertiary-container/20 rounded-full blur-[80px] -z-10" />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
            Our Story
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
              Joy was built on a{' '}
              <span className="text-primary italic">simple belief.</span>
            </h1>
            <p className="text-xl text-on-surface-variant font-body leading-relaxed max-w-lg">
              That skincare should never feel like a burden. It should feel like a tiny celebration — a quiet act of love you give yourself every single day.
            </p>
          </div>

          {/* Image placeholder */}
          <div className="aspect-[4/3] rounded-xl bg-surface-container-low flex items-center justify-center shadow-[0_20px_60px_rgba(126,85,70,0.08)]">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">image</span>
          </div>
        </div>
      </section>

      {/* Mission strip */}
      <section className="bg-surface-container-low py-20">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary font-label">The Joydotz Philosophy</p>
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter max-w-3xl mx-auto leading-tight">
            The skin has phases, but{' '}
            <span className="text-primary italic">joy remains.</span>
          </h2>
          <p className="text-on-surface-variant max-w-xl mx-auto text-lg font-body leading-relaxed pt-2">
            We don't chase perfection. We chase the feeling of being taken care of — by something small, beautiful, and made just for this moment.
          </p>
        </div>
      </section>

      {/* Three phases */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-tight mb-4">
          Three <span className="text-primary italic">phases.</span> One ritual.
        </h2>
        <p className="text-on-surface-variant text-lg font-body mb-16 max-w-lg">
          Each product is built around a skin phase — a moment in time your skin is living through. Find yours.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {phases.map(({ label, icon, color, iconColor, heading, body }) => (
            <div
              key={label}
              className="bg-surface-container-lowest rounded-xl p-8 flex flex-col gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(126,85,70,0.08)] transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
                <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label mb-1">
                  {label}
                </p>
                <h3 className="text-2xl font-black font-headline tracking-tighter">{heading}</h3>
              </div>
              <p className="text-on-surface-variant font-body leading-relaxed text-sm flex-grow">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder note */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Image placeholder */}
          <div className="aspect-square rounded-xl bg-surface-container-low flex items-center justify-center shadow-[0_20px_60px_rgba(126,85,70,0.08)] order-2 md:order-1">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">image</span>
          </div>

          <div className="space-y-6 order-1 md:order-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary font-label">A Note from the Founder</p>
            <h2 className="text-4xl font-black font-headline tracking-tighter leading-tight">
              I made this for the days when <span className="text-primary italic">your skin just needed a hug.</span>
            </h2>
            <p className="text-on-surface-variant font-body leading-relaxed text-lg">
              I spent years looking for skincare that felt soft, joyful, and honest. I couldn't find it, so I built it. Joydotz started as a personal ritual and grew into something I wanted to share with everyone who has ever felt overwhelmed by their own skin.
            </p>
            <p className="text-on-surface-variant font-body leading-relaxed">
              Each product is a small act of care. I hope it feels that way every time you open it.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
              <div>
                <p className="font-bold font-body">Joy</p>
                <p className="text-sm text-on-surface-variant font-body">Founder, Joydotz</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface-container-low py-24">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-tight mb-16 text-center">
            What we <span className="text-primary italic">stand for.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map(({ icon, title, body }) => (
              <div key={title} className="flex flex-col items-center text-center gap-4 p-8 bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <h3 className="text-xl font-black font-headline tracking-tight">{title}</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
