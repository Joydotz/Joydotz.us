// ── Types ─────────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  price: number
  displayPrice: string
  description: string
  imageUrl: string
}

/** Merchandising fields only — from GET /api/catalog (no Stripe call). */
export interface CatalogListingProduct {
  id: string
  name: string
  description: string
  imageUrl: string
}

export interface User {
  id: string
  email: string
  emailVerified: boolean
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

/** Fetch CSRF token early so POSTs work after cold loads (e.g. return from Stripe Checkout). */
export async function preloadCsrf(): Promise<void> {
  try {
    await getCsrfToken()
  } catch {
    /* ignore — next POST will retry getCsrfToken */
  }
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
  if (!res.ok) {
    const code =
      typeof (data as { code?: unknown }).code === 'string'
        ? (data as { code: string }).code
        : undefined
    throw Object.assign(new Error((data as { error?: string }).error ?? 'Request failed'), {
      status: res.status,
      code,
      stripeReadiness: (data as { stripeReadiness?: unknown }).stripeReadiness,
    })
  }
  return data as T
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const data = await request<{ products: Product[] }>('/api/products')
  return data.products
}

export async function fetchCatalog(): Promise<CatalogListingProduct[]> {
  const data = await request<{ products: CatalogListingProduct[] }>('/api/catalog')
  return data.products
}

// ── Email subscription ────────────────────────────────────────────────────────

export async function subscribeEmail(email: string): Promise<void> {
  await request('/api/emails', {
    method: 'POST',
    body: JSON.stringify({ email, source: 'newsletter' }),
  })
}

// ── Auth (Better Auth) ───────────────────────────────────────────────────────

import { authClient } from './auth-client'

function verificationCallbackUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/verify-email?success=1`
}

function passwordResetRedirectUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/reset-password`
}

export type SignupResult =
  | { status: 'verify_email'; email: string }
  | { status: 'signed_in'; user: User }

export async function signup(
  email: string,
  password: string,
  newsletterOptIn: boolean,
): Promise<SignupResult> {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name: email.split('@')[0] ?? email,
    newsletterOptIn,
    callbackURL: verificationCallbackUrl(),
  })
  if (error) {
    throw Object.assign(new Error(error.message ?? 'Sign up failed'), { status: 400 })
  }
  if (!data?.user) throw new Error('Sign up failed')
  if (!data.token) {
    return { status: 'verify_email', email: data.user.email }
  }
  return { status: 'signed_in', user: mapAuthUser(data.user) }
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
    callbackURL: verificationCallbackUrl(),
  })
  if (error) {
    const code = 'code' in error ? String(error.code) : ''
    if (code === 'EMAIL_NOT_VERIFIED') {
      throw Object.assign(new Error('Please verify your email before signing in.'), {
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
      })
    }
    throw Object.assign(new Error(error.message ?? 'Invalid email or password'), { status: 401 })
  }
  if (!data?.user) throw new Error('Invalid email or password')
  return mapAuthUser(data.user)
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await authClient.sendVerificationEmail({
    email,
    callbackURL: verificationCallbackUrl(),
  })
  if (error) {
    throw new Error(error.message ?? 'Could not send verification email')
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: passwordResetRedirectUrl(),
  })
  if (error) {
    throw new Error(error.message ?? 'Could not send reset email')
  }
}

export async function resetPassword(newPassword: string, token: string): Promise<void> {
  const { error } = await authClient.resetPassword({
    newPassword,
    token,
  })
  if (error) {
    const code = 'code' in error ? String(error.code) : ''
    if (code === 'INVALID_TOKEN') {
      throw Object.assign(new Error('This reset link is invalid or has expired.'), {
        code: 'INVALID_TOKEN',
      })
    }
    throw new Error(error.message ?? 'Could not reset password')
  }
}

export async function logout(): Promise<void> {
  await authClient.signOut()
}

function mapAuthUser(u: {
  id: string
  email: string
  createdAt: Date
  emailVerified?: boolean
  newsletterOptIn?: boolean
}): User {
  return {
    id: u.id,
    email: u.email,
    emailVerified: Boolean(u.emailVerified),
    newsletterOptIn: Boolean(u.newsletterOptIn),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  }
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

/** Unpaid checkout drafts from the last hour — shown as “resume” on the account page. */
export async function fetchIncompleteOrders(): Promise<Order[]> {
  const data = await request<{ orders: Order[] }>('/api/account/orders/incomplete')
  return data.orders
}

export async function resumeIncompleteCheckout(orderId: string): Promise<{ url: string }> {
  return request<{ url: string }>(`/api/account/orders/${orderId}/resume-checkout`, {
    method: 'POST',
  })
}

export async function dismissIncompleteOrder(orderId: string): Promise<void> {
  await request(`/api/account/orders/${orderId}/dismiss-incomplete`, {
    method: 'POST',
  })
}

/** Update ship-to address on a PAID order before it ships. Other statuses are not editable via API. */
export async function updateOrderShippingAddress(orderId: string, input: AddressInput): Promise<Address> {
  const data = await request<{ address: Address }>(`/api/account/orders/${orderId}/shipping-address`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.address
}

export async function fetchOrder(id: string): Promise<Order> {
  const data = await request<{ order: Order }>(`/api/account/orders/${id}`)
  return data.order
}

/** Poll after Stripe redirect — 202 means PAID not visible yet; server retries reconcile + webhook on each poll. */
export type CheckoutSessionOrderPoll =
  | { status: 'ready'; order: Order }
  | { status: 'awaitingWebhook'; message?: string }

export async function fetchOrderByCheckoutSession(sessionId: string): Promise<CheckoutSessionOrderPoll> {
  const q = new URLSearchParams({ session_id: sessionId })
  const res = await fetch(`/api/checkout/order-by-session?${q}`, { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (res.status === 202) {
    return {
      status: 'awaitingWebhook',
      message: typeof data.message === 'string' ? data.message : undefined,
    }
  }
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? 'Request failed'), { status: res.status })
  return { status: 'ready', order: (data as { order: Order }).order }
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
