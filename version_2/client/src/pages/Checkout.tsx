import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import AddressBookPanel from '../components/AddressBookPanel'
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  createCheckoutSession,
  type Address,
  type AddressInput,
} from '../lib/api'

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export default function Checkout() {
  const { items, totalPrice } = useCart()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true })
      return
    }

    fetchAddresses()
      .then((addrs) => {
        setAddresses(addrs)
        const def = addrs.find((a) => a.isDefault) ?? addrs[0]
        if (def) setSelectedId(def.id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && addresses.some((a) => a.id === prev)) return prev
      const def = addresses.find((a) => a.isDefault) ?? addresses[0]
      return def?.id ?? null
    })
  }, [addresses])

  async function handleCheckoutCreate(input: AddressInput) {
    const address = await createAddress(input)
    setAddresses((prev) => [...prev, address])
    setSelectedId(address.id)
    setShowAddForm(false)
  }

  async function handleCheckoutUpdate(id: string, input: AddressInput) {
    const updated = await updateAddress(id, input)
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)))
    setEditingId(null)
  }

  async function handleCheckout() {
    if (!selectedId) return
    setSubmitting(true)
    setError('')
    try {
      const { url, orderId } = await createCheckoutSession(
        selectedId,
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      )
      sessionStorage.setItem('joydotz_pending_order', orderId)
      window.location.href = url
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const readiness = err as Error & { stripeReadiness?: { hints?: string[] } }
      if (readiness.stripeReadiness?.hints?.length) {
        msg += `\n\n${readiness.stripeReadiness.hints.join('\n')}`
      }
      setError(msg)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 pt-16 pb-32 flex items-center justify-center min-h-[60vh]">
        <div className="text-on-surface-variant font-body animate-pulse">loading…</div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-[5%] w-96 h-96 bg-primary-container/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute top-64 left-[2%] w-64 h-64 bg-secondary-container/15 rounded-full blur-[100px] -z-10" />

      <section className="max-w-7xl mx-auto px-8 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full mb-6">
          <span className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">checkout</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter leading-tight">
          Almost <span className="text-primary italic">there.</span>
        </h1>
      </section>

      <section className="max-w-7xl mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <AddressBookPanel
              variant="checkout"
              addresses={addresses}
              showAddForm={showAddForm}
              onShowAddForm={setShowAddForm}
              editingId={editingId}
              onEditingId={setEditingId}
              onCreate={handleCheckoutCreate}
              onUpdate={handleCheckoutUpdate}
              selectedForOrderId={selectedId}
              onSelectForOrder={setSelectedId}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-6">your order</h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-low flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg text-on-surface-variant/20">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold font-body text-on-surface truncate">{item.name}</p>
                      <p className="text-xs text-on-surface-variant font-body">qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold font-body text-on-surface shrink-0">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-outline-variant/20 pt-4 mb-6 flex justify-between items-baseline">
                <span className="font-bold font-body text-on-surface">total</span>
                <span className="font-black font-headline text-xl text-primary">{fmt(totalPrice)}</span>
              </div>

              {error && (
                <p className="text-error text-sm font-body mb-4 whitespace-pre-wrap">{error}</p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting || !selectedId}
                className="w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_8px_20px_rgba(126,85,70,0.15)]"
              >
                {submitting ? 'redirecting to Stripe…' : 'proceed to payment'}
              </button>

              <p className="text-xs text-on-surface-variant/50 font-body text-center mt-4 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                secured by Stripe
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
