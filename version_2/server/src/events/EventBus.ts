export interface EventPayloads {
  ORDER_PAID: {
    orderId: string
    userId: string
    email: string
    total: number // cents
  }
  ORDER_REFUNDED: {
    orderId: string
    userId: string
    email: string
    total: number // cents
  }
}

export type EventType = keyof EventPayloads

export interface EventBus {
  publish<T extends EventType>(type: T, payload: EventPayloads[T]): Promise<void>
}
