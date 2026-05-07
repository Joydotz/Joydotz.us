import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import { EventType, EventPayloads } from './EventBus.js'
import { handleOrderPaid, handleOrderRefunded } from './handlers.js'

const TOPIC = 'order-events'
const GROUP_ID = 'joydotz-worker'
const MAX_RETRIES = 5

type HandlerMap = {
  [T in EventType]: (payload: EventPayloads[T]) => Promise<void>
}

const handlers: HandlerMap = {
  ORDER_PAID: handleOrderPaid,
  ORDER_REFUNDED: handleOrderRefunded,
}

export class KafkaWorker {
  private consumer: Consumer

  constructor(kafka: Kafka) {
    this.consumer = kafka.consumer({ groupId: GROUP_ID })
  }

  async start(): Promise<void> {
    await this.consumer.connect()
    await this.consumer.subscribe({ topic: TOPIC, fromBeginning: false })

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const raw = payload.message.value?.toString()
        if (!raw) return

        let type: EventType
        let eventPayload: EventPayloads[EventType]

        try {
          const parsed = JSON.parse(raw)
          type = parsed.type
          eventPayload = parsed.payload
        } catch {
          console.error('[worker] Failed to parse message:', raw)
          return // malformed message — skip, don't retry
        }

        const handler = handlers[type]
        if (!handler) {
          console.error('[worker] No handler for event type:', type)
          return
        }

        let attempt = 0
        while (attempt < MAX_RETRIES) {
          try {
            await (handler as (p: typeof eventPayload) => Promise<void>)(eventPayload)
            return // success
          } catch (err) {
            attempt++
            console.error(`[worker] Handler failed (attempt ${attempt}/${MAX_RETRIES}):`, err)
            if (attempt < MAX_RETRIES) {
              await sleep(exponentialBackoff(attempt))
            }
          }
        }

        // Exhausted retries — dead-letter: log for manual intervention
        console.error('[worker] Dead-lettered event after max retries:', { type, payload: eventPayload })
      },
    })
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function exponentialBackoff(attempt: number): number {
  // 1s, 2s, 4s, 8s, 16s
  return Math.min(1000 * Math.pow(2, attempt - 1), 30_000)
}
