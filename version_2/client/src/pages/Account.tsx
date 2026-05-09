import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  updateNewsletter,
  fetchOrders,
  fetchIncompleteOrders,
  resumeIncompleteCheckout,
  dismissIncompleteOrder,
  updateOrderShippingAddress,
  type Address,
  type AddressInput,
  type Order,
} from '../lib/api'
import AddressForm from '../components/AddressForm'

function orderShippingToInput(addr: Order['address']): AddressInput {
  return {
    line1: addr.line1,
    line2: addr.line2 ?? '',
    city: addr.city,
    state: addr.state,
    postal_code: addr.postal_code,
    country: addr.country,
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Account() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [incompleteOrders, setIncompleteOrders] = useState<Order[]>([])
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null)
  const [dismissingOrderId, setDismissingOrderId] = useState<string | null>(null)
  const [resumeCheckoutError, setResumeCheckoutError] = useState<string | null>(null)
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingShippingOrderId, setEditingShippingOrderId] = useState<string | null>(null)
  const [newsletterOptIn, setNewsletterOptIn] = useState(user?.newsletterOptIn ?? false)
  const [newsletterSaving, setNewsletterSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [addrs, ords, incomplete] = await Promise.all([
          fetchAddresses(),
          fetchOrders(),
          fetchIncompleteOrders(),
        ])
        setAddresses(addrs)
        setOrders(ords)
        setIncompleteOrders(incomplete)
      } catch {
        setAccountLoadError('Could not load addresses or orders. Try refreshing or signing in again.')
      }
    })()
  }, [])

  useEffect(() => {
    setNewsletterOptIn(user?.newsletterOptIn ?? false)
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function handleNewsletterToggle(checked: boolean) {
    setNewsletterOptIn(checked)
    setNewsletterSaving(true)
    try {
      await updateNewsletter(checked)
      if (user) setUser({ ...user, newsletterOptIn: checked })
    } catch {
      setNewsletterOptIn(!checked) // revert on error
    } finally {
      setNewsletterSaving(false)
    }
  }

  async function handleCreateAddress(input: AddressInput) {
    const address = await createAddress(input)
    setAddresses((prev) => [...prev, address])
    setShowAddForm(false)
  }

  async function handleUpdateAddress(id: string, input: AddressInput) {
    const updated = await updateAddress(id, input)
    setAddresses((prev) => prev.map((a) => (a.id === id ? updated : a)))
    setEditingId(null)
  }

  async function handleDeleteAddress(id: string) {
    setDeletingId(id)
    try {
      await deleteAddress(id)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // silent — button re-enables, user can retry
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    await setDefaultAddress(id)
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id })),
    )
  }

  async function handleSaveOrderShipping(orderId: string, input: AddressInput) {
    const address = await updateOrderShippingAddress(orderId, input)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, address } : o)),
    )
    setAddresses((prev) =>
      prev.map((a) => (a.id === address.id ? { ...a, ...address } : a)),
    )
    setEditingShippingOrderId(null)
  }

  async function handleResumeCheckout(orderId: string) {
    setResumeCheckoutError(null)
    setResumingOrderId(orderId)
    try {
      const { url } = await resumeIncompleteCheckout(orderId)
      window.location.href = url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not resume checkout.'
      setResumeCheckoutError(message)
    } finally {
      setResumingOrderId(null)
    }
  }

  async function handleDismissIncomplete(orderId: string) {
    setDismissingOrderId(orderId)
    try {
      await dismissIncompleteOrder(orderId)
      setIncompleteOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch {
      /* user can retry */
    } finally {
      setDismissingOrderId(null)
    }
  }

  const hasOrderHistory = orders.length > 0
  const showFullOrdersEmptyState = orders.length === 0 && incompleteOrders.length === 0

  return (
    <div className="max-w-7xl mx-auto px-8 pt-12 pb-32">
      {accountLoadError && (
        <p className="mb-6 text-error text-sm font-body bg-error/10 border border-error/20 rounded-xl px-4 py-3">
          {accountLoadError}
        </p>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">account_circle</span>
          </div>
          <div>
            <h1 className="text-2xl font-black font-headline tracking-tighter">account</h1>
            <p className="text-xs text-on-surface-variant font-body">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          log out
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Orders — spans 7 cols */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {incompleteOrders.length > 0 && (
            <div className="mb-8 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                continue where you left off:
              </p>
              {resumeCheckoutError && (
                <p className="text-error text-sm font-body bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                  {resumeCheckoutError}
                </p>
              )}
              {incompleteOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-primary/20 bg-primary/5 rounded-xl p-5"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-body text-on-surface">
                      cart total{' '}
                      <span className="font-black font-headline text-primary">
                        ${(order.total / 100).toFixed(2)}
                      </span>
                      <span className="text-on-surface-variant">
                        {' '}
                        · started{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-on-surface-variant font-body truncate">
                      {order.items.map((i) => `${i.name} × ${i.quantity}`).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResumeCheckout(order.id)}
                      disabled={resumingOrderId === order.id}
                      className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      {resumingOrderId === order.id ? 'opening…' : 'continue checkout'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissIncomplete(order.id)}
                      disabled={dismissingOrderId === order.id}
                      className="px-5 py-2.5 rounded-full border border-outline-variant/40 text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all disabled:opacity-40"
                    >
                      {dismissingOrderId === order.id ? 'dismissing…' : 'dismiss'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-6">orders</h2>

          {showFullOrdersEmptyState ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              </div>
              <h3 className="font-black font-headline text-xl tracking-tight">no orders so far.</h3>
              <p className="text-on-surface-variant font-body text-sm max-w-xs">
                once you place an order, it will show up here.
              </p>
              <Link
                to="/shop"
                className="mt-2 px-8 py-3 bg-primary text-on-primary rounded-full font-bold text-sm hover:scale-105 transition-all"
              >
                shop now
              </Link>
            </div>
          ) : !hasOrderHistory ? (
            <p className="text-sm text-on-surface-variant font-body py-2">
              no completed orders yet — finish checkout above or{' '}
              <Link to="/shop" className="font-bold text-primary hover:opacity-80">
                keep shopping
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-outline-variant/50 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-on-surface-variant font-body">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs font-bold font-body text-on-surface-variant mt-0.5">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
                      order.status === 'PAID' || order.status === 'SHIPPED' || order.status === 'DELIVERED'
                        ? 'bg-primary/10 text-primary'
                        : order.status === 'REFUNDED' || order.status === 'CANCELLED' || order.status === 'FAILED'
                        ? 'bg-error/10 text-error'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      {order.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm font-body">
                        <span className="text-on-surface-variant">{item.name} × {item.quantity}</span>
                        <span className="text-on-surface font-bold">
                          ${((item.priceAtPurchase * item.quantity) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-1 border-t border-outline-variant/20">
                    <span className="text-xs font-bold font-body text-on-surface-variant">total</span>
                    <span className="text-sm font-black font-headline text-primary">
                      ${(order.total / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/20 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
                        shipping address
                      </p>
                      {order.status === 'PAID' && editingShippingOrderId !== order.id && (
                        <button
                          type="button"
                          onClick={() => setEditingShippingOrderId(order.id)}
                          className="text-xs font-bold text-primary hover:opacity-70 shrink-0"
                        >
                          edit
                        </button>
                      )}
                    </div>

                    {editingShippingOrderId === order.id ? (
                      <div className="border border-outline-variant/40 rounded-xl p-4">
                        <AddressForm
                          initial={orderShippingToInput(order.address)}
                          onSave={(input) => handleSaveOrderShipping(order.id, input)}
                          onCancel={() => setEditingShippingOrderId(null)}
                          submitLabel="save shipping address"
                        />
                      </div>
                    ) : (
                      <div className="text-sm font-body text-on-surface leading-relaxed space-y-0.5">
                        <p>{order.address.line1}</p>
                        {order.address.line2 ? <p>{order.address.line2}</p> : null}
                        <p>
                          {order.address.city}, {order.address.state} {order.address.postal_code}
                        </p>
                        <p>{order.address.country}</p>
                        {order.status !== 'PAID' && (
                          <p className="text-xs text-on-surface-variant pt-2">
                            shipping address can only be changed while the order is paid and not yet shipped.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — spans 5 cols */}
        <div className="lg:col-span-5 space-y-6">

          {/* Addresses */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label">addresses</h2>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-70 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  add new
                </button>
              )}
            </div>

            <div className="space-y-4">
              {addresses.map((addr) =>
                editingId === addr.id ? (
                  <div key={addr.id} className="border border-outline-variant/50 rounded-xl p-4">
                    <AddressForm
                      initial={addr}
                      onSave={(input) => handleUpdateAddress(addr.id, input)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={addr.id}
                    className="border border-outline-variant/50 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-body text-on-surface leading-relaxed">
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                        <p>{addr.country}</p>
                      </div>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-primary/10 text-primary rounded-full shrink-0">
                          default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all"
                        >
                          set default
                        </button>
                      )}
                      <button
                        onClick={() => setEditingId(addr.id)}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        disabled={deletingId === addr.id}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-primary-container text-on-primary-container hover:opacity-80 transition-all disabled:opacity-40"
                      >
                        {deletingId === addr.id ? 'deleting…' : 'delete'}
                      </button>
                    </div>
                  </div>
                ),
              )}

              {addresses.length === 0 && !showAddForm && (
                <p className="text-sm text-on-surface-variant font-body">no addresses saved yet.</p>
              )}

              {showAddForm && (
                <div className="border border-outline-variant/50 rounded-xl p-4">
                  <AddressForm
                    onSave={handleCreateAddress}
                    onCancel={() => setShowAddForm(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Manage */}
          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary font-label mb-6">manage</h2>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">subscriptions</p>
              <label className="flex items-center justify-between py-4 border-b border-outline-variant/20 cursor-pointer group">
                <span className="text-sm font-body text-on-surface">email updates and early access</span>
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => handleNewsletterToggle(e.target.checked)}
                    disabled={newsletterSaving}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-outline-variant/50 rounded-full peer-checked:bg-primary transition-colors peer-disabled:opacity-50" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
