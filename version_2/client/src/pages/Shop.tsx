import { useEffect, useState } from 'react'
import { fetchProducts, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'

const filters = ['All', 'Cloud Phase', 'Butterfly Phase', 'Flower Phase']

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [added, setAdded] = useState<string | null>(null)
  const { addItem } = useCart()

  function handleAddToCart(product: Product) {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      displayPrice: product.displayPrice,
      imageUrl: product.imageUrl,
    })
    setAdded(product.id)
    setTimeout(() => setAdded(null), 1200)
  }

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-64 left-[2%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      {/* Page header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
            Collectible Skincare
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
            Shop <span className="text-primary italic">All</span> Products
          </h1>
          <p className="text-on-surface-variant max-w-sm text-lg font-body leading-relaxed">
            Three phases. One ritual. Pick the one your skin is asking for today.
          </p>
        </div>
      </section>

      {/* Filter row */}
      <section className="max-w-7xl mx-auto px-8 pb-12">
        <div className="flex gap-3 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={
                activeFilter === f
                  ? 'px-5 py-2 rounded-full font-bold text-sm bg-primary text-on-primary transition-all'
                  : 'px-5 py-2 rounded-full font-bold text-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all'
              }
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Product grid */}
      <section className="max-w-7xl mx-auto px-8 pb-32">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface-container-lowest rounded-xl p-5 animate-pulse">
                <div className="aspect-[4/5] rounded-lg bg-surface-container-low mb-6" />
                <div className="space-y-3 px-1">
                  <div className="h-4 bg-surface-container-low rounded w-3/4" />
                  <div className="h-3 bg-surface-container-low rounded w-full" />
                  <div className="h-3 bg-surface-container-low rounded w-2/3" />
                  <div className="h-12 bg-surface-container-low rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-on-surface-variant text-center py-24 text-lg">
            Unable to load products. Please try again later.
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-surface-container-lowest rounded-xl p-5 flex flex-col group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(126,85,70,0.1)] transition-all duration-500"
              >
                {/* Image placeholder */}
                <div className="aspect-[4/5] rounded-lg bg-surface-container-low mb-6 flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/20">
                    image
                  </span>
                </div>

                <div className="flex flex-col flex-grow px-1 space-y-3">
                  {/* Name + price */}
                  <div className="flex justify-between items-start">
                    <h2 className="font-headline font-bold text-xl text-on-surface leading-tight">
                      {product.name}
                    </h2>
                    <span className="font-body font-bold text-primary text-lg shrink-0 ml-2">
                      {product.displayPrice}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-on-surface-variant font-body leading-relaxed flex-grow">
                    {product.description}
                  </p>

                  {/* Divider */}
                  <div className="border-t border-outline-variant/20 pt-4 mt-2 flex gap-3">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 py-3 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(126,85,70,0.15)]"
                    >
                      {added === product.id ? '✓ Added' : 'Add to Bag'}
                    </button>
                    <button className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all">
                      <span className="material-symbols-outlined text-xl">favorite</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
