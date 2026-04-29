import FadeIn from '../ui/FadeIn'

interface SKU {
  id: string
  name: string
  subtitle: string
  tagline: string
  accentClass: string
  borderColor: string
  badgeColor: string
  badgeText: string
  patchShape: string
  count: string
}

const skus: SKU[] = [
  {
    id: 'cloud',
    name: 'Daydream Cloud',
    subtitle: 'hydrocolloid spot patches',
    tagline: 'for those soft, dreamy days',
    accentClass: 'shimmer-cloud',
    borderColor: 'border-cloud-mid/40',
    badgeColor: 'bg-cloud-light text-[#4a6080]',
    badgeText: 'iridescent shimmer',
    patchShape: 'cloud',
    count: '32 pcs · 4×8',
  },
  {
    id: 'butterfly',
    name: 'Softwing Butterfly',
    subtitle: 'hydrocolloid spot patches',
    tagline: 'quiet, graceful, gentle',
    accentClass: 'shimmer-butterfly',
    borderColor: 'border-butterfly-silver/40',
    badgeColor: 'bg-butterfly-pearl text-[#5a5550]',
    badgeText: 'pearl · soft silver',
    patchShape: 'butterfly',
    count: '32 pcs · 4×8',
  },
  {
    id: 'flower',
    name: 'Blush Flower',
    subtitle: 'hydrocolloid spot patches',
    tagline: 'sweet, warm, a little taffy',
    accentClass: 'shimmer-flower',
    borderColor: 'border-flower-pink/50',
    badgeColor: 'bg-flower-pink/40 text-[#7a3840]',
    badgeText: 'taffy pink',
    patchShape: 'flower',
    count: '32 pcs · 4×8',
  },
]

function PatchBadge({ shape }: { shape: string }) {
  if (shape === 'cloud') {
    return (
      <svg viewBox="0 0 40 30" className="w-6 h-4" fill="none">
        <path
          d="M10 20 Q5 20 5 15 Q5 10 10 10 Q11 6 16 6 Q21 4 24 8 Q27 5 31 7 Q36 8 36 13 Q38 13 38 17 Q38 21 32 21 Z"
          fill="currentColor" opacity="0.7"
        />
      </svg>
    )
  }
  if (shape === 'butterfly') {
    return (
      <svg viewBox="0 0 40 28" className="w-6 h-4" fill="none">
        <path d="M20 14 Q16 6 10 6 Q4 6 4 11 Q4 16 10 16 Q14 16 18 14 Z" fill="currentColor" opacity="0.7" />
        <path d="M20 14 Q24 6 30 6 Q36 6 36 11 Q36 16 30 16 Q26 16 22 14 Z" fill="currentColor" opacity="0.6" />
        <path d="M20 14 Q17 17 13 20 Q9 22 9 19 Q9 16 13 16 Q16 16 20 14 Z" fill="currentColor" opacity="0.6" />
        <path d="M20 14 Q23 17 27 20 Q31 22 31 19 Q31 16 27 16 Q24 16 20 14 Z" fill="currentColor" opacity="0.6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 30 30" className="w-5 h-5" fill="none">
      <path
        d="M15 5 Q18 5 18 8 Q21 5 23 8 Q26 10 23 13 Q26 15 23 17 Q21 20 18 17 Q18 20 15 20 Q12 20 12 17 Q9 20 7 17 Q4 15 7 13 Q4 10 7 8 Q9 5 12 8 Q12 5 15 5 Z"
        fill="currentColor" opacity="0.75"
      />
    </svg>
  )
}

function SKUCard({ sku, index }: { sku: SKU; index: number }) {
  return (
    <FadeIn delay={index * 120} className="flex flex-col">
      <div
        className={`group relative flex flex-col bg-brand-cream rounded-4xl border ${sku.borderColor} overflow-hidden hover:shadow-[0_8px_40px_rgba(0,0,0,0.09)] transition-shadow duration-400 h-full`}
      >
        {/* Accent swatch + image placeholder */}
        <div className={`relative h-56 md:h-64 ${sku.accentClass} flex items-end`}>
          {/* Badge */}
          <span
            className={`relative z-10 m-4 inline-flex items-center gap-1.5 text-[10px] font-body font-semibold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full ${sku.badgeColor}`}
          >
            <PatchBadge shape={sku.patchShape} />
            {sku.badgeText}
          </span>
        </div>

        {/* Text content */}
        <div className="flex flex-col flex-1 p-6 gap-3">
          <div>
            <p className="font-body text-[10px] tracking-[0.2em] uppercase text-brand-muted2 mb-1">
              {sku.subtitle}
            </p>
            <h3 className="font-display font-extrabold text-xl text-brand-dark leading-tight">
              {sku.name}
            </h3>
            <p className="font-body text-sm text-brand-muted mt-1 italic">{sku.tagline}</p>
          </div>

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-blush/40">
            <span className="font-body text-xs text-brand-muted2">{sku.count}</span>
            <button className="font-body text-sm font-medium bg-brand-dark text-brand-cream px-5 py-2 rounded-full hover:bg-brand-muted transition-colors duration-200 hover:scale-[1.03] active:scale-[0.97] transform">
              shop →
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

export default function Collection() {
  return (
    <section id="shop" className="bg-brand-warm py-24 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <FadeIn className="text-center mb-14">
          <p className="font-body text-xs tracking-[0.25em] uppercase text-brand-muted2 mb-3">the collection</p>
          <h2 className="font-display font-extrabold text-[clamp(2rem,5vw,3rem)] text-brand-dark leading-tight">
            pick your patch.
          </h2>
          <p className="font-body text-brand-muted mt-3 text-base max-w-sm mx-auto">
            cute enough to wear, comforting to use. each one a tiny ritual.
          </p>
        </FadeIn>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {skus.map((sku, i) => (
            <SKUCard key={sku.id} sku={sku} index={i} />
          ))}
        </div>

        {/* Shared details */}
        <FadeIn delay={300}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-brand-muted2 font-body">
            {[
              'hydrocolloid formula',
              'cute enough to wear',
              'latex-free',
              'dermatologist tested',
            ].map((tag) => (
              <span key={tag} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-blush inline-block" />
                {tag}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
