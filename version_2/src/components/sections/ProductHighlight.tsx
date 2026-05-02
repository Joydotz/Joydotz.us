const SHELF_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbYHFh0WSe_1zxCAlGyMPSAcHNW3dmyBaHKeuR_fHUPZ-9IF04OqBzjJvvzeVG1RgUO3MeOqLsuSzYo4d76WyqamnFfW4fUgMQvpuem4W7uVj4TxgatnC-v54Zcs8SLjdVy3joeNe4ki6-qyHEflU2ud25-JbbHYkcoxhXjDxCixDzqc7phXul_nCbyl91ruUxzCSXUxcwevKskCPoQLHXDLa4gZlCAP2sAMd5yHdoZ6_D7AhKNbB7vuo73ab_Ia-FSbfE-kK9hy0'

const features = [
  'Physiologically Balanced Formulas',
  'Sustainable, Collectible Packaging',
  'Dermatologically Gentle for All Phases',
]

export default function ProductHighlight() {
  return (
    <section className="bg-surface-container-low py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center gap-24">
        {/* Image column */}
        <div className="relative w-full md:w-1/2">
          <div className="relative z-10 rounded-xl overflow-hidden aspect-[4/5] shadow-2xl">
            <img
              className="w-full h-full object-cover"
              alt="Minimalist aesthetic shelf with beautifully designed pastel cosmetic bottles"
              src={SHELF_IMG}
            />
          </div>
          {/* Sticker label */}
          <div className="absolute -bottom-10 -right-10 md:-right-10 bg-white p-6 rounded-xl shadow-2xl z-20 max-w-[200px] rotate-3">
            <p className="font-headline font-bold text-primary italic leading-tight mb-2">
              Collect them all
            </p>
            <p className="text-xs text-on-surface-variant font-body">
              Our bottles are designed to look beautiful on your vanity, reminding you that joy is constant.
            </p>
          </div>
        </div>

        {/* Text column */}
        <div className="w-full md:w-1/2 space-y-8">
          <h2 className="text-5xl font-black font-headline tracking-tighter">
            Your bathroom,{' '}
            <br />
            transformed into a{' '}
            <span className="text-primary underline decoration-primary-container decoration-8 underline-offset-4">
              Dreamscape
            </span>
            .
          </h2>

          <p className="text-lg text-on-surface-variant leading-relaxed">
            We believe that the beauty of skincare is not just in the results, but in the ritual.
            Each Joydotz SKU is crafted with a soft-touch finish and weighted feel that makes every
            application a sensory delight.
          </p>

          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </span>
                <span className="font-bold text-on-surface">{f}</span>
              </li>
            ))}
          </ul>

          <button className="px-8 py-4 bg-on-background text-background rounded-full font-bold hover:scale-105 transition-all">
            Explore the Collection
          </button>
        </div>
      </div>
    </section>
  )
}
