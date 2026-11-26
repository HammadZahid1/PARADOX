import { describe, expect, it } from 'vitest';
import type { SimulationEvent, VariableDefinition, WorldState } from '@/engine/types';
import { SeededRandom } from '@/engine/random/rng';
import { EventEngine } from './engine';

const definitions: VariableDefinition[] = [{ id: 'v1', key: 'resources', name: 'Resources', type: 'number', initial: 100 }];
const state: WorldState = {
  id: 's', step: 2, time: 2, seed: 1, version: 1,
  variables: { v1: 100 }, parameters: {}, activeEvents: [], eventHistory: [], metrics: {}, changes: [],
};
const event: SimulationEvent = {
  id: 'e1', name: 'Shortage', type: 'scheduled', trigger: { kind: 'scheduled', atStep: 2 }, probability: 1,
  conditions: [], effects: [{ kind: 'decrease', variableKey: 'resources', amount: 15 }],
  dependencies: [], priority: 1, severity: 'warning', enabled: true,
};

describe('event engine', () => {
  const engine = new EventEngine();

  it('processes scheduled events and records history', () => {
    const result = engine.processStep(state, [event], definitions, new SeededRandom(1), 2, 'deterministic');
    expect(result.state.variables.v1).toBe(85);
    expect(result.fired).toHaveLength(1);
    expect(result.state.eventHistory).toHaveLength(1);
    expect(result.state.metrics.totalEvents).toBe(1);
  });

  it('does not fire events scheduled for another step', () => {
    const result = engine.processStep(state, [{ ...event, trigger: { kind: 'scheduled', atStep: 3 } }], definitions, new SeededRandom(1), 2, 'deterministic');
    expect(result.fired).toHaveLength(0);
    expect(result.state.variables.v1).toBe(100);
  });

  it('injects manual events immediately', () => {
    const manual = { ...event, trigger: { kind: 'manual' as const } };
    expect(engine.inject(manual, state, definitions, new SeededRandom(1)).state.variables.v1).toBe(85);
  });

  it('honours probabilistic injection with a seeded stream', () => {
    const unlikely = { ...event, probability: 0 };
    expect(engine.inject(unlikely, state, definitions, new SeededRandom(1), 'probabilistic').fired).toHaveLength(0);
  });
});
