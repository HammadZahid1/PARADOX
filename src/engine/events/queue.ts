import type { EntityId, QueuedEvent, SimulationEvent } from '@/engine/types';

/** Priority-aware event queue. Lower scheduled steps and higher event priorities run first. */
export class EventQueue {
  private items: QueuedEvent[] = [];

  enqueue(event: SimulationEvent, scheduledStep: number, scheduledTime: number, reason: string, source: string): void {
    this.items.push({ id: `${event.id}:${scheduledStep}:${this.items.length}`, event, scheduledStep, scheduledTime, reason, source });
    this.sort();
  }

  private sort(): void {
    this.items.sort((a, b) => a.scheduledStep - b.scheduledStep
      || b.event.priority - a.event.priority
      || a.event.id.localeCompare(b.event.id));
  }

  due(step: number): QueuedEvent[] {
    return this.items.filter((item) => item.scheduledStep <= step);
  }

  drain(step: number): QueuedEvent[] {
    const ready = this.due(step);
    const ids = new Set(ready.map((item) => item.id));
    this.items = this.items.filter((item) => !ids.has(item.id));
    return ready;
  }

  cancel(eventId: EntityId): boolean {
    const length = this.items.length;
    this.items = this.items.filter((item) => item.event.id !== eventId);
    return this.items.length < length;
  }

  has(eventId: EntityId): boolean {
    return this.items.some((item) => item.event.id === eventId);
  }

  peek(): QueuedEvent | undefined {
    return this.items[0];
  }

  get size(): number {
    return this.items.length;
  }

  list(): readonly QueuedEvent[] {
    return this.items;
  }

  clear(): void {
    this.items = [];
  }
}
