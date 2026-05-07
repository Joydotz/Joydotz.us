import { Kafka, Producer } from 'kafkajs'
import { EventBus, EventType, EventPayloads } from './EventBus.js'

const TOPIC = 'order-events'

export class KafkaEventBus implements EventBus {
  private producer: Producer

  constructor(kafka: Kafka) {
    this.producer = kafka.producer()
  }

  async connect(): Promise<void> {
    await this.producer.connect()
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect()
  }

  async publish<T extends EventType>(type: T, payload: EventPayloads[T]): Promise<void> {
    await this.producer.send({
      topic: TOPIC,
      messages: [
        {
          key: type,
          value: JSON.stringify({ type, payload }),
        },
      ],
    })
  }
}
