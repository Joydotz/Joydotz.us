import { prisma } from '../db/client.js'

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
 * Used by webhooks and by GET /api/checkout/order-by-session so local dev works without stripe listen.
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
