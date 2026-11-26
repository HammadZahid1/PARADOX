import { describe, expect, it } from 'vitest';
import type { SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import { SeededRandom } from '@/engine/random/rng';
import { scheduleEvents } from './scheduler';

const definitions: VariableDefinition[] = [];
const state: WorldState = {
  id: 's', step: 2, time: 2, seed: 1, version: 1,
  variables: {}, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};
const event = (id: string, atStep: number): SimulationEvent => ({
  id, name: id, type: 'scheduled', trigger: { kind: 'scheduled', atStep }, probability: 1,
  conditions: [], effects: [], dependencies: [], priority: 1, severity: 'info', enabled: true,
});

describe('event scheduling', () => {
  it('queues events that are due', () => {
    const result = scheduleEvents([event('a', 2), event('b', 3)], state, definitions, new SeededRandom(1), 2, 'deterministic');
    expect(result.queued.map((item) => item.event.id)).toEqual(['a']);
    expect(result.evaluations).toHaveLength(2);
  });

  it('honours cooldown windows', () => {
    const withHistory = { ...state, eventHistory: [{ id: 'r', eventId: 'a', eventName: 'a', step: 1, time: 1, severity: 'info', source: 'test', affectedVariables: [] }] };
    const cooling = { ...event('a', 2), cooldownSteps: 5 };
    expect(scheduleEvents([cooling], withHistory, definitions, new SeededRandom(1), 2, 'deterministic').evaluations[0]?.reason).toBe('cooldown');
  });

  it('uses seeded randomness for probabilistic triggers', () => {
    const randomEvent = { ...event('r', 2), probability: 0.5 };
    const first = scheduleEvents([randomEvent], state, definitions, new SeededRandom(10), 2, 'probabilistic');
    const second = scheduleEvents([randomEvent], state, definitions, new SeededRandom(10), 2, 'probabilistic');
    expect(first.queued.length).toBe(second.queued.length);
  });
});
