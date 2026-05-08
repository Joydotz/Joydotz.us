import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default function Cart() {
  const { items, removeItem, updateQuantity, totalItems, totalPrice } = useCart()

  // ── Empty state ───────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />

        <section className="max-w-7xl mx-auto px-8 pt-16 pb-32 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">shopping_bag</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tighter">
            your bag is <span className="text-primary italic">empty.</span>
          </h1>
          <p className="text-on-surface-variant font-body max-w-sm">
            Add some products and come back here.
          </p>
          <Link
            to="/shop"
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-105 transition-all shadow-[0_8px_20px_rgba(126,85,70,0.15)]"
          >
            shop now
          </Link>
        </section>
      </div>
    )
  }

  // ── Filled cart ───────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-64 left-[2%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
          Your <span className="text-primary italic">Bag.</span>
        </h1>
      </section>

      {/* Body */}
      <section className="max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Item list */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-surface-container-lowest rounded-xl p-5 flex gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 rounded-lg bg-surface-container-low flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-on-surface-variant/20">image</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-headline font-bold text-lg text-on-surface leading-tight">{item.name}</h3>
                    <span className="font-body font-bold text-primary shrink-0">{fmt(item.price * item.quantity)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-body">{item.displayPrice} each</p>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity stepper */}
                    <div className="flex items-center gap-2 bg-surface-container rounded-full px-1 py-1">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-all text-on-surface-variant"
                        aria-label="decrease quantity"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="font-bold text-sm text-on-surface w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-all text-on-surface-variant"
                        aria-label="increase quantity"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="flex items-center gap-1 text-xs font-bold text-on-surface-variant/60 hover:text-error transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-4">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-6">order summary</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm font-body">
                    <span className="text-on-surface-variant">{item.name} × {item.quantity}</span>
                    <span className="text-on-surface font-bold">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-outline-variant/20 pt-4 mb-6 flex justify-between items-baseline">
                <span className="font-bold font-body text-on-surface">subtotal</span>
                <span className="font-black font-headline text-xl text-primary">{fmt(totalPrice)}</span>
              </div>

              <Link
                to="/checkout"
                className="block w-full text-center py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(126,85,70,0.15)]"
              >
                proceed to checkout
              </Link>

              <Link
                to="/shop"
                className="block w-full text-center py-3 mt-3 text-sm font-bold text-on-surface-variant hover:text-primary transition-all"
              >
                ← continue shopping
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
