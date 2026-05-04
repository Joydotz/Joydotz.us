export interface Product {
  id: string
  name: string
  price: number
  displayPrice: string
  description: string
  imageUrl: string
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  return data.products as Product[]
}

export async function subscribeEmail(email: string): Promise<void> {
  const res = await fetch('/api/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'newsletter' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Subscription failed')
  }
}
