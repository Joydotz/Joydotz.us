const CLOUD_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDivuW3_P7xdpZjWqZg_7rmJpzbtPu3u6ohkCpw5CAQq74JOm3FIdzCJTTGq8AW0Mt1D72hfbJacz0KxxcUSBWC5KzF9F1O1n72iglv3VUuYuMcG3QWv4vGUjTEObV4ET2XkcomRncJmw_7OL8nynDb_mbJ1qnHG-Fmatwq71t2HXNFwIQeczUlAkAfbImQ6I47g6pBTQgXyJgkhtceQtPn074FUXODnuqQBe-oJGuQSgyZqh66fOJFCDHU8kow_YeHdmpWJX2D6ZY'
const BUTTERFLY_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDpj_Xhv7wWHt_OpxqyProbu_Uh8GV9fR0e1r5ZOq9uV_TwZLXebDRTQ7mwLHX7UPlqbVn6Cn0RLUJWLsE_9F29iGtGuGL4aQKonJywFQf1tYVHPcHsy3Pp7WgtGUDzOWB4oOaDZXEyXcBUQ-5LdALMljUhOatB2GprwoQxw-LWS-hESnOpSU7UDuzloCcTeCrbEFxhLKslB5IF7JNJlCn79H3iUYOJNbwt4h079W5ss1Z1wf-umZAkzFS42pU457g03u4eRqTKys'
const FLOWER_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiVJnvqfT-Z7HdInp1TcbPDQuboRJD24Cs57CpCUKAVjoCQOzsSxeRB3-ItKFp-S88hHLJnWXKYlOZGzQkKU0lvRhMGgiqnwgM8YknbjHINqeuO-ZdUAtirxb7NSRKyl3A6GgF580tJ8HsVv-JkXJkV7QX59y1xmQlIchcZOVLkKCTHLwa7kgJ7Xe1TDNuk0XprJwdO3G4Jelo0HlfHQwE9DuBIduT_q4fcfPlmKUrZBTpOJzpd-CtIdzfFT7360DWHwpbuJ7m3f8'
const FOUNDER_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrtrXy4b4v8_1arNj_Qu9qkzzLz2vx4MmsaVt3nFcmy6eNwDdmp7KPr8-h3QnCVSYVUvSBuwaJ3Dz7fDtETi-ucuraueL_klvOVfkt3VA7pvcbDQpWpQ3uPkvuZbyesFvO0yGb1RWNKaYG98JSPuuA_syR4iCmhrIRg2n2_holS4iVYcH2O8L1zyEkS49lbjGR6qy9OjsP_b9gwy61AtT-tSy0mk8P69Ab4EUKpsWJSd3PZQK8EQw9J5Vm-iH8ZrrJnyHd5uZnK7I'

export default function BentoGrid() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div className="max-w-xl">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-tight">
            Pick your <span className="text-primary">Mood</span>, find your Glow.
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">
            Every product is a collectible piece of joy, designed to fit the phase your skin is in today.
          </p>
        </div>
        <a href="#" className="text-primary font-bold flex items-center gap-2 group">
          Explore all SKU's
          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-[800px]">
        {/* Cloud — spans 8 cols */}
        <div className="md:col-span-8 bg-surface-container-low rounded-xl overflow-hidden flex flex-col relative group">
          <div className="p-12 z-10">
            <span className="px-4 py-1 bg-white/50 backdrop-blur rounded-full text-xs font-bold uppercase tracking-widest text-primary mb-4 inline-block">
              The Soother
            </span>
            <h3 className="text-4xl font-bold font-headline mb-4">Cloud Phase</h3>
            <p className="text-on-surface-variant max-w-xs text-lg">
              For those days when you need a gentle embrace. Hydrating, airy, and light.
            </p>
            <button className="mt-8 px-6 py-3 bg-surface-container-lowest text-on-surface rounded-full font-bold hover:scale-105 transition-all shadow-sm">
              View Cloud SKU
            </button>
          </div>
          <img
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000 -z-0"
            alt="Abstract soft blue and white clouds against a pale sky"
            src={CLOUD_IMG}
          />
        </div>

        {/* Butterfly — spans 4 cols */}
        <div className="md:col-span-4 bg-surface-container-highest rounded-xl overflow-hidden flex flex-col group relative">
          <div className="p-8 mt-auto z-10 bg-gradient-to-t from-surface-container-highest to-transparent">
            <h3 className="text-3xl font-bold font-headline mb-2">Butterfly Phase</h3>
            <p className="text-on-surface-variant text-sm">
              Brightening and revitalizing for a transformative glow.
            </p>
          </div>
          <img
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 -z-0"
            alt="Close up of serum droplets on a leaf reflecting iridescent light"
            src={BUTTERFLY_IMG}
          />
        </div>

        {/* Flower — spans 5 cols */}
        <div className="md:col-span-5 bg-tertiary-container rounded-xl overflow-hidden group relative">
          <div className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center z-10">
            <h3 className="text-3xl font-bold font-headline text-on-tertiary-container mb-2">
              Flower Phase
            </h3>
            <p className="text-on-tertiary-container/80 text-sm max-w-xs">
              Nurturing and deep-acting recovery for tired skin.
            </p>
            <button className="mt-6 px-6 py-3 bg-on-tertiary-container text-tertiary-container rounded-full font-bold text-sm">
              Shop Flower
            </button>
          </div>
          <img
            className="absolute inset-0 w-full h-full object-cover opacity-20 -z-0 group-hover:scale-105 transition-transform duration-1000"
            alt="Minimalist soft focus image of a single white blossom"
            src={FLOWER_IMG}
          />
        </div>

        {/* Quote card — spans 7 cols */}
        <div className="md:col-span-7 bg-surface-container-lowest rounded-xl p-12 flex flex-col justify-center border border-outline-variant/10 shadow-[0_40px_80px_rgba(0,0,0,0.02)]">
          <div className="flex gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">eco</span>
            </div>
          </div>

          <h3 className="text-4xl font-bold font-headline mb-4 tracking-tighter italic">
            Skincare should feel like a gift to yourself, every single day.
          </h3>

          <div className="flex items-center gap-4 mt-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden">
              <img
                className="w-full h-full object-cover"
                alt="Portrait of a smiling woman with clear natural skin"
                src={FOUNDER_IMG}
              />
            </div>
            <div>
              <p className="font-bold text-sm">Joy, Founder</p>
              <p className="text-xs text-on-surface-variant">Skin Advocate</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
