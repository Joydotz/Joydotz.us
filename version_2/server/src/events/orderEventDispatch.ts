import type { EventBus, EventPayloads } from './EventBus.js'
import { handleOrderPaid, handleOrderRefunded } from './handlers.js'

function scheduleOrderPaidSideEffects(payload: EventPayloads['ORDER_PAID']): void {
  void handleOrderPaid(payload).catch((err) => {
    console.error('[ORDER_PAID] side effects failed:', err)
  })
}

function scheduleOrderRefundedSideEffects(payload: EventPayloads['ORDER_REFUNDED']): void {
  void handleOrderRefunded(payload).catch((err) => {
    console.error('[ORDER_REFUNDED] side effects failed:', err)
  })
}

/** Publish then run in-process side effects (e.g. email). If Kafka consumes these events exclusively later, avoid double-handling. */
export async function publishOrderPaid(
  bus: EventBus,
  payload: EventPayloads['ORDER_PAID'],
): Promise<void> {
  await bus.publish('ORDER_PAID', payload)
  scheduleOrderPaidSideEffects(payload)
}

export async function publishOrderRefunded(
  bus: EventBus,
  payload: EventPayloads['ORDER_REFUNDED'],
): Promise<void> {
  await bus.publish('ORDER_REFUNDED', payload)
  scheduleOrderRefundedSideEffects(payload)
}
