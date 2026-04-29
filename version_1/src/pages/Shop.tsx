import { Link } from 'react-router-dom'
import FadeIn from '../components/ui/FadeIn'
import ImagePlaceholder from '../components/ui/ImagePlaceholder'
import SKUBadge from '../components/ui/SKUBadge'
import { products } from '../lib/products'

const skuVariant: Record<string, 'cloud' | 'butterfly' | 'flower'> = {
  cloud: 'cloud', butterfly: 'butterfly', flower: 'flower',
}

export default function Shop() {
  return (
    <main className="pt-16">

      {/* Header — on canvas */}
      <section className="px-6 pt-20 pb-14 text-center">
        <FadeIn className="max-w-xl mx-auto flex flex-col gap-4">
          <h1 className="headline-lg">shop</h1>
          <p className="body-lg">three shapes. all hydrocolloid. each one a little different.</p>
        </FadeIn>
      </section>

      {/* Product grid — surface cards */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <FadeIn key={p.slug} delay={i * 0.1}>
              <Link to={`/shop/${p.slug}`} className="group block">
                <div className="surface p-5 flex flex-col gap-4 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-float">

                  {/* Product image */}
                  <ImagePlaceholder aspect="aspect-square" rounded="rounded-2xl" variant={skuVariant[p.sku]} />

                  {/* Box / packaging */}
                  <ImagePlaceholder aspect="aspect-[16/7]" rounded="rounded-xl" variant={skuVariant[p.sku]} />

                  {/* Model close-up */}
                  <ImagePlaceholder aspect="aspect-[4/3]" rounded="rounded-xl" variant={skuVariant[p.sku]} />

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <SKUBadge sku={p.sku} />
                        <h2 className="font-display text-2xl font-semibold text-joy-text mt-2 leading-tight">{p.name}</h2>
                        <p className="body-sm mt-0.5">{p.subtitle}</p>
                      </div>
                      <span className="font-display text-xl font-semibold text-joy-text flex-shrink-0">{p.price}</span>
                    </div>
                    <p className="font-body text-sm italic text-joy-text-mid">{p.tagline}</p>
                    <p className="body-sm">{p.count}</p>
                    <button className="btn-primary w-full justify-center mt-2">add to bag</button>
                    <Link
                      to={`/shop/${p.slug}`}
                      className="text-center font-body text-xs text-joy-text-soft hover:text-joy-text transition-colors underline underline-offset-2"
                    >
                      view details
                    </Link>
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn className="text-center pb-20 px-6">
        <p className="body-sm">free shipping on orders over $30 · every box includes a message card</p>
      </FadeIn>
    </main>
  )
}
