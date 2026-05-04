import { useEffect, useState } from 'react'
import { fetchProducts, type Product } from '../../lib/api'

export default function Collection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="max-w-7xl mx-auto px-8 py-24">
      <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter leading-tight mb-16">
        All <span className="text-primary italic">Products</span>
      </h2>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface-container-lowest rounded-xl p-4 animate-pulse">
              <div className="aspect-square rounded-lg bg-surface-container-low mb-6" />
              <div className="px-2 space-y-3">
                <div className="h-4 bg-surface-container-low rounded w-3/4" />
                <div className="h-3 bg-surface-container-low rounded w-full" />
                <div className="h-3 bg-surface-container-low rounded w-2/3" />
                <div className="h-10 bg-surface-container-low rounded-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-on-surface-variant text-center py-16">
          Unable to load products. Please try again later.
        </p>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-surface-container-lowest rounded-xl p-4 flex flex-col group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(126,85,70,0.1)] transition-all duration-500"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-6 bg-surface-container-low">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={`${product.name} product photo`}
                  src={product.imageUrl}
                />
              </div>
              <div className="flex flex-col flex-grow space-y-2 px-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-headline font-bold text-lg text-on-surface">{product.name}</h3>
                  <span className="font-body font-bold text-primary">{product.displayPrice}</span>
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
      )}
    </section>
  )
}
