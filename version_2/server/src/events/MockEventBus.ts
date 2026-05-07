import { EventBus, EventType, EventPayloads } from './EventBus.js'

export interface PublishedEvent<T extends EventType = EventType> {
  type: T
  payload: EventPayloads[T]
}

export class MockEventBus implements EventBus {
  readonly published: PublishedEvent[] = []

  async publish<T extends EventType>(type: T, payload: EventPayloads[T]): Promise<void> {
    this.published.push({ type, payload } as PublishedEvent)
  }

  // Convenience: find all events of a specific type
  eventsOf<T extends EventType>(type: T): EventPayloads[T][] {
    return this.published
      .filter((e) => e.type === type)
      .map((e) => e.payload as EventPayloads[T])
  }

  clear(): void {
    this.published.length = 0
  }
}
