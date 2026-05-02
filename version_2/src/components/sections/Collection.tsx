const products = [
  {
    name: 'Cloud Phase Patch',
    price: '$18.00',
    description: 'A gentle, weightless embrace for moments of peak sensitivity.',
    alt: 'Soft focused white cloud-shaped patches on a pastel blue gradient background',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDivuW3_P7xdpZjWqZg_7rmJpzbtPu3u6ohkCpw5CAQq74JOm3FIdzCJTTGq8AW0Mt1D72hfbJacz0KxxcUSBWC5KzF9F1O1n72iglv3VUuYuMcG3QWv4vGUjTEObV4ET2XkcomRncJmw_7OL8nynDb_mbJ1qnHG-Fmatwq71t2HXNFwIQeczUlAkAfbImQ6I47g6pBTQgXyJgkhtceQtPn074FUXODnuqQBe-oJGuQSgyZqh66fOJFCDHU8kow_YeHdmpWJX2D6ZY',
  },
  {
    name: 'Butterfly Phase Serum',
    price: '$22.00',
    description: "Transformative radiance that wakes up your skin's natural glow.",
    alt: 'Iridescent serum droplet on a soft pink surface with artistic lighting',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDpj_Xhv7wWHt_OpxqyProbu_Uh8GV9fR0e1r5ZOq9uV_TwZLXebDRTQ7mwLHX7UPlqbVn6Cn0RLUJWLsE_9F29iGtGuGL4aQKonJywFQf1tYVHPcHsy3Pp7WgtGUDzOWB4oOaDZXEyXcBUQ-5LdALMljUhOatB2GprwoQxw-LWS-hESnOpSU7UDuzloCcTeCrbEFxhLKslB5IF7JNJlCn79H3iUYOJNbwt4h079W5ss1Z1wf-umZAkzFS42pU457g03u4eRqTKys',
  },
  {
    name: 'Flower Phase Patch',
    price: '$18.00',
    description: 'Nurturing recovery for skin that needs a moment to bloom again.',
    alt: 'Close up of a delicate white flower petal with a morning dew drop',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiVJnvqfT-Z7HdInp1TcbPDQuboRJD24Cs57CpCUKAVjoCQOzsSxeRB3-ItKFp-S88hHLJnWXKYlOZGzQkKU0lvRhMGgiqnwgM8YknbjHINqeuO-ZdUAtirxb7NSRKyl3A6GgF580tJ8HsVv-JkXJkV7QX59y1xmQlIchcZOVLkKCTHLwa7kgJ7Xe1TDNuk0XprJwdO3G4Jelo0HlfHQwE9DuBIduT_q4fcfPlmKUrZBTpOJzpd-CtIdzfFT7360DWHwpbuJ7m3f8',
  },
  {
    name: 'Dream Mist',
    price: '$20.00',
    description: 'A fine, ethereal spray that locks in joy and hydration instantly.',
    alt: 'A hazy, dreamy aesthetic bottle reflecting soft purple and amber light',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbYHFh0WSe_1zxCAlGyMPSAcHNW3dmyBaHKeuR_fHUPZ-9IF04OqBzjJvvzeVG1RgUO3MeOqLsuSzYo4d76WyqamnFfW4fUgMQvpuem4W7uVj4TxgatnC-v54Zcs8SLjdVy3joeNe4ki6-qyHEflU2ud25-JbbHYkcoxhXjDxCixDzqc7phXul_nCbyl91ruUxzCSXUxcwevKskCPoQLHXDLa4gZlCAP2sAMd5yHdoZ6_D7AhKNbB7vuo73ab_Ia-FSbfE-kK9hy0',
  },
]

export default function Collection() {
  return (
    <section className="max-w-7xl mx-auto px-8 py-24">
      <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-tight mb-16">
        All <span className="text-primary italic">Products</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <div
            key={product.name}
            className="bg-surface-container-lowest rounded-xl p-4 flex flex-col group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(126,85,70,0.1)] transition-all duration-500"
          >
            <div className="aspect-square rounded-lg overflow-hidden mb-6 bg-surface-container-low">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt={product.alt}
                src={product.src}
              />
            </div>
            <div className="flex flex-col flex-grow space-y-2 px-2">
              <div className="flex justify-between items-start">
                <h3 className="font-headline font-bold text-lg text-on-surface">{product.name}</h3>
                <span className="font-body font-bold text-primary">{product.price}</span>
              </div>
              <p className="text-sm text-on-surface-variant font-body leading-relaxed flex-grow">
                {product.description}
              </p>
              <button className="mt-4 w-full py-3 bg-secondary text-on-secondary rounded-full font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all">
                Add to Bag
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
