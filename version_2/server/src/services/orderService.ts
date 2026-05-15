import { prisma } from '../db/client.js'
import type { AddressInput } from './addressService.js'

export interface OrderItemInput {
  productId: string
  name: string
  priceAtPurchase: number // cents
  quantity: number
  imageUrl?: string
}

export interface CreateOrderInput {
  userId: string
  addressId: string
  stripeSessionId: string
  total: number // cents
  items: OrderItemInput[]
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput) {
  return prisma.order.create({
    data: {
      userId: input.userId,
      addressId: input.addressId,
      stripeSessionId: input.stripeSessionId,
      total: input.total,
      status: 'PENDING',
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          priceAtPurchase: item.priceAtPurchase,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
        })),
      },
    },
    include: { items: true },
  })
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true, address: true },
    orderBy: { createdAt: 'desc' },
  })
}

/** Order history on the account page — excludes pending and cancelled orders. */
export async function getPaidOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'REFUNDED'] } },
    include: { items: true, address: true },
    orderBy: { createdAt: 'desc' },
  })
}

/** Recent unpaid checkouts the user may resume (within `resumeWindowMs`). */
export async function getResumablePendingOrdersByUser(userId: string, resumeWindowMs = 60 * 60 * 1000) {
  const since = new Date(Date.now() - resumeWindowMs)
  return prisma.order.findMany({
    where: {
      userId,
      status: 'PENDING',
      createdAt: { gte: since },
    },
    include: { items: true, address: true },
    orderBy: { createdAt: 'desc' },
  })
}

/** User dismissed “resume checkout” — cancel only if still pending and owned by `userId`. */
export async function dismissPendingOrder(orderId: string, userId: string): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, userId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
  return result.count === 1
}

/** Update ship-to address while order is PAID and not yet fulfilled (only status that allows edits). */
export async function updateShippingAddressForPaidOrder(orderId: string, userId: string, input: AddressInput) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: 'PAID' },
    select: { addressId: true },
  })
  if (!order) {
    throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' })
  }

  const owned = await prisma.address.findFirst({
    where: { id: order.addressId, userId },
  })
  if (!owned) {
    throw Object.assign(new Error('Order not found'), { code: 'NOT_FOUND' })
  }

  const line2 = input.line2?.trim() ? input.line2.trim() : null

  return prisma.address.update({
    where: { id: owned.id },
    data: {
      line1: input.line1.trim(),
      line2,
      city: input.city.trim(),
      state: input.state.trim(),
      postal_code: input.postal_code.trim(),
      country: input.country.trim(),
    },
  })
}

export async function getOrderById(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, address: true },
  })
}

export async function getOrderByIdForStripeEvent(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true, user: { select: { email: true } } },
  })
}

export async function getOrderByStripeSessionId(stripeSessionId: string) {
  return prisma.order.findUnique({
    where: { stripeSessionId },
    include: { items: true, address: true, user: { select: { email: true } } },
  })
}

export async function getRecentPendingOrdersByUser(userId: string, take = 10) {
  return prisma.order.findMany({
    where: { userId, status: 'PENDING' },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take,
  })
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'REFUNDED') {
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
  })
}

/**
 * Hosted Checkout succeeded (Stripe says paid). Atomically PENDING → PAID only once.
 * Used by verified Stripe webhooks, thank-you polling (`order-by-session`), and the pending-order sweeper.
 */
export async function tryMarkOrderPaidAfterCheckout(orderId: string): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID' },
  })
  return result.count === 1
}

/** Replace placeholder session id with the real Stripe Checkout Session id (`cs_...`) after sessions.create succeeds. */
export async function updateOrderStripeSessionId(orderId: string, stripeSessionId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { stripeSessionId },
  })
}

export async function shipOrder(orderId: string, trackingNumber: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      trackingNumber,
      shippedAt: new Date(),
    },
  })
}

export async function markDelivered(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  })
}
