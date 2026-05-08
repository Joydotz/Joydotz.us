import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface CartItem {
  productId: string
  quantity: number
  name: string
  price: number        // in cents
  displayPrice: string
  imageUrl: string
}

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number   // in cents
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'joydotz_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(product: Omit<CartItem, 'quantity'>) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) { removeItem(productId); return }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    )
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
