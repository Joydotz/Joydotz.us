import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fetchOrder, fetchOrderByCheckoutSession, type Order } from '../lib/api'

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
}

export default function OrderConfirmation() {
  const { clearCart } = useCart()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (sessionId) {
          const o = await fetchOrderByCheckoutSession(sessionId)
          if (!cancelled) {
            setOrder(o)
            clearCart()
            sessionStorage.removeItem('joydotz_pending_order')
          }
          return
        }

        const orderId = sessionStorage.getItem('joydotz_pending_order')
        if (!orderId) {
          setError(true)
          return
        }

        const o = await fetchOrder(orderId)
        if (!cancelled) {
          setOrder(o)
          clearCart()
          sessionStorage.removeItem('joydotz_pending_order')
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionId, clearCart])

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-32 flex items-center justify-center min-h-[60vh]">
        <div className="text-on-surface-variant font-body animate-pulse">confirming your order…</div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
        <section className="max-w-7xl mx-auto px-8 pt-16 pb-32 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tighter">something went wrong.</h1>
          <p className="text-on-surface-variant font-body max-w-sm">
            We couldn't load your order details. Check your account for the latest status.
          </p>
          <Link
            to="/account"
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-105 transition-all"
          >
            view account
          </Link>
        </section>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-64 left-[2%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <section className="max-w-7xl mx-auto px-8 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="relative flex">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">order confirmed</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight mb-2">
          Thank <span className="text-primary italic">you.</span>
        </h1>
        <p className="text-on-surface-variant font-body text-lg">
          Order #{order.id.slice(0, 8).toUpperCase()} — {STATUS_LABEL[order.status]}
        </p>
      </section>

      {/* Body */}
      <section className="max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Items */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-6">items ordered</h2>

              <div className="space-y-1">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4 border-b border-outline-variant/20 last:border-0"
                  >
                    <div>
                      <p className="font-bold font-body text-on-surface">{item.name}</p>
                      <p className="text-xs text-on-surface-variant font-body">qty {item.quantity} · {fmt(item.priceAtPurchase)} each</p>
                    </div>
                    <span className="font-bold font-body text-on-surface">{fmt(item.priceAtPurchase * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-baseline pt-4 mt-2">
                <span className="font-bold font-body text-on-surface">total</span>
                <span className="font-black font-headline text-xl text-primary">{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address + CTAs */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-4">shipping to</h2>
              <div className="text-sm font-body text-on-surface leading-relaxed">
                <p>{order.address.line1}</p>
                {order.address.line2 && <p>{order.address.line2}</p>}
                <p>{order.address.city}, {order.address.state} {order.address.postal_code}</p>
                <p>{order.address.country}</p>
              </div>
            </div>

            <Link
              to="/shop"
              className="block w-full text-center py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(126,85,70,0.15)]"
            >
              continue shopping
            </Link>

            <Link
              to="/account"
              className="block w-full text-center py-3 text-sm font-bold text-on-surface-variant hover:text-primary transition-all"
            >
              view all orders →
            </Link>
          </div>

        </div>
      </section>
    </div>
  )
}
