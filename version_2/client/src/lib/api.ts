// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  price: number
  displayPrice: string
  description: string
  imageUrl: string
}

export interface User {
  id: string
  email: string
  newsletterOptIn: boolean
  createdAt: string
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  priceAtPurchase: number  // in cents
}

export interface Order {
  id: string
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
  total: number            // in cents
  createdAt: string
  address: Address
  items: OrderItem[]
}

export interface Address {
  id: string
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  isDefault: boolean
}

export type AddressInput = Omit<Address, 'id' | 'isDefault'>

// ── Helpers ───────────────────────────────────────────────────────────────────

let csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  const data = await request<{ token: string }>('/api/csrf-token')
  csrfToken = data.token
  return csrfToken
}

const STATE_CHANGING_METHODS = new Set(['POST', 'DELETE', 'PATCH', 'PUT'])

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method ?? 'GET').toUpperCase()
  const needsCsrf = STATE_CHANGING_METHODS.has(method)

  // Fetch CSRF token lazily — skip for the token endpoint itself to avoid infinite recursion
  const token = needsCsrf && url !== '/api/csrf-token' ? await getCsrfToken() : null

  const res = await fetch(url, {
    ...options,
    credentials: 'include', // always send cookies
    headers: {
      ...(options?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-csrf-token': token } : {}),
      ...options?.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Request failed'), { status: res.status })
  return data as T
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<{ products: Product[] }>('/api/products')
  return data.products
}

// ── Email subscription ────────────────────────────────────────────────────────

export async function subscribeEmail(email: string): Promise<void> {
  await request('/api/emails', {
    method: 'POST',
    body: JSON.stringify({ email, source: 'newsletter' }),
  })
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signup(
  email: string,
  password: string,
  newsletterOptIn: boolean,
): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, newsletterOptIn }),
  })
  return data.user
}

export async function login(email: string, password: string): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data.user
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>('/api/auth/me')
    return data.user
  } catch {
    return null
  }
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function updateNewsletter(newsletterOptIn: boolean): Promise<void> {
  await request('/api/account/news', {
    method: 'POST',
    body: JSON.stringify({ newsletterOptIn }),
  })
}

export async function fetchAddresses(): Promise<Address[]> {
  const data = await request<{ addresses: Address[] }>('/api/account/addresses')
  return data.addresses
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const data = await request<{ address: Address }>('/api/account/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.address
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const data = await request<{ address: Address }>(`/api/account/addresses/${id}`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.address
}

export async function deleteAddress(id: string): Promise<void> {
  await request(`/api/account/addresses/${id}`, { method: 'DELETE' })
}

export async function setDefaultAddress(id: string): Promise<void> {
  await request(`/api/account/addresses/${id}/default`, { method: 'POST' })
}

export async function fetchOrders(): Promise<Order[]> {
  const data = await request<{ orders: Order[] }>('/api/account/orders')
  return data.orders
}

export async function fetchOrder(id: string): Promise<Order> {
  const data = await request<{ order: Order }>(`/api/account/orders/${id}`)
  return data.order
}

export async function createCheckoutSession(
  addressId: string,
  items: { productId: string; quantity: number }[],
): Promise<{ url: string; orderId: string }> {
  return request<{ url: string; orderId: string }>('/api/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ addressId, items }),
  })
}
