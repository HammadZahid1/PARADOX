import { describe, expect, it } from 'vitest';
import type { SimulationEvent } from '@/engine/types';
import { EventQueue } from './queue';

const event = (id: string, priority = 1): SimulationEvent => ({
  id, name: id, type: 'scheduled', trigger: { kind: 'manual' }, probability: 1,
  conditions: [], effects: [], dependencies: [], priority, severity: 'info', enabled: true,
});

describe('event queue', () => {
  it('orders events by scheduled step then priority', () => {
    const queue = new EventQueue();
    queue.enqueue(event('low', 1), 2, 2, 'test', 'test');
    queue.enqueue(event('high', 9), 2, 2, 'test', 'test');
    queue.enqueue(event('early'), 1, 1, 'test', 'test');
    expect(queue.list().map((item) => item.event.id)).toEqual(['early', 'high', 'low']);
  });

  it('drains only due events', () => {
    const queue = new EventQueue();
    queue.enqueue(event('a'), 1, 1, 'test', 'test');
    queue.enqueue(event('b'), 5, 5, 'test', 'test');
    expect(queue.due(2)).toHaveLength(1);
    expect(queue.drain(2).map((item) => item.event.id)).toEqual(['a']);
    expect(queue.size).toBe(1);
  });

  it('cancels, inspects and clears queued events', () => {
    const queue = new EventQueue();
    queue.enqueue(event('a'), 1, 1, 'test', 'test');
    expect(queue.has('a')).toBe(true);
    expect(queue.peek()?.event.id).toBe('a');
    expect(queue.cancel('a')).toBe(true);
    expect(queue.cancel('a')).toBe(false);
    queue.enqueue(event('b'), 1, 1, 'test', 'test');
    queue.clear();
    expect(queue.size).toBe(0);
  });
});
