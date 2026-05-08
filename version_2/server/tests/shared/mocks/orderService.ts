import { vi } from 'vitest'

export function buildOrderServiceMock() {
  return {
    createOrder: vi.fn(),
    getRecentPendingOrdersByUser: vi.fn(),
    getOrdersByUser: vi.fn(),
    getOrderById: vi.fn(),
    getOrderByIdForStripeEvent: vi.fn(),
    getOrderByStripeSessionId: vi.fn(),
    updateOrderStatus: vi.fn(),
    updateOrderStripeSessionId: vi.fn(),
    shipOrder: vi.fn(),
    markDelivered: vi.fn(),
  }
}
